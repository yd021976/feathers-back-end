// Initializes the `redis-lock` service on path `/redis-lock`
const { RedisLock } = require('./redis-lock.class');
const hooks = require('./redis-lock.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/redis-lock', new RedisLock(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('redis-lock');

  service.hooks(hooks);
};
