const lmx = require('live-mutex');
const EventEmitter = require('events');
const lock_errors = require('./user_locks_errors');

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
    constructor(lockRetryMax = 0, keepLocksOnExit = true, keepLocksAfterDeath = true, lockRequestTimeout = 100, ttl = 3600) {
        this.lockRetryMax = lockRetryMax
        this.keepLocksOnExit = keepLocksOnExit
        this.keepLocksAfterDeath = keepLocksAfterDeath
        this.lockRequestTimeout = lockRequestTimeout
        this.ttl = ttl
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

        // Create LMX client
        this.clientConfig = lmxClientConfig
        this.lmxClient = new lmx.LMXClient(this.clientConfig)

        // Create user locks map
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
     * Attempt to lock a resource
     * 
     * @param {*} user The user that request lock
     * @param {string} resource_id resource to lock
     * @param {number} ttl Lock expiration in ms
     */
    async lockResource(user, resource_id, ttl) {
        return new Promise((resolve, reject) => {
            const user_locks = this.locks.get(user)
            if (!user_locks) reject(new lock_errors.userNotRegistered('User is not registered'))

            // Check that user hasn't already a valid lock for this resource
            const has_lock = user_locks.get(resource_id)
            if (has_lock) {
                resolve(new lock_errors.lockAlreadyAcquired('User already lock resource', { user: user, resource_id: resource_id, lock_id: has_lock.id }))
            }

            // Acquire lock
            this.lmxClient.ensure()
                .then(() => {
                    this.lmxClient.lockp(resource_id, this.clientConfig)
                        .then((unlock) => {
                            const now = new Date()

                            /**
                             * Lock expiration timer
                             */
                            let timer = setTimeout(async (user, resource_id) => {
                                let unlock_err = null

                                // Try to unlock resource
                                try {
                                    await this.unlockResource(user, resource_id)
                                }
                                catch (err) {
                                    // Maybe user unlock resource before this time out is reached
                                    if (err instanceof lock_errors.userHasNoLock) {
                                        // Do not emit event as resource is already unlocked
                                        return
                                    }
                                    else {
                                        unlock_err = err
                                    }
                                }


                                // Emit event that notify that resource lock has expired
                                if (!unlock_err)
                                    this.emit('lock expired', { user: user, resource_id: resource_id })
                                else
                                    this.emit('lock expired error', { user: user, resource_id: resource_id, error: unlock_err })
                            }, ttl, user, resource_id)

                            user_locks.set(resource_id, { unlock: unlock, timer: timer })
                            resolve({ resource_id: resource_id, unlockInfos: unlock })
                        })
                        .catch((err) => {
                            // Something went wrong when locking resource
                            reject(err)
                        })
                })
                .catch((err) => {
                    // Something went wrong with lmx client connection
                    reject(err)
                })
        })
    }

    /**
     * 
     * @param {*} user 
     * @param {string} resource_id 
     */
    async unlockResource(user, resource_id) {
        return new Promise((resolve, reject) => {
            const user_locks = this.locks.get(user)
            if (!user_locks) reject(new lock_errors.userNotRegistered('User has no locks (unknown user)'))

            const unlock = user_locks.get(resource_id)
            if (!unlock) reject(new lock_errors.userHasNoLock('User has no lock for this resource', { resource_id: resource_id }))

            unlock.timer.unref()

            this.lmxClient.ensure()
                .then(() => {
                    this.lmxClient.release(resource_id, unlock.unlock.id)
                        .then((unlocked) => {
                            // Cancel the lock expiration timer
                            clearTimeout(unlock.timer)
                            unlock.timer = null

                            // Remove resource from map
                            user_locks.delete(resource_id)
                            resolve(unlocked)
                        })
                        .catch(err => {
                            // Something went wrong when unlocking resource
                            reject(err)
                        })
                })
                .catch(err => {
                    // Something went wrong with client connection
                    reject(err)
                })
        })
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
}

/**
 * Exports classes
 */
module.exports.UserLocks = UserLocks
module.exports.LmxClientConfig = LmxClientConfig