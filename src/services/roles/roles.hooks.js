const { authenticate } = require('@feathersjs/authentication').hooks;
const acl_hooks = require('./roles.hooks.utils')

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [
      /**
       * TODO: Control user has a lock before update/patch/delete/create
       */
    ],
    update: [
      /**
       * TODO: Control user has a lock before update/patch/delete/create
       */
      acl_hooks.checkUserHasLock
    ],
    patch: [
      /**
       * TODO: Control user has a lock before update/patch/delete/create
       */
    ],
    remove: [
      /**
       * TODO: Control user has a lock before update/patch/delete/create
       */
    ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
