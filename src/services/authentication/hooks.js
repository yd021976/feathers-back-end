const errors = require('@feathersjs/errors')

function create(hook) {
    const app = hook.app
    const service = app.service('authentication')
    const secret = app.get('authentication').secret
    const token = hook.result.accessToken

    return service.passport.verifyJWT(token, { "secret": secret })
        .then(user => {
            const date = new Date()
            const time = date.getTime()
            const user_expire_date = new Date(user.exp * 1000)
            const expire = (user.exp * 1000 - time)

            /**
             * set token expiration timeout
             */
            setTimeout(() => {
                // Verify again JWT to check it has expired
                service.passport.verifyJWT(token, { "secret": secret })
                    .then((payload) => {
                        // throw error in case JWT still valide after expiration time
                        throw new errors.NotAuthenticated('JWT is not valid', payload)
                    })
                    .catch(err => {
                        // Yep ! JWT is really expired, emit event 'login expired'
                        app.emit('login expired', user)
                    })
            }, expire)
        })
        .catch(err => {
            //TODO: JWT was just been created, but verifyJWT send an error : Do something for this case
            throw err
        })
}

module.exports = {
    after_create: create
}