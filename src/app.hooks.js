// Application hooks that run for every service
const logger = require('./hooks/logger');
const authorize = require('./hooks/abilities');
const { when } = require('feathers-hooks-common');
const authenticate = require('./hooks/authenticate');

module.exports = {
  before: {
    all: [when(
      hook => hook.params.provider && (`/${hook.path}` !== hook.app.get('authentication' || `/${hook.path}`!=='service-model')).path,
      authenticate,
      authorize()
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
    get: [],
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
