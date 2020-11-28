// Application hooks that run for every service
const logger = require('./hooks/logger')
const { when } = require('feathers-hooks-common')
const { authenticate } = require('@feathersjs/authentication').hooks

/** custom app hooks */
const authorize = require('./hooks/abilities-service-level')
const fieldPermission = require('./hooks/abilities-model-level')
const loadUserRoles = require('./hooks/load-user-roles')
const applyFilters = require('./hooks/apply-roles-service-filter')

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
            /** load user roles */
            when(
                (hook) => {
                    return hook.params.provider && hook.path !== 'authentication'
                },
                [loadUserRoles]
            ),
            /** do authorization checks only when user is authenticated */
            when(
                (hook) => {
                    return hook.path !== 'authentication' && hook.params.provider
                },
                [authorize]
            ),
            when(
                (hook) => {
                    return hook.params.provider && hook.path !== 'authentication'
                },
                [applyFilters]
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
        all: [
            logger(),
            /** apply result filters based on user roles & service restriction options */
            when(
                (hook) => {
                    return hook.path !== 'authentication' && hook.params.provider
                },
                [applyFilters]
            ),
        ],
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
