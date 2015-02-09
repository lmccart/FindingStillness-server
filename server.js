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
  var total_time = 90*1000;
  var running = false;
  var end_timer, pic_timer;

  app.get('/send_heartrate', function (req, res) {
    takePic();
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

  function takePic() {
    var path = '/Users/lmccart/Documents/stillness/FS_server/pics/';
    imagesnapjs.capture(path+new Date().getTime()+'.jpg', function(err) {
      console.log(err ? err : 'Success!');
    });
  }

})