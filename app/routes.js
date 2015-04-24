/**
 * Created by anton_gorshenin on 24.04.2015.
 */

var users = require('./routes/users');

module.exports = function(app, passport) {

    app.get('/', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('index.jade', { message: req.flash('loginMessage') });
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/failure', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/dashboard', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    app.get('/dashboard', isLoggedIn, users.getDevice);
    app.post('/addDevice', isLoggedIn, users.addDevice);

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/api/*', function(req, res) {

        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}