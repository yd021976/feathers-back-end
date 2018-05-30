// Initializes the `file-system` service on path `/file-system`
const createService = require('./file-system.class.js');
const hooks = require('./file-system.hooks');

module.exports = function (app) {
  
  const serviceOptions = app.get('file-system');

  const options = {
    name: 'file-system',
    ...serviceOptions,
  };

  // Initialize our service with any options it requires
  app.use('/file-system', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('file-system');

  service.hooks(hooks);
};
