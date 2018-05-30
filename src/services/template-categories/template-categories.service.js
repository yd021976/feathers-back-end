// Initializes the `template_categories` service on path `/template-categories`
const createService = require('feathers-nedb');
const createModel = require('../../models/template-categories.model');
const hooks = require('./template-categories.hooks');

module.exports = function () {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'template-categories',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/template-categories', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('template-categories');

  service.hooks(hooks);
};
