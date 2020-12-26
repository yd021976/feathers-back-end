const errors = require('@feathersjs/errors')
const lmx = require('live-mutex')
const userLocks = require('./utils/user_locks.class.js')
const debug = require('debug')('resources_locks')
const feathersApp = require('@feathersjs/feathers/lib/application')

/**
 *
 */
class Service {
    /**
     *
     * @param {*} options
     */
    constructor(options) {
        this.options = options || {}
        this.app = null
        this.locks = new userLocks.UserLocks()

        /**
         * Listen to lock expire events
         */
        this.locks.on('lock expired', (result) => {
            let a = 0
        })
    }

    /**
     *
     * @param {feathersApp} app
     * @param {string} path
     */
    setup(app, path) {
        // Set feathers app
        this.app = app

        // User logout or token has expired
        //
        // TODO: unlock all user's locked resources
        app.on('logout user', (payload) => {
            return this.locks.clearUserLocks(payload.user.userId)
        })

        /**
         *
         */
        app.on('login user', async (login) => {
            this.locks.registerUser(login.user._id)
        })

        // Start LMX Broker
        return new lmx.Broker().ensure().then((broker) => {
            this.broker = broker
        })
    }

    /**
     * Get app resources locks owned by current authenticated user
     *
     * Additionnal query params
     * ------------------------
     * <all_owners> : if set to true AND user role is admin, then "find" will Retrieve locks owned by all users
     *
     * @param {any} params
     */
    async find(params) {
        let promises = []
        let users = []
        const all_owners = params.query.all_owner == 'true' || params.query.all_owner == true

        // User should be authenticated, else throw error
        if (!params.user) {
            throw errors.NotAuthenticated('User is not authenticated')
        }

        // If we want to get locks owned by all users (user must be admin)
        if (params.user.role == 'admin' && all_owners) {
            try {
                const all_users = await this.app.service('users').find()
                all_users.data.forEach((user) => {
                    // Do not add current authenticated user in the list as it will be added before requesting locks
                    if (user._id.toString() != params.user._id.toString()) {
                        users.push(user)
                    }
                })
            } catch (e) {
                // Do nothing here
            }
        }

        // Add current authenticated user in request list
        users.push(params.user)

        users.forEach((user) => {
            promises.push(this.locks.getLockList(user._id.toString()))
        })

        let result = {}
        let temp_response
        return Promise.all(promises)
            .then((locks_list) => {
                locks_list.forEach((locks) => {
                    locks.forEach((lockObj, lock_id) => {
                        temp_response = this._buildResponse(lockObj.resource, lockObj.lock.unlock, lockObj.lock.state, lockObj.user, '')
                        result[lockObj.resource] = temp_response
                    })
                })
                return result
            })
            .catch((err) => {
                throw err
            })
    }

    /**
     *
     * @param {string} resource_id_to_lock The resource name to lock
     * @param {any} params
     */
    get(resource_id_to_lock, params) {
        const resource_ttl = params.query ? (params.query['ttl'] ? params.query['ttl'] : null) : null
        let response = {}
        /**
         * If user is auth, retrieve or create store of resources locks
         */
        if (params.user) {
            this.locks.registerUser(params.user._id.toString()) // ensure user is registered, will do nothing if user already registered
        } else {
            throw new errors.NotAuthenticated('Resource lock are only available with authenticated users')
        }

        // Sets user ID
        const userId = params.user._id.toString()

        /**
         *
         */
        return this.locks
            .lock(userId, resource_id_to_lock, resource_ttl)
            .then((lockInfos) => {
                response[resource_id_to_lock] = this._buildResponse(
                    lockInfos.unlock.key,
                    lockInfos.unlock.id,
                    lockInfos.state,
                    userId,
                    'Lock successfull'
                )
                return response
            })
            .catch((err) => {
                response[resource_id_to_lock] = this._buildResponse(resource_id_to_lock, resource_id_to_lock, null, userId, err.message)
                throw new errors.FeathersError(err.message, 'resources-locks-error', errors[500], err.name, response)
            })
    }

    /**
     * Release a lock
     *
     * @param {*} resourceId_to_unlock
     * @param {*} params
     */
    remove(resourceId_to_unlock, params) {
        let response = {}

        if (!params.user) throw new errors.Unprocessable('User must be authenticated and should be set in method params')

        // Sets user ID
        const userId = params.user._id.toString()
        return this.locks
            .unlock(userId, resourceId_to_unlock)
            .then((unlocked) => {
                response[resourceId_to_unlock] = this._buildResponse(
                    unlocked.unlock.key,
                    unlocked.unlock.id,
                    unlocked.state,
                    userId,
                    'Unlock successfull'
                )
                return response
            })
            .catch((err) => {
                response[resourceId_to_unlock] = this._buildResponse(resourceId_to_unlock, null, false, userId, err.message)
                return response
            })
    }

    /**
     * Build service response
     *
     * @param {string} resName Lock resource ID/Name
     * @param {string} lockid ID of the obtain/released lock
     * @param {string} state Is resource locked ?
     * @param {string} userid Id of the user that requested service method
     * @param {string} message Free message to return
     */
    _buildResponse(resName, lockid, state, userid, message) {
        return {
            user: userid,
            resource_name: resName,
            id: lockid,
            state: state,
            message: message,
        }
    }
}

module.exports = function (options) {
    return new Service(options)
}

module.exports.Service = Service
