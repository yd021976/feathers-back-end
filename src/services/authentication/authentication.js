const { JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { tigrouAuthenticationService } = require('./authentication.extended');

module.exports = app => {
  const authentication = new tigrouAuthenticationService(app);
  authentication.register('jwt', new JWTStrategy());
  authentication.register('local', new LocalStrategy());
  app.use('/authentication', authentication);
};