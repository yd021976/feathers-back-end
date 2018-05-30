// Initializes the `google-drive` service on path `/google-drive`
const createService = require('./google-drive.class.js');
const hooks = require('./google-drive.hooks');

module.exports = function () {
  const app = this;
  const paginate = app.get('paginate');

  const options = {
    name: 'google-drive',
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/google-drive', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('google-drive');

  service.hooks(hooks);
};
