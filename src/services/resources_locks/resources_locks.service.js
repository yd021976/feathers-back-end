// Initializes the `resources_locks` service on path `/resources-locks`
const createService = require('./resources_locks.class.js');
const hooks = require('./resources_locks.hooks');

module.exports = function (app) {
  
  const serviceOptions = app.get('resources-locks');

  const options = {
    name:"resources-locks",
    ...serviceOptions
  };

  // Initialize our service with any options it requires
  app.use('/resources-locks', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('resources-locks');

  service.hooks(hooks);
};
