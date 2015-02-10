var osc = require('node-osc');
var express = require('express');
var imagesnapjs = require('./imagesnap');

var JSFtp = require('jsftp');

var path = '/Users/lmccart/Documents/stillness/FS_server/public/';

var ftp = new JSFtp({
  host: 'ftp.xxx.com',
  user: '',
  pass: ''
});


var oscServer = new osc.Server(3333, '0.0.0.0');
oscServer.on("message", function (msg, rinfo) {
      console.log("TUIO message:");
      console.log(msg);
});


var oscClient = new osc.Client('127.0.0.1', 3333);
oscClient.send('/oscAddress', 200);

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
    res.send({}); //pend
  });

  app.get('/upload_pic', function (req, res) {
    var p = req.query.path;
    ftp.put(path+p, '/home/pplkpr/pplkpr.com'+p, function(hadError) {
      console.log(path+p, '/home/pplkpr/pplkpr.com/'+p);
      if (!hadError)
        console.log("File transferred successfully!");
    });
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

})