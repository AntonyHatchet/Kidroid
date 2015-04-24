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

    addDevice: function(req, res, done) {
        process.nextTick(function() {
            deviceMagic.getDeviceId(function(err,id){
                if (err){console.log(err,"id get errr")}

                deviceMagic.getDeviceToken(function(err,token){
                    if (err){console.log(err,"token get errr")}

                    deviceMagic.saveDevice({
                            timestamp: new Date(),
                            deviceID: id,
                            deviceToken: token,
                            school: req.body.school,
                            apk: req.body.apk,
                            name: req.body.name,
                            comment: req.body.comment
                        },
                        function(err){
                            if (err) {console.log(err);}
                            deviceMagic.getAllDevice(function(err, Devices){
                                if (err) {console.log(err);}
                                res.render('dashboard', {
                                    devices: Devices
                                });//////////////////////////////////////////////////////TODO Поправить ссылку
                            })
                    })
                });
            });
        }
    )}
};
