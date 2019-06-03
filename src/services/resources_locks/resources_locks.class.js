const errors = require('@feathersjs/errors');
const lmx = require('live-mutex');
const userLocks = require('./utils/user_locks.class.js');


/**
 * 
 */
class Service {
  constructor(options) {
    this.options = options || {};
    this.locks = new Map() // Map of userId => Locks objects
    this.app = null
    this.locks = new userLocks.UserLocks()

    /**
     * Listen to lock expire events
     */
    this.locks.on('lock expired', (user, resource_id) => {
      let a = 0
    })
    this.locks.on('lock expired error', (user, resource_id, error) => {
      let a = 0
    })
  }

  setup(app, path) {
    this.app = app
    app.on('logout', (logout) => {
      // TODO: unlock all user's locked resources
      let a = 0;
    })
    app.on('login', async (login) => {
      let a = 0
    })
    app.on('login expired', (payload) => {
      // TODO: unlock all user's locked resources
      let a = 0
    })
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
   * @param {string} resource_id_to_lock The resource name to lock
   * @param {any} params 
   */
  get(resource_id_to_lock, params) {
    /**
     * If user is auth, retrieve or create store of resources locks
     */
    if (params.user) {
      this.locks.registerUser(params.user._id) // ensure user is registered, will do nothing if user already registered
    } else {
      throw new errors.NotAuthenticated("Resource lock are only available with authenticated users");
    }

    /**
     * 
     */
    return this.locks.lockResource(params.user._id, resource_id_to_lock, 60000)
      .then((locked) => {
        let a = 0
      })
      .catch(err => {
        let a = 0
      })

  }


  /**
   * Release a lock
   * 
   * @param {*} resourceId_to_unlock 
   * @param {*} params 
   */
  remove(resourceId_to_unlock, params) {
    if (!params.user) throw new errors.Unprocessable("User must be authenticated and should be set in method params")
    return this.locks.unlockResource(params.user._id, resourceId_to_unlock)
      .then((unlocked) => {
        let a = 0
      })
      .catch(err => {
        let a = 0
      })
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
