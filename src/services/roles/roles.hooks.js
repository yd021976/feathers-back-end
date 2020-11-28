const { authenticate } = require('@feathersjs/authentication').hooks
const roleHooks = require('./roles.hooks.utils')
const authorize = require('../../hooks/abilities-service-level')
const checkLock = require('../../hooks/ensureResourceLock')

module.exports = {
    before: {
        all: [authenticate('jwt')],
        find: [],
        get: [],
        create: [checkLock('permissions')],
        update: [checkLock('permissions')],
        patch: [checkLock('permissions')],
        remove: [checkLock('permissions'), roleHooks.ensureRoleIsUnused /** check removed role is not assigned to a user */],
    },

    after: {
        all: [
            /** ensure operation filters are populated in results (i.e. If a filter is added after role is saved in db) */
            roleHooks.populateServiceOperationOptions,
        ],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },

    error: {
        all: [],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },
}
