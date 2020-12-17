const { JWTStrategy } = require('@feathersjs/authentication')
const { LocalStrategy } = require('@feathersjs/authentication-local')
const { tigrouAuthenticationService } = require('./authentication.extended')
const { AuthenticationService } = require('@feathersjs/authentication')

module.exports = (app) => {
    const authentication = new tigrouAuthenticationService(app) /** custom auth */
    authentication.register('jwt', new JWTStrategy())
    authentication.register('local', new LocalStrategy())
    app.use('/authentication', authentication)
}
