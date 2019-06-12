const lmx = require('live-mutex');
const EventEmitter = require('events');
const lock_errors = require('./user_locks_errors');
const resource_lock_debug = require('debug')('users_locks:lock');
const resource_mutex_debug = require('debug')('users_locks:mutex');
const resource_unlock_debug = require('debug')('users_locks:unlock');
const resource_timeout_debug = require('debug')('users_locks:timeout');
/**
 * @description Resource lock infos & state
 */
class LockObj {
    /**
     * 
     * @param {string} state 
     * @param {any} timer 
     * @param {any} unlock 
     */
    constructor(state, timer, unlock) {
        this.state = state
        this.timer = timer
        this.unlock = unlock
    }
}

/**
 * @class LmxClientConfig
 * @description Simple LMX client config object
 *  
 */
class LmxClientConfig {
    /**
     * @class LmxClientConfig
     * @param {number} lockRetryMax 
     * @param {boolean} keepLocksOnExit 
     * @param {boolean} keepLocksAfterDeath 
     * @param {number} lockRequestTimeout 
     * @param {number} ttl 
     */
    constructor(lockRetryMax = 3, keepLocksOnExit = true, keepLocksAfterDeath = true, lockRequestTimeout = 100, ttl = null) {
        this.lockRetryMax = lockRetryMax
        this.keepLocksOnExit = keepLocksOnExit
        this.keepLocksAfterDeath = keepLocksAfterDeath
        this.lockRequestTimeout = lockRequestTimeout
        this.ttl = null
    }
}

/**
 * @description LMX locks for users
 * @class UserLocks
 */
class UserLocks extends EventEmitter {
    /**
     * @constructor
     * @param {LmxClientConfig} lmxClientConfig 
     */
    constructor(lmxClientConfig = new LmxClientConfig()) {
        // Call parent class constructor
        super()
        // Create LMX client for user lock/unlock resources
        this.clientConfig = lmxClientConfig
        this.lmxClient = new lmx.LMXClient(this.clientConfig)

        // Create internal LMX client : used to avoid resource timeout occurs while unlocking resource
        this._mutex = new lmx.LMXClient({ lockRetryMax: 10, keepLocksAfterDeath: false, keepLocksOnExit: false, lockRequestTimeout: 200, ttl: 800000 })

        // Create user locks map (associate user_id => resrouces id's Map)
        this.locks = new Map()
    }

    /**
     * @public
     * @param {*} user 
     */
    registerUser(user) {
        if (this.locks.get(user)) return

        // Create a new Map entry for this user
        this.locks.set(user, new Map())
    }


    /**
     * 
     */
    getLockList() {
        let locks = []
        this.locks.forEach((user_locks) => {
            user_locks.forEach((unlock, resource_id) => {
                if (!locks[resource_id]) {
                    locks[resource_id] = unlock
                }
            })
        })

        return locks
    }

    /**
     * @description Get user that locks a resource
     * @param {string} resource_id 
     */
    getResourceLocker(resource_id) {
        let found_lock = null

        this.locks.forEach((user_locks) => {
            user_locks.forEach((lock, res_id) => {
                if (resource_id == res_id) {
                    found_lock = lock
                }
            })
        })
        return found_lock
    }

    /**
     * @description unlock all user locks & timers
     * @param {string} user 
     */
    clearUserLocks(user) {
        return new Promise((resolve, reject) => {
            let mutex_id = ''
            let all_promises = [] // Array of promises

            const user_locks = this._getUserLocks(user)
            if (!user_locks) return
            
            user_locks.forEach((lock_infos, resource_id) => {
                // Unlock resource if current state is 'locked'
                if (lock_infos.state == 'locked')
                    all_promises.push(this.unlock(user, resource_id))
            })

            return Promise.all(all_promises)
                .then((results) => {
                    return resolve(results)
                })
                .catch(err => {
                    throw err
                })
        })
    }
    /**
     * @description Sets expiration delay for a resource lock
     * @private
     * 
     * @param {string} user user ID
     * @param {string} resource_id Resource ID
     * @param {number} ttl Expiration delay in ms
     */
    _setResourceTimeout(user, resource_id, ttl) {
        return setTimeout(async (user, resource_id) => {
            resource_timeout_debug('INFO: Reach resource lock timeout', [resource_id, user])

            /**
             * First, ensure we can perform "expiration" by getting a mutex
             */
            const mutex_id = user + ':' + resource_id
            let mutex_unlock = null

            // Lock intenal mutex
            return this._lockInternalMutex(mutex_id)
                .then((unlock) => {
                    mutex_unlock = unlock // Set it for later unlock

                    // Get resource actual lock infos & check the resource is not already released
                    const resource_lock_infos = this._getResourceLockInfos(user, resource_id)
                    if (resource_lock_infos.state != 'locked') {
                        throw new lock_errors.lockAlreadyReleased('Resource already released')
                    }
                    return resource_lock_infos
                })
                .then((resource_unlock) => {
                    return this._unlockResource(user, resource_unlock, resource_id)
                })
                .then((updated_resource_unlock_infos) => {
                    resource_timeout_debug('SUCCESS: Resource unlocked', [resource_id, user, updated_resource_unlock_infos.state])

                    // Update resource lock infos
                    this._setResourceLockInfos(user, resource_id, updated_resource_unlock_infos)

                    // Emit event that notify that resource lock has expired
                    this.emit('lock expired', { user: user, resource_id: resource_id, unlocked: updated_resource_unlock_infos.unlock })
                })
                .then(() => {
                    // Finally, unlock internal mutex
                    return this._unlockInternalMutex(mutex_id, mutex_unlock)
                })
                .catch(err => {
                    resource_timeout_debug('ERROR: Resource not unlocked', [user, resource_id, err])
                    if (mutex_unlock) this._unlockInternalMutex()
                    throw err
                })
        }, ttl, user, resource_id)
    }

    /**
     * 
     * @param {string} user 
     * @param {string} resource_id
     * @param {number} ttl 
     * @returns {Promise<LockObj>}
     */
    lock(user, resource_id, ttl = null) {
        return new Promise((resolve, reject) => {
            const mutex_id = user + ':' + resource_id // Internal mutex id
            let internal_mutex_unlock = null // Internal mutex unlock infos

            /**
             * Critical section : Acquire internal mutex lock
             */

            // Lock internal mutex
            this._lockInternalMutex(mutex_id)
                // Check user is registered 
                .then((mutex_unlock) => {
                    internal_mutex_unlock = mutex_unlock

                    const user_locks = this.locks.get(user)
                    if (!user_locks) {
                        resource_lock_debug('User is not registred', [user, resource_id])
                        throw new lock_errors.userNotRegistered('User is not registered')
                    } else {
                        return user_locks
                    }
                })
                // Check user hasn't already locked this resource
                .then((locks) => {
                    const resource_lock = locks.get(resource_id)
                    if (resource_lock && resource_lock.state == 'locked') {
                        resource_lock_debug('WARNING : User has already locked resource', [user, resource_id, resource_lock.id, resource_lock.state]);
                        throw new lock_errors.lockAlreadyAcquired('User already lock resource', { user: user, resource_id: resource_id, lock_id: resource_lock.id })
                    } else {
                        return
                    }
                })
                // Try to lock resource id
                .then(() => {
                    return this._lockResource(user, resource_id)
                })
                // Resource successfully locked, set lock timeout if ttl is provided
                .then(resource_lock_infos => {
                    let timer = null
                    /**
                     * Set TTL for resource lock
                     */
                    if (ttl)
                        timer = this._setResourceTimeout(user, resource_id, ttl)

                    // Update resource lock infos
                    resource_lock_infos.timer = timer
                    this._setResourceLockInfos(user, resource_id, resource_lock_infos)

                    return
                })
                // Unlock internal mutex
                .then(() => {
                    return this._unlockInternalMutex(mutex_id, internal_mutex_unlock)
                })
                .then(() => {
                    return resolve(this._getResourceLockInfos(user, resource_id))
                })
                // Error occured
                .catch(err => {
                    resource_lock_debug('ERROR : Lock resource', [user, resource_id, err])

                    // If internal mutex is locked, try to unlock
                    if (internal_mutex_unlock) {
                        this._unlockInternalMutex(mutex_id, internal_mutex_unlock)
                    }

                    // Assume that if code is request_timeout, the lock is already locked by someone
                    if (err['code'] == 'request_timeout') {
                        err.message = 'Resource already locked by someone'
                    }
                    /**
                     * Handle error in promise chain
                     */
                    reject(err)
                })
        })
    }


    /**
     * Unlock resource
     * 
     * @param {string} user 
     * @param {string} resource_id
     * @returns {Promise<LockObj>}
     */
    unlock(user, resource_id) {
        const mutex_id = user + ':' + resource_id
        let mutex_unlock

        return this._lockInternalMutex(mutex_id)
            // Check resource lock status
            .then((internal_mutex_unlock) => {
                mutex_unlock = internal_mutex_unlock

                const resource_lock = this._getResourceLockInfos(user, resource_id)
                // Resource has been released ?
                if (resource_lock.state != 'locked') {
                    resource_unlock_debug('ERROR: Resource already released', [resource_id, user, resource_lock])
                    throw new lock_errors.lockAlreadyReleased('Resource already released')
                }
                return resource_lock
            })
            // Try to unlock resource
            .then((resource_lock) => {
                return this._unlockResource(user, resource_lock, resource_id)
            })
            // Update lock infos & clear any timer
            .then((resource_unlock_result) => {
                this._setResourceLockInfos(user, resource_id, resource_unlock_result)
                return this._unlockInternalMutex(mutex_id, mutex_unlock)
            })
            .then(() => {
                // return resource lock infos
                return this._getResourceLockInfos(user, resource_id)
            })
            .catch(err => {
                // If internal mutex locked, try to unlock
                if (mutex_unlock) this._unlockInternalMutex(mutex_id, mutex_unlock)

                resource_unlock_debug('ERROR: Unlock resource error', [user, resource_id, err])
                throw err
            })
    }

    /**
     * 
     * @param {*} mutex_id 
     */
    _lockInternalMutex(mutex_id) {
        return this._mutex.ensure()
            .then(() => {
                return this._mutex.lockp(mutex_id)
            })
            .then((unlock) => {
                resource_mutex_debug('INFO: Internal mutex locked', [mutex_id])
                return unlock
            })
            .catch(err => {
                resource_mutex_debug('ERROR: Internal mutex not locked', [mutex_id, err])
                throw err
            })
    }
    /**
     * 
     * @param {*} mutex_id 
     * @param {*} mutex_unlock 
     * @return {any}
     */
    _unlockInternalMutex(mutex_id, mutex_unlock) {
        return this._mutex.ensure()
            .then(() => {
                return this._mutex.release(mutex_id, mutex_unlock.id)
            })
            .then((unlocked) => {
                resource_mutex_debug('INFO: Internal mutex released', [mutex_id])
                return unlocked
            })
            .catch(err => {
                resource_mutex_debug('ERROR: Internal mutex not released', [mutex_id, err])
                throw err
            })
    }


    /**
     * @description Lock a resource assuming internal mutex is acquired
     * @private
     * 
     * @param {*} user 
     * @param {*} resource_id 
     * @returns {Promise<LockObj>}
     * 
     */
    _lockResource(user, resource_id) {
        let options = {}
        Object.assign(options, this.clientConfig)
        options.ttl = null
        return this.lmxClient.ensure()
            .then(() => {
                return this.lmxClient.lockp(resource_id, options)
            })
            .then((resource_lock) => {
                resource_lock_debug('INFO: Resource locked', [user, resource_id, resource_lock.id, resource_lock.acquired])
                let results = new LockObj('locked', null, resource_lock)
                return results
            })
            .catch(err => {
                throw err
            })
    }
    /**
     * @description Unlock resource assuming internal mutex is acquired. When successful, if any clear resource timeout and return a new state of resource lock
     * @private
     * 
     * @param {string} user 
     * @param {string} resource_id
     * @returns {LockObj} resource unlock data
     */
    _unlockResource(user, lock_object, resource_id) {
        let results

        return this.lmxClient.ensure()
            .then(() => {
                return this.lmxClient.unlockp(resource_id, lock_object.unlock.id)
            })
            .then((unlocked) => {
                resource_unlock_debug('INFO: Resource unlocked', [user, resource_id, unlocked])
                // Cancel the lock expiration timer
                if (lock_object.timer) clearTimeout(lock_object.timer)

                // create and return new resource state object
                results = new LockObj('released', null, unlocked)
                return results
            })
            .catch(err => {
                // Something went wrong with client connection
                throw err
            })
    }
    /**
     * 
     * @param {*} user 
     * @param {*} resource_id 
     * @returns {LockObj} Resource lock data
     */
    _getResourceLockInfos(user, resource_id) {
        const user_locks = this.locks.get(user)
        if (!user_locks) {
            throw new lock_errors.userNotRegistered('User not registered', [user])
        }

        const resource_lock_infos = user_locks.get(resource_id)
        if (!resource_lock_infos) {
            throw new lock_errors.userHasNoLock('User has no lock for requested resource', [user, resource_id])
        }

        return resource_lock_infos
    }

    /**
     * @description Get all user locks
     * @param {string} user
     * @returns {Map<string,LockObj>} 
     */
    _getUserLocks(user) {
        const user_locks = this.locks.get(user)
        return user_locks
    }
    /**
     * Sets or override if exist the lock infos for a user/resource
     * 
     * @private
     * @throws {userNotRegistered}
     * 
     * @param {string} user 
     * @param {string} resource_id 
     * @param {LockObj} lock_infos 
     */
    _setResourceLockInfos(user, resource_id, lock_infos) {
        let user_locks = this.locks.get(user)
        if (!user_locks) throw new lock_errors.userNotRegistered('User not registered', [user])

        user_locks.set(resource_id, lock_infos)
    }

}


/**
 * Exports classes
 */
module.exports.UserLocks = UserLocks
module.exports.LmxClientConfig = LmxClientConfig