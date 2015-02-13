var fs = require('fs');
var osc = require('node-osc');
var nodemailer = require('nodemailer');
var Twit = require('twit');
var express = require('express');
var config = require('./config');
var imagesnapjs = require('./imagesnap');



var path = '/Users/lmccart/Documents/stillness/FS_server/public/';

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
  auth: { user: config.gmail.username, pass: config.gmail.password }
});


//// TWITTER
var twit = new Twit({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token: config.twitter.access_token,
  access_token_secret: config.twitter.access_token_secret
});

var app = express();


app.use(express.static(__dirname + '/public'));


var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

  var hr = 0;
  var start_time = 0;
  var total_time = 10*1000;
  var running = false;
  var end_timer, pic_timer;
  var pic_path;

  app.get('/send_heartrate', function (req, res) {
    hr = parseFloat(req.query.hr);
    oscClient.send('/heartrate', hr);
    if (!running) {
      start();
    }
    res.send('success');
  });

  app.get('/get_update', function (req, res) {
    var time_remaining = Math.floor(total_time - (new Date().getTime() - start_time), 0);
    res.send({hr: hr, time_remaining: time_remaining});
  });

  app.get('/get_pic_path', function (req, res) {
    res.send({path: pic_path});
  });

  app.get('/tweet_pic', function (req, res) {
    var p = req.query.path;
    var u = req.query.username;
    tweetPic(p, u);
    res.send({}); //pend
  });

  app.get('/mail_pic', function (req, res) {
    var p = req.query.path;
    var e = req.query.email;
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
    var img_path = 'pics/'+new Date().getTime()+'.jpg';
    imagesnapjs.capture(path+img_path, function(err) {
      console.log(err ? err : 'Success!');
      pic_path = img_path;
    });
  }

  function tweetPic(p, u) {
    var tweet = 'hello world';
    var f = fs.readFileSync(path+p,'base64');
    twit.post('media/upload', { media: f }, function (err, data, response) {
      var mediaIdStr = data.media_id_string
      var params = { status: 'hello world', media_ids: [mediaIdStr] }
      twit.post('statuses/update', params, function (err, data, response) {
        if (err) console.log(err);
      })
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