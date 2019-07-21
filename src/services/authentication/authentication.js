const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const { authenticate } = require('@feathersjs/authentication').hooks;
const feathers_errors = require('@feathersjs/errors')
const commonHooks = require('feathers-hooks-common');
const hooks = require('./hooks');
const ms = require('ms');



/** 
 * Define custom strategy "anonymous"
 */
const Strategy = require('passport-custom');
const anonymous = opts => {
  return function () {
    const verifier = async (req, done) => {
      const user = await this.service(opts.service).create({ anonymous: true, createDate: new Date() });
      return done(null, user, { userId: user[`${opts.idField}`] });
    }
    this.passport.use('anonymous', new Strategy(verifier));
  }
}



/**
 * Configure authentification service
 */
module.exports = function (app) {
  // const app = this;
  const config = app.get('authentication');

  // check token expiration must be > 30s
  const expire = ms(config.jwt.expiresIn)
  // if (expire < 30000) throw new Error('Token expiration must be higher then 30 seconds')

  // Add custom events
  authentication.service.Service.prototype.events = ['user-token-expired']

  // Add a "get" rest method to get cookie config so client can get the cookie name
  authentication.service.Service.prototype.get = function (id, params) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      let cookieConfig = _this.app.locals.settings.authentication.cookie;
      resolve(cookieConfig);
    });
  }

  // List of removed tokens
  authentication.service.Service.prototype.removedTokens = []

  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(local(config.local));
  // Configure anonymous strategy
  app.configure(anonymous(config['anonymous']));

  /**
   * Service Publishers
   */
  app.service('authentication').publish('user-token-expired', (data) => {
    const channel = `auth/${data.user.userId}`
    return app.channel(channel)
  })

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      get: [
        authenticate('jwt')
      ],
      create: [
        authentication.hooks.authenticate(config.strategies)
      ],
      remove: []
    },
    after: {
      all: [],
      get: [],
      create: [
        hooks.after_create
      ],
      remove: [
        /**
         * After remove hook 
         */
        hooks.after_remove
      ]
    }
  });
};
