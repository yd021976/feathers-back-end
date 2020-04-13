// Application hooks that run for every service
const logger = require('./hooks/logger');
const authorize = require('./hooks/abilities-service-level');
const fieldPermission = require('./hooks/abilities-model-level');
const { when } = require('feathers-hooks-common');
const { authenticate } = require('@feathersjs/authentication').hooks

module.exports = {
  before: {
    all: [
      logger(),
      /** By default, all services need authentication, except 'authentication' service */
      when((hook) => {
        const path = hook.app.get('authentication').path;
        return `/${hook.path}` !== hook.app.get('authentication').path
      }, authenticate('jwt'))

    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [logger()],
    find: [],
    get: [
      //fieldPermission.authorize_read()
    ],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [logger()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
