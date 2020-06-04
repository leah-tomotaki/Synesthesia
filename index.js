// index.js

/**
 * Required External Modules
 */
const express = require("express");
const path = require("path");
const querystring = require('querystring');
const request = require('request');
const cookieParser = require('cookie-parser');
const cors = require('cors');

/**
 * App Variables
 */

const app = express();
const port = process.PORT || "8888";

/**
 *  App Configuration
 */

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

/**
 *  Constants
 */
const CLIENT_ID = 'CLIENT_ID'
const CLIENT_SECRET = 'CLIENT_SECRET'
const REDIRECT_URI = 'REDIRECT_URI'

/**
 *  Helper Functions
 */

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/**
 * Routes Definitions
 */

app.get("/", (req, res) => {
  res.render("index", { title: "Welcome" });
});

// Spotify Authorization
console.log('Send to Spotify for login');
var access_token = '';
var user_id = '';

var stateKey = 'spotify_auth_state';

app.get("/login", (req, res) => {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var scope = 'playlist-modify-public playlist-modify-private user-read-private user-read-email';

    res.redirect("https://accounts.spotify.com/authorize?" +
    querystring.stringify(
    {   client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: state,
        scope: scope
    }));
});

app.get('/callback', (req, res) =>{

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, (error, response, body) =>{
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        refresh_token = body.refresh_token;
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        // use the access token to access the Spotify Web API
        request.get(options, (error, response, body) =>{
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/home');
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', (req, res) =>{

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, response, body) =>{
    if (!error && response.statusCode === 200) {
      user_id = body.id;
      console.log(body);
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/home', (req, res) => {
    console.log("login successful!");
    res.render("main", {title: "Home"});
//    var color = req.query.color;
//    var seed = req.query.seed;
//    console.log('color: '+color);
//    console.log('seed: '+seed);
});

app.get("/playlist", (req, res) => {
    res.render("main", {title: "Home"});

    console.log('user id:' + user_id);
    console.log('access token:' + access_token);
    var authOptions = {
        url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json'
        },
        body: {'name': 'synesthesia'},
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            console.log(body);
        }
        else {
            console.log(response.statusCode);
            console.log(response.body);
        }
    });
});

app.get('/generate', (req, res) => {
    var seed = '4NHQUGzhtTLFvgF5SZesLK';
    var color = 'Yellow';
    res.render("main", {title: "Home"});
    color = req.query.color;
    seed = req.query.seed;
    console.log('color: ' + color);
    console.log('seed: ' + seed);

    var searchOptions = {
        url: 'https://api.spotify.com/v1/search?' +
            querystring.stringify({
                q: seed.replace(' ', '+'),
                type: 'track,artist',
            }),
        headers: { 'Authorization': 'Bearer ' + access_token }
    };
    request.get(searchOptions, (error, response, body) =>{
          console.log(body);
    });


//    var options = {
//        url: 'https://api.spotify.com/v1/recommendations?'+
//            querystring.stringify({
//                limit: 2,
//                seed_artists: '4NHQUGzhtTLFvgF5SZesLK',
////                seed_genres: seed,
//            }),
//        headers: { 'Authorization': 'Bearer ' + access_token },
//        json: true
//    };
//    var options = {
//        url: 'https://api.spotify.com/v1/recommendations/available-genre-seeds',
//        headers: { 'Authorization': 'Bearer ' + access_token },
//        json: true
//    };
//    request.get(options, (error, response, body) =>{
////          console.log(body);
//    });

});

/**
 * Server Activation
 */
app.listen(port, () => {
  console.log('Listening to requests on http://localhost:8888');
});



