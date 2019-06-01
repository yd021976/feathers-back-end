const errors = require('@feathersjs/errors');
const lmx = require('live-mutex');
/**
 * 
 */
class Lock {
  constructor() {
    this.lmxClient = null
    this.unlock = null
  }
  /**
   * 
   */
  createClient() {
    // If called with an existing client, return current client
    if (this.lmxClient) return Promise.resolve(this.lmxClient)

    let client = new lmx.Client({ lockRetryMax: 0, keepLocksOnExit: true, keepLocksAfterDeath: true, lockRequestTimeout: 1000, ttl: 800000 })
    this.lmxClient = client
    return this.lmxClient.connect()
  }

  /**
   * 
   * @param {*} unlock 
   */
  UnlockInfos(unlock) {
    this.unlock = unlock
  }

  /**
   * 
   */
  lock(resource_id, ttl) {
  }
}


/**
 * 
 */
class Service {
  constructor(options) {
    this.options = options || {};
    this.locks = new Map() // Map of userId => Locks objects
  }

  setup(app, path) {
    // Start LMX Broker
    return new lmx.Broker().ensure().then((broker) => {
      this.broker = broker
    })
  }



/**
 * 
 * @param {string} id 
 * @param {any} params 
 */
  find(id, params) {
    const keys = Array.from(this.broker.locks.keys())
    return Promise.resolve(keys);
  }

  /**
   * 
   * @param {string} id 
   * @param {any} params 
   */
  get(id, params) {
    return Promise.resolve({});
   
    // Map of resourcesID to lmx clients for a user
    let locks
    const broker = this.broker

    /**
     * If user is auth, retrieve or create store of resources locks
     */
    if (params.user) {
      locks = this.locks.get(params.user._id)
      if (!locks) {
        locks = new Map() // Array of resources ID mapped to Locks objects
        this.locks.set(params.user._id, locks)
      }
    } else {
      throw new errors.NotAuthenticated("Resource lock are only available with authenticated users");
    }

    /**
     * Check if resource ID already has a lock.
     */
    const hasLock = locks.get(id)
    const lock_acquired = hasLock ? hasLock.unlock ? hasLock.unlock.acquired : false : false
    const lock = hasLock ? hasLock : new Lock()

    if (!hasLock) locks.set(id, lock) // store the lock for the requested resource ID

    return lock.createClient() // Create new lmx client if none exists
      .then(() => {
        return lock.lmxClient.ensure()
          .then(() => {
            return lock.lmxClient.lockp(id, { maxRetry: 0, lockRetryMax: 0, keepLocksOnExit: true, keepLocksAfterDeath: true, lockRequestTimeout: 5000, ttl: 30000 })
              .then((unlock) => {
                lock.setUnlockInfos(unlock)
                return Promise.resolve(this._buildResponse(params.user._id, id, unlock.id, unlock.acquired, "lock resource '" + id + "' succesfull"));
              })
              .catch(error => {
                lock.lmxClient.requestLockInfo(id, (data) => {
                  let a = 0
                })
                // User already had a lock on this resource
                if (lock_acquired) {
                  return this._buildResponse(id, hasLock.currentLockId, lock_acquired, params.user._id, "user already own lock for resource '" + id + "'");
                }
                // In other case, means that resource is already locked by someone else
                throw error
              })
          })

          .catch(error => {
            throw error
          })


          .catch(error => {
            throw error
          })

      });
    }


  /**
   * Release a lock
   * 
   * @param {*} id 
   * @param {*} params 
   */
  remove(id, params) {
    return Promise.resolve({});

    
    if (!params.user) throw new errors.Unprocessable("User must be authenticated and should be set in method params")


    let lock
    /**
     * Get user locks map
     */
    var locks = this.locks.get(params.user._id)
    if (locks) {
      lock = locks.get(id)
      if (lock && this._isLockAcquired(lock)) { // check that the lock is acquired
        return lock.lmxClient.release(id, lock.unlock.id)
          .then((unlock) => {
            lock.setUnlockInfos(null) // as we successfully released resource ID, clear client unlock infos
            return Promise.resolve(this._buildResponse(id, unlock.id, false, params.user._id, "unlock resource '" + id + "' succesfull")
            )
          })
          .catch(error => { throw error })
      }
      else {
        throw new errors.Unprocessable("User has currently acquired no lock for requested resource '" + id + "'")
      }
    } else {
      throw new errors.Unprocessable("User has currently acquired no lock for requested resource '" + id + "'")
    }
  }

  /**
   * Check if a client has acquired resource
   * 
   * @param {Lock} lock 
   */
  _isLockAcquired(lock) {
    if (!lock) return false

    if (lock.unlock) {
      return lock.unlock.acquired
    }
    else {
      return false
    }
  }
  /**
   * Build service response
   * 
   * @param {string} resName Lock resource ID/Name
   * @param {string} lockid ID of the obtain/released lock
   * @param {boolean} acquired Is resource locked ?
   * @param {string} userid Id of the user that requested service method
   * @param {string} message Free message to return
   */
  _buildResponse(resName, lockid, acquired, userid, message) {
    return {
      "lockInfos": {
        "userId": userid,
        "resourceName": resName,
        "lockId": lockid,
        "lockAcquired": acquired,
        "message": message
      }
    }
  }
}


module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
