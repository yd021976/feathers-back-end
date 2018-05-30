const { authenticate } = require('@feathersjs/authentication').hooks;
const dauria = require('dauria');
const errors = require('@feathersjs/errors');
const hook_after_create = require('./hook_after_create_post_process');
const hook_before_create = require('./hook_before_create_pre_process');

module.exports = {
  before: {
    all: [authenticate('jwt')], // users must be authenticated to access this service
    find: [],
    get: [],
    create: [
      function (hook) { return hook_before_create.pre_process_upload(hook); }
    ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      /** 
       * Post processing after CREATE the file :
       * 1 - Check mime-type of uploaded file against <AllowedMimeTypes> param 
       * 2 - Convert first PDF page into PNG image if <convertToPDF> param is set
       * 3 - Sets the full URL path to access this file in the result
      */
      function (hook) { return hook_after_create.post_process_upload(hook); }
    ],
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
