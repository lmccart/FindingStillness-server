var express = require('express');
var app = express();
var imagesnapjs = require('./imagesnap');

// app.get('/', function (req, res) {
//   res.send('Hello World!')
// })

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
  }

  function reset() {
    clearTimeout(end_timer);
    clearTimeout(pic_timer);
    start_time = 0;
    running = false;
  }

  var path = '/Users/lmccart/Documents/stillness/FS_server/public/';
  function takePic() {
    var img_path = 'pics/'+new Date().getTime()+'.jpg';
    imagesnapjs.capture(path+img_path, function(err) {
      console.log(err ? err : 'Success!');
      pic_path = img_path;
    });
  }

})