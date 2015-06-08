/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var path = require('path');
var users = require('./routes/users');
var devices = require("./routes/device");
var ApkReader = require('node-apk-parser');
var util = require('util');
var io = require('./socketIO/dashboardIO');
var Busboy = require('busboy');
var fs = require('fs');
var zlib = require('zlib');
var crypto = require('crypto');
var gzip = zlib.createUnzip();

module.exports = function (app, passport) {

    app.get('/', function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('index.jade', {message: req.flash('loginMessage')});
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/dashboard', // redirect to the secure profile section
        failureRedirect: '/failure', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
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
    app.post('/uploadFile', isLoggedIn, function (req, res) {
        var busboy = new Busboy({ headers: req.headers });

        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

            fs.mkdir("./public/uploads/buffer/"+ filename.slice(0,4));
            var saveTo = path.join("./public/uploads/buffer/"+filename.slice(0,4), path.basename(filename));
            file.pipe(fs.createWriteStream(saveTo)).pipe(gzip);

            file.on('end', function() {
                var buffer = new Buffer(saveTo, 'base64');
                zlib.unzip(buffer, function(err, buffer) {
                    if (!err) {
                        console.log(buffer.toString());
                    }
                });
                //var shasum = crypto.createHash('md5');
                //var s = fs.ReadStream(saveTo);
                //s.on('data', function(d) { shasum.update(d); });
                //s.on('end', function() {
                //    var d = shasum.digest('hex');
                //    console.log(d,"checksum");
                //});
                //var reader = ApkReader.readFile(saveTo);
                //var manifest = reader.readManifestSync();
                //manifest.inspect = function() {
                //    Object.defineProperty(this,{
                //        versionCode: function() {
                //            return this.versionCode;
                //        },
                //        versionName: function() {
                //            return this.versionName;
                //        }
                //    });
                //};
                //console.log(util.inspect(manifest.versionCode));
            });
            //
        });
        busboy.on('finish', function() {
            //
            console.log('Done parsing form!');
            res.writeHead(303, { Connection: 'close', Location: '/dashboard' });
            res.end();
        });
        req.pipe(busboy);
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });
    app.post('/api/save_data/', devices.getAuthorizationDevice, devices.checkApkVersion, devices.getSaveData);
    app.post('/api/registration/*', devices.getRegistrationDevice);
    app.get('/api/get_apk_version/:id&:token', devices.getAuthorizationDevice, devices.getApk)
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}