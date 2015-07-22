/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var path = require('path');
var users = require('./routes/users');
var devices = require("./routes/device");
var io = require('./socketIO/dashboardIO');


module.exports = function (app, passport) {

    app.get('/', function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('index.jade', {message: req.flash('loginMessage')});
    });

    app.on('error', function (err) {
        console.log("ERRRRR", err)
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/dashboard#users', // redirect to the secure profile section
        failureRedirect: '/dashboard#users', // redirect back to the signup page if there is an error
        failureFlash: false // allow flash messages
    }));

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/dashboard', // redirect to the secure profile section
        failureRedirect: '/', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    app.get('/dashboard', isLoggedIn, function (req, res) {
        res.render('dashboard.jade');
    });
    app.post('/uploadMarionetteAPK', isLoggedIn, users.createVersionAPK);
    app.post('/uploadKidroid', isLoggedIn, users.createVersionKidroid);

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });
    app.post('/api/save_data/', devices.getAuthorizationDevice, devices.checkApkVersion, devices.getSaveData);
    app.post('/api/registration/*', devices.getRegistrationDevice);
    app.post('/api/removeDevice/*', devices.getAuthorizationDevice, devices.getRemoveDevice);
   // app.get('/api/get_apk_version/:id&:token', devices.getAuthorizationDevice, devices.getApk)
    app.get('/api/get_apk_firewall/:id&:token', devices.getAuthorizationDevice, devices.getApkFirewall)
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}