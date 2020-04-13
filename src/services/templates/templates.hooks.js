const { authenticate } = require('@feathersjs/authentication').hooks;
const manageTemplateImg = require('./hooks.js').manageUploadsTemplates;

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [manageTemplateImg],
    patch: [],
    remove: [manageTemplateImg]
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
