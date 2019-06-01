// Application hooks that run for every service
const logger = require('./hooks/logger');
const authorize = require('./hooks/abilities-service-level');
const { when } = require('feathers-hooks-common');
const authenticate = require('./hooks/authenticate');
const fieldPermission = require('./hooks/abilities-model-level');

module.exports = {
  before: {
    all: [when(
      hook => hook.params.provider &&
        `/${hook.path}` !== hook.app.get('authentication').path &&
        `/${hook.path}` !== '/service-model' &&
        `/${hook.path}` !== '/test'
        //  &&
        // `/${hook.path}` !== '/resources-locks'
      ,
      authenticate
      //authorize()
    )
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
