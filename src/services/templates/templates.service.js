// Initializes the `templates` service on path `/templates`
const createService = require('feathers-nedb');
const createModel = require('../../models/templates.model');
const hooks = require('./templates.hooks');

module.exports = function () {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'templates',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/templates', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('templates');

  service.hooks(hooks);
};
