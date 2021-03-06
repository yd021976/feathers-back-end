const path = require('path')
const favicon = require('serve-favicon')
const compress = require('compression')
const cors = require('cors')
const helmet = require('helmet')
const bodyParser = require('body-parser')

const feathers = require('@feathersjs/feathers')
const express = require('@feathersjs/express')
const configuration = require('@feathersjs/configuration')

const socketio = require('@feathersjs/socketio')
const rest = require('@feathersjs/express/rest')

const middleware = require('./middleware')
const services = require('./services')
const appHooks = require('./app.hooks')

const { authenticate } = require('@feathersjs/authentication').hooks
const auth = require('@feathersjs/authentication')
const ck = require('cookie')
const mongodb = require('./mongodb');
const app = express(feathers())
const { tigrouAuthenticationService } = require('./services/authentication/authentication.extended')
var debug = require('debug')('uploads:extract cookie')
const winston = require('winston')

// Load app configuration
app.configure(configuration(path.join(__dirname, '..')))
// Enable CORS, security, compression, favicon and body parsing
app.use(cors())
app.use(helmet())
app.use(compress())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(favicon(path.join(app.get('public'), 'favicon.ico')))

app.configure(socketio())
app.configure(rest())

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
app.configure(mongodb);
app.configure(services);
// Configure middleware (see `middleware/index.js`) - always has to be last
app.configure(middleware);
app.hooks(appHooks);

/**
 * Application channels management (join/leave)
 */

// Add all new connection to anonymous channel
app.on('connection', (connection) => {
    app.channel('anonymous').join(connection)
})

// Unique channel for logged in users
app.on('login', (payload, params, context) => {
    // Do nothing if no connection (i.e. REST api)
    if (!params.connection) return

    const channel = `${tigrouAuthenticationService.channel_prefix}/${params.connection.user._id}` // Create a channel only for logged in user
    app.channel(channel).join(params.connection)
})

/**
 * Application Publishers
 */
// app.publish('MyEvent', data => {
//     return app.channel('anonymous')
// })
app.logger = (hook) => {
    hook = hook
    doMessage = (message) => {
        return `${hook.path}/${hook.type}/${hook.method}/${message}`
    }
    return {
        debug: (message) => {
            return winston.debug(doMessage(message))
        },
        warn: (message) => {
            return winston.warn(doMessage(message))
        },
        error: (message) => {
            return winston.error(doMessage(message))
        },
        info: (message) => {
            return winston.info(doMessage(message))
        },

    }
}
module.exports = app;
