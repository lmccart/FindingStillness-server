var express = require('express');
var app = express();
var imagesnapjs = require('imagesnapjs');

// app.get('/', function (req, res) {
//   res.send('Hello World!')
// })

app.use(express.static(__dirname + '/public'));


var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);


  // imagesnapjs.capture('/Users/lmccart/Documents/testimage.jpg', function(err) {
  //   console.log(err ? err : 'Success!');
  // });

})