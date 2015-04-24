var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {

  // Get shop home page
  getDevice: function(req, res) {
      //console.log(req);
    deviceMagic.getAllDevice(function(err, Device){
      if (err) {console.log(err);}
        res.render('dashboard.jade', {
            Timestamp: Device.Timestamp,
            device_id: Device.device_id,
            token: Device.token,
            latitude: Device.latitude,
            longitude: Device.longitude,
            apk_version: Device.apk_version,
            loader_version: Device.loader_version
        });
    })

  },

  getApkVersion: function(req, res) {
    res.render('admin/login');
  }
};
