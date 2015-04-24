var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {

  // Get shop home page
  getDevice: function(req, res) {
    deviceMagic.getAllDevice(function(err, Devices){
      if (err) {console.log(err);}
        res.render('dashboard', {
            devices: Devices
        });
    })

  },

  getApkVersion: function(req, res) {
    res.render('admin/login');
  }
};
