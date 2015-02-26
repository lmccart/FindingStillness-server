// https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml

var async = require('async');
var atob = require('atob');
var noble = require('noble');
var app;
var peripheralUuid = 'a2315aed2e164a9396799e028fcf97a7';
var peripheral;

exports.hr = 0;
exports.contact = false;
exports.setup = setup;

function setup(a) {
  app = a;

  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      noble.startScanning();
      console.log('scanning started');
    } else {
      noble.stopScanning();
      console.log('scanning stopped');
    }
  });

  noble.on('discover', function(peripheral) {
    if (peripheral.uuid === peripheralUuid) {
      noble.stopScanning();
      peripheralDiscovered(peripheral);
    }
  });
}


function peripheralDiscovered(p) {
  peripheral = p;

  console.log('peripheral with UUID ' + peripheral.uuid + ' discovered');
  peripheral.on('disconnect', function() {
    console.log('peripheral disconnected');
    noble.startScanning();
  });

  peripheral.connect(peripheralConnected);
}

function peripheralConnected(error) {
  if (error) {
    handleError();
  } else {
    console.log('peripheral connected');

    peripheral.discoverServices([], servicesDiscovered);
    peripheral.on('rssiUpdate', function(rssi) {
      console.log(rssi);
    });
  }
}

function servicesDiscovered(error, services) {  
  if (error) {
    handleError();
  } else {
    //console.log(services);
    for (var i=0; i<services.length; i++) {
      if (services[i].uuid == '180d') { // hr
        console.log('hr service discovered');
        services[i].discoverCharacteristics([], charsDiscovered);
      }
    }
  }
}

function charsDiscovered(error, chars) {
  if (error) {
    handleError();
  } else {
    //console.log(chars);
    for (var i=0; i<chars.length; i++) {
      if (chars[i].uuid === '2a37') {
        chars[i].notify(true, cb);
        console.log('hr characteristic discovered');

        chars[i].on('notify', function(data, isNotification) {
          console.log('notify');
        });

        chars[i].on('read', function(data, isNotification) {
          console.log('read');
          decode(data);
        });

      }
    }
  }
}

function decode(d) {
  exports.hr = 0;
  //Turn the base64 string into an array of unsigned 8bit integers
  var bytes = encodedStringToBytes(d);
  if (bytes.length === 0)
  { 
    return;
  }

  //NOTE: Follow along to understand how the parsing works
  //https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml

  //First byte provides instructions on what to do with the remaining bytes
  var flag = bytes[0];

  //Offset from beginning of the array
  var offset = 1;

  //If the first bit of the flag is set, the HR is in 16 bit form
  if ((flag & 0x01) == 1){
      //Extract second and third bytes and convert to 16bit unsigned integer
      var u16bytesHr = bytes.buffer.slice(offset, offset + 2);
      var u16Hr = new Uint16Array(u16bytesHr)[0];
      console.log('u16hr '+u16Hr);
      exports.hr = u16Hr;
      //16 bits takes up 2 bytes, so increase offset by two
      offset += 2;
  } else { //Else the HR is in 8 bit form
      //Extract second byte and convert to 8bit unsigned integer
      var u8bytesHr = bytes.buffer.slice(offset, offset + 1);
      var u8Hr = new Uint8Array(u8bytesHr)[0];
      exports.hr = u8Hr;
      //8 bits takes up 1 byte, so increase offset by one
      offset += 1;
  }

  exports.contact = (flag & 0x02) ? true : false;

  console.log('hr '+exports.hr+' contact '+exports.contact);
}

function cb(error, data) {
  console.log(data);
}


function handleError(error) {
  console.log('Error '+error);
  peripheral.disconnect();
}



function encodedStringToBytes(s) {
  var data = atob(s);
  var bytes = new Uint8Array(data.length);
  for (var i = 0; i < bytes.length; i++)
  {
    bytes[i] = data.charCodeAt(i);
  }
  return bytes;
}

function stringToBytes(s) {
  var bytes = new ArrayBuffer(s.length * 2);
  var bytesUint16 = new Uint16Array(bytes);
  for (var i = 0; i < s.length; i++) {
    bytesUint16[i] = s.charCodeAt(i);
  }
  return new Uint8Array(bytesUint16);
}