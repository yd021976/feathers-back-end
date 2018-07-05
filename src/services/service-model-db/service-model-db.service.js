// Initializes the `service-model-db` service on path `/service-model-db`
const createService = require('feathers-nedb');
const createModel = require('../../models/service-model-db.model');
const hooks = require('./service-model-db.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/service-model-db', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('service-model-db');

  service.hooks(hooks);
};
