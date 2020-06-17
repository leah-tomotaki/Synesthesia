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

var artistList = {};
var trackList = {};

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
    artistList = {};
    trackList = {};
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
          console.log(body.display_name);
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
    if(Object.keys(trackList).length + Object.keys(artistList).length < 5) {
        if(req.query.artist !== undefined ) {
            var artistObj = JSON.parse(req.query.artist);
            artistList[artistObj.name] = artistObj.id;
            console.log(artistList);
        }
        if(req.query.track !== undefined) {
            var trackObj = JSON.parse(req.query.track);
            trackList[trackObj.name + " - " + trackObj.artists[0].name] = trackObj.id;
            console.log(trackList);
        }
    }
    res.render("main", {
        title: "Home",
        artistList: artistList,
        trackList: trackList
    });
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

app.get('/search/artist', (req, res) => {
    var artistSeed = req.query.artist_seed === undefined ? '12Chz98pHFMPJEknJQMWvI' : req.query.artist_seed;
    var searched = false;
    var searchOptions = {
        url: 'https://api.spotify.com/v1/search?' +
            querystring.stringify({
                q: artistSeed.replace(' ', '+'),
                type: 'artist',
            }),
        headers: { 'Authorization': 'Bearer ' + access_token }
    };
    request.get(searchOptions, (error, response, body) =>{
          var obj = JSON.parse(body);
//          console.log(obj.artists.items);
          res.render('main', {
              artists: obj.artists.items,
              artistList: artistList,
              trackList: trackList
          });
    });
});

app.get('/search/track', (req, res) => {
   var trackSeed = req.query.track_seed === undefined ? '4NHQUGzhtTLFvgF5SZesLK' : req.query.track_seed;
   var searchOptions = {
        url: 'https://api.spotify.com/v1/search?' +
            querystring.stringify({
                q: trackSeed.replace(' ', '+'),
                type: 'track',
            }),
        headers: { 'Authorization': 'Bearer ' + access_token }
   };
   request.get(searchOptions, (error, response, body) =>{
          var obj = JSON.parse(body);
          console.log(obj)
          res.render("main", {
               tracks: obj.tracks.items,
               artistList: artistList,
               trackList: trackList
          });
   });
});

app.get('/generate', (req, res) => {
    var color = 'Yellow';

    var options = {
        url: 'https://api.spotify.com/v1/recommendations?'+
            querystring.stringify({
                limit: 100,
                seed_artists: Object.values(artistList).join(),
                seed_tracks: Object.values(trackList).join()
            }),
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(options, (error, response, body) =>{
//          console.log(body);
        res.render("playlist", {
            title: color,
            playlist: body.tracks
        });
    });

});

/**
 * Server Activation
 */
app.listen(port, () => {
  console.log('Listening to requests on http://localhost:8888');
});



