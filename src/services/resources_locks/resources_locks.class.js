const errors = require('@feathersjs/errors');
const lmx = require('live-mutex');
const userLocks = require('./utils/user_locks.class.js');
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
    this.options = options || {};
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
    const resource_ttl = params.query['ttl'] || null;

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
    return this.locks.lock(params.user._id, resource_id_to_lock, resource_ttl)
      .then((lockInfos) => {
        return this._buildResponse(lockInfos.unlock.key, lockInfos.unlock.id, lockInfos.state, params.user._id, "Lock successfull")
      })
      .catch(err => {
        return this._buildResponse(resource_id_to_lock, null, null, params.user._id, err.message)
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
    return this.locks.unlock(params.user._id, resourceId_to_unlock)
      .then((unlocked) => {
        return this._buildResponse(unlocked.unlock.key, unlocked.unlock.id, unlocked.state, params.user._id, 'Unlock successfull')
      })
      .catch(err => {
        return this._buildResponse(resourceId_to_unlock, null, false, params.user._id, err.message)
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
      "lockInfos": {
        "user": userid,
        "resource_name": resName,
        "id": lockid,
        "state": state,
        "message": message
      }
    }
  }
}


module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
