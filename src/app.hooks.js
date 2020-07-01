// Application hooks that run for every service
const logger = require('./hooks/logger')
const authorize = require('./hooks/abilities-service-level')
const fieldPermission = require('./hooks/abilities-model-level')
const { when } = require('feathers-hooks-common')
const { authenticate } = require('@feathersjs/authentication').hooks

module.exports = {
    before: {
        all: [
            logger(),
            /** By default, all services need authentication, except 'authentication' service */
            when(
                (hook) => {
                    const path = hook.app.get('authentication').path
                    return `/${hook.path}` !== hook.app.get('authentication').path
                },
                /** authenticate user */
                [authenticate('jwt')]
            ),

            /** do authorization checks only when user is authenticated : Don't check if hook auth is TRUE and do not alreeady contains "user" data */
            when(
                (hook) => {
                    const authPath = 'authentication' /** authentication service path */
                    const usersPath = 'users' /** users service path */
                    const user = hook.app.get('authentication')
                    if ((hook.params.authenticated === true && hook.path === usersPath && !hook.params.user) || hook.path === authPath || hook.params.provider==='abilities') {
                        return false
                    } else {
                        return true
                    }
                },
                [authenticate('jwt'), authorize()]
            ),
        ],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },

    after: {
        all: [logger()],
        find: [],
        get: [
            //fieldPermission.authorize_read()
        ],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },

    error: {
        all: [logger()],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },
}
