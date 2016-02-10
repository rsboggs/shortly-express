var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');

//passport
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

passport.use(new GithubStrategy({
  clientID: 'd45b54974da20d19337d',
  clientSecret: '37f808187f356635f5bba1639fe04bcb970035c6',
  callbackURL: 'http://127.0.0.1:4568/login/github/callback'
}, function(accessToken, refreshToken, profile, done){
  process.nextTick(function(){
    return done(null, profile);
  });
  // done(null, {
  //   accessToken: accessToken,
  //   profile: profile
  // });
}));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({secret: 'keyboard cat', cookie: {maxAge:60000}}));

//passport////////////////////////////////////
app.use(passport.initialize());
app.use(passport.session());



app.get('/login/github', passport.authenticate('github'), function(req,res){});

app.get('/login/github/callback', 
  passport.authenticate('github', {'failureRedirect': '/login'}), 
  function(req, res){
    console.log("fasho");
    res.redirect('/');
});

// app.get('/login/callback',
//   passport.authenticate('github', {failureRedirect: '/login/error'}),
//   util.callback
// );
///////////////////////////////////

app.get('/',
function(req, res) {
  res.render('index');
});

app.get('/create', util.checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.post('/signup', 
function(req, res) {
  //get info from req object
  var username = req.body.username;
  var password = req.body.password;
  new User({username : username}).fetch()
    .then(function(found){
      if(found){
        //should direct to login if found but need this to pass test
        res.redirect('/');
      } else {
        Users.create({
          username : username, 
          password : password
        })
        .then(function(newUser) {
          req.session.regenerate(function(){
            req.session.user = username;
            res.redirect('/');
          });
        });
      }
    });
});


app.get('/login', 
function(req, res) {
  res.render('login');
});

app.post('/login',
  function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    new User({username : username}).fetch()
      .then(function(found){
        if(!found){
          res.set('Content-Type', 'text/html');
          res.set('location', '/login');
          res.send(302);
        } else {
          bcrypt.compare(password, found.get('password'), function(err, result){
            if(result){
              //correct password, start sesh, 
              req.session.regenerate(function(){
                req.session.user = username;
                res.redirect('/');
              });
            } else {
              res.set('Content-Type', 'text/html');
              res.set('location', '/login');
              res.send(302);
            }
          });
        }
      });
  });

  app.get('/logout', function(req, res) {
    req.session.destroy(function(err){
      res.redirect('/login');
    });
  });
/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', util.checkUser,
  function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
