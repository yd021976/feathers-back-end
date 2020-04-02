// Initializes the `site.zones` service on path `/site-zones`
const createService = require('feathers-nedb');
const createModel = require('../../models/site.spaces.model');
const hooks = require('./site.zones.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/site-zones', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('site-zones');

  // Add service method to get service schema
  service.getSchema = () => {
    const schema = require('./site.zones.schema.json');
    return schema;
  }
  
  service.hooks(hooks);
};
