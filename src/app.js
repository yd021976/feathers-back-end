const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const configuration = require('@feathersjs/configuration');

const socketio = require('@feathersjs/socketio');
const rest = require('@feathersjs/express/rest');

const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');

const { authenticate } = require('@feathersjs/authentication').hooks;
const auth = require('@feathersjs/authentication');
const ck = require('cookie');
const app = express(feathers());
var debug = require('debug')('uploads:extract cookie');

// Load app configuration
app.configure(configuration(path.join(__dirname, '..')));
// Enable CORS, security, compression, favicon and body parsing
app.use(cors());
app.use(helmet());
app.use(compress());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(path.join(app.get('public'), 'favicon.ico')));

app.configure(socketio());
app.configure(rest());

// Host the public and upload folder
// app.use('/', express.static(app.get('public')));
// app.use(
//   '/uploads',
//   // we need the header cookie to get the access token and then authenticate the user
//   // NOTE : Maybe it's security hole
//   // TODO create question and check answer at stackoverflow sites
//   function(req, res, next) {
//     debug('Read JWT from cookie', req.headers);

//     var cookies = ck.parse(req.headers.cookie);
//     let cookieName = app.get('authentication').cookie.name;

//     // set cookie token only if not already sets (i.e. If the call from a rest feather client)
//     if (!req.headers.authorization) {
//       if (cookies[cookieName]) {
//         req.headers.authorization = "Bearer " + cookies[cookieName];
//         debug('sets request header with token from Cookie');
//       }
//     }
//     next();
//   },
//   // now we have extract the token from the cookie and set it into header, we can auth. the request
//   auth.express.authenticate('jwt'),
//   function(req, res, next) {
//     let a = 0;
//     next();
//   },
//   express.static(app.get('uploads'))
// );

/**
 * Setup services Mixins
 */
// app.mixins.push((service, path) => {
//   service.getModel = function () {
//     var model = app.service(path).serviceModel();
//   }
// });

// Set up our services (see `services/index.js`)
app.configure(services);
// Configure middleware (see `middleware/index.js`) - always has to be last
app.configure(middleware);
app.hooks(appHooks);

module.exports = app;
