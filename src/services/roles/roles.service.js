// Initializes the `roles` service on path `/roles`
const createService = require('feathers-nedb');
const createModel = require('../../models/roles.model');
const hooks = require('./roles.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  // const paginate = app.get('paginate');

  const options = {
    Model,
    // paginate
  };

  // Initialize our service with any options it requires
  app.use('/roles', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('roles');

  // Add service method to get service schema
  service.getSchema = () => {
    const schema = require('./roles.schema.json');
    return schema;
  }
  service.hooks(hooks);
};
