var fs = require('fs');
var express = require('express');
var osc = require('node-osc');

var nodemailer = require('nodemailer');
var Twit = require('twit');
var Dropbox = require("dropbox");

var imagesnapjs = require('./imagesnap');



var path = '/Users/lmccart/Documents/stillness/FS_server/public/';
var recent_pics = ['pics/1423519974743.jpg', 'pics/1423522147207.jpg', 'pics/1423534927027.jpg', 'pics/1423866313364.jpg', 'pics/1423869293186.jpg'];

//// OSC
var oscServer = new osc.Server(3333, '0.0.0.0');
oscServer.on("message", function (msg, rinfo) {
  console.log("TUIO message:");
  console.log(msg);
});

var oscClient = new osc.Client('127.0.0.1', 3333);
oscClient.send('/oscAddress', 200);

//// MAILER
// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: { user: process.env.gmail_username, pass: process.env.gmail_password }
});


//// TWITTER
var twit = new Twit({
  consumer_key: process.env.twitter_consumer_key,
  consumer_secret: process.env.twitter_consumer_secret,
  access_token: process.env.twitter_access_token,
  access_token_secret: process.env.twitter_access_token_secret
});


//// DROPBOX
var client = new Dropbox.Client({
  key: process.env.dropbox_key,
  token: process.env.dropbox_token
});
client.authDriver(new Dropbox.AuthDriver.NodeServer(8191));
client.authenticate(function(err, client) { 
  if (err) console.log(err);
});

var app = express();


app.use(express.static(__dirname + '/public'));


var server = app.listen(process.env.PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

  var hr = 0;
  var start_time = 0;
  var total_time = 10*1000;
  var running = false;
  var end_timer, pic_timer;

  app.get('/send_heartrate', function (req, res) {
    hr = parseFloat(req.query.hr);
    oscClient.send('/heartrate', hr);
    if (!running) {
      start(); //temp
    }
    res.send('success');
  });

  app.get('/get_update', function (req, res) {
    var time_remaining = Math.max(total_time - (new Date().getTime() - start_time), 0);
    res.send({hr: hr, remaining: time_remaining});
  });

  app.get('/get_pics', function (req, res) {
    res.send({pics: recent_pics});
  });

  app.get('/tweet_pic', function (req, res) {
    var p = req.query.path;
    var u = req.query.user;
    tweetPic(p, u);
    res.send({}); //pend
  });

  app.get('/mail_pic', function (req, res) {
    var p = req.query.path;
    var e = req.query.user;
    mailPic(p, e);
    res.send({url: p}); //pend
  });


  function start() {
    start_time = new Date().getTime();
    running = true;
    end_timer = setTimeout(function() {
      reset();
    }, total_time);
    pic_timer = setTimeout(function() {
      takePic();
    }, 3*1000);
    console.log('Starting at '+start_time);
    oscClient.send('/start');
  }

  function reset() {
    clearTimeout(end_timer);
    clearTimeout(pic_timer);
    start_time = 0;
    running = false;
  }

  function takePic() {
    var img_path = 'pics/'+new Date().toISOString()+'.jpg';
    imagesnapjs.capture(path+img_path, function(err) {
      console.log(err ? err : 'Success!');
      if (recent_pics.length == 4) recent_pics.shift();
      recent_pics.push(img_path);
      dropboxPic(img_path);
    });
  }

  function dropboxPic(p) {
    fs.readFile(path+p, function(err, data) {
      if (err) {
        console.log(err);
        return;
      }
      client.writeFile(p.substring(5), data, function(err, stat) {
        if (err) console.log(err);
      });
    });
  }

  function tweetPic(p, u) {
    if (u[0] !== '@') {
      u = '@'+u;
    }
    var tweet = 'hello world';
    fs.readFile(path+p, 'base64', function(err, data) {
      twit.post('media/upload', { media: data }, function (err, data, response) {
        var mediaIdStr = data.media_id_string
        var params = { status: u+' hello world', media_ids: [mediaIdStr] }
        twit.post('statuses/update', params, function (err, data, response) {
          if (err) console.log(err);
        })
      });
    });
  }

  function mailPic(p, e) {
    var mailOptions = {
      from: 'lo <laurmccarthy@gmail.com>',
      to: e,
      subject: 'Hello',
      html: '<b>Hello world</b>',
      attachments:[{ filename: p.substring(5), path: path+p }],
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(err, info){
      if(err) console.log(err);
      else console.log('Message sent: ' + info.response);
    });
  }

})