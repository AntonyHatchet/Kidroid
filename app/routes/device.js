var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {

  // Get shop home page
  getSaveData: function(req, res) {
    // Render admin/users page
    deviceMagic.getAllUsersList(function(Users){
      res.render('admin/users', {
        users: Users,
        user: req.user
      });
    })

  },

  getApkVersion: function(req, res) {
    res.render('admin/login');
  }
};
