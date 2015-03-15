var fs = require('fs');
var http = require('http');
var request = require('request');
var domain = require('domain');

var express = require('express');
var osc = require('node-osc');

var Twit = require('twit');
var Dropbox = require("dropbox");

var imagesnapjs = require('./imagesnap');

var config = require('./config');

var path = '/usr/local/var/www/';
var recent_pics = ['pics/2015-03-03T02%3a12%3a39.177Z.jpg', 'pics/2015-03-15T20%3a26%3a00.509Z.jpg', 'pics/2015-03-15T07%3a26%3a22.392Z.jpg', 'pics/2015-03-15T07%3a22%3a10.424Z.jpg', 'pics/2015-03-15T07%3a15%3a28.471Z.jpg'];


//// OSC
var oscClient = new osc.Client('127.0.0.1', 3333);



//// TWITTER
var twit = new Twit({
  consumer_key: config.twitter_consumer_key,
  consumer_secret: config.twitter_consumer_secret,
  access_token: config.twitter_access_token,
  access_token_secret: config.twitter_access_token_secret
});


//// DROPBOX
var client = new Dropbox.Client({
  key: config.dropbox_key,
  token: config.dropbox_token
});
client.authDriver(new Dropbox.AuthDriver.NodeServer(8191));
client.authenticate(function(err, client) { 
  if (err) console.log(err);
  else console.log('Dropbox authenticated');
});


// uncaught error handling
var d = domain.create();
d.on('error', function(err) {
  console.error('DOMAIN ERROR caught and handled: '+err);
});


var app = express();


app.use(express.static(__dirname + '/public'));

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

var server = app.listen(config.PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

  var hr = 0;
  var start_time = 0;
  var total_time = 90*1000;
  var running = false;
  var end_timer, pic_timer;
  var pic_t = 75*1000; // 75s
  var off_interval = 30*1000;

  var last_blinker_ping = -1;
  var last_heartsensor_ping = -1;

  reset();

  app.get('/start', function (req, res) {
    if (!running) {
      start();
      res.send({status:'success'});
    } else {
      res.send({status:'still running'});
    }
  });

  app.get('/reset', function(req, res) {
    reset();
    res.send({status:'success'});
  });

  app.get('/idle', function(req, res) {
    oscClient.send('/idle');
    res.send({status:'success'});
  });

  app.get('/send_heartrate', function (req, res) {
    last_heartsensor_ping = new Date().getTime();
    hr = parseFloat(req.query.hr);
    oscClient.send('/heartrate', hr);
    res.send({status:'success'});
  });

  app.get('/get_update', function (req, res) {
    var isArduino = parseInt(req.query.arduino);
    if (isArduino) last_blinker_ping = new Date().getTime();
    var time_remaining = running ? Math.max(total_time - (last_blinker_ping - start_time), 0) : -1;
    res.send({hr: hr, remaining: time_remaining});
  });

  app.get('/get_arduino_update', function(req, res) {
    var d = new Date().getTime();
    var blinker_time = last_blinker_ping == -1 ? -1 : d - last_blinker_ping;
    var heartsensor_time = last_heartsensor_ping == -1 ? -1 : d - last_heartsensor_ping;
    res.send({blinker: blinker_time, heartsensor: heartsensor_time});
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

  app.get('/take_pic', function(req, res) {
    takePic();
    res.send({});
  })


  function start() {
    d.run(function() {
      start_time = new Date().getTime();
      running = true;
      end_timer = setTimeout(function() {
        reset();
      }, total_time+off_interval); //off at end to prevent contact retouch
      pic_timer = setTimeout(function() {
        takePic();
      }, pic_t);
      hr = 60;
      oscClient.send('/heartrate', hr);
      oscClient.send('/start');
      console.log('Starting at '+start_time);
    });
  }

  function reset() {
    clearTimeout(end_timer);
    clearTimeout(pic_timer);
    start_time = 0;
    running = false;
    oscClient.send('/reset');
  }

  function takePic() {
    d.run(function() {
      var img_path = 'pics/'+new Date().toISOString()+'.jpg';
      imagesnapjs.capture(path+img_path, function(err) {
        console.log(err ? err : 'Success!');
        if (recent_pics.length == 4) recent_pics.shift();
        recent_pics.push(img_path);
        dropboxPic(img_path);
      });
    });
  }

  function dropboxPic(p, cb) {
    d.run(function() {
      fs.readFile(path+p, function(err, data) {
        if (err) {
          console.log(err);
          return;
        }
        client.writeFile(p.substring(5), data, function(err, stat) {
          console.log(p.substring(5));
          if (err) console.log(err);
        });
      });
    });
  }

  function tweetPic(p, u) {
    d.run(function() {
      if (u[0] !== '@') {
        u = '@'+u;
      }
      var tweet = ' #StillnessInMotion at #TED2015';
      fs.readFile(path+p, 'base64', function(err, data) {
        twit.post('media/upload', { media: data }, function (err, data, response) {
          var mediaIdStr = data.media_id_string
          var params = { status: u+tweet, media_ids: [mediaIdStr] }
          twit.post('statuses/update', params, function (err, data, response) {
            if (err) console.log(err);
          })
        });
      });
    });
  }

  function mailPic(p, e) {
    d.run(function() {
      var url = 'http://deltastillnessinmotion.com/share/send_mail.php?to='+e+'&photo='+p.substring(5);
      console.log(url);
      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body);
        }
      });
    });
  }
});