// Initializes the `serviceModel` service on path `/service-model`
const createService = require('./service-model.class.js');
const hooks = require('./service-model.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/service-model', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('service-model');

  service.hooks(hooks);
};
