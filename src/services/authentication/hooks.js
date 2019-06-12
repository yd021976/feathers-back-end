const errors = require('@feathersjs/errors')
const debug_after_create = require('debug')('auth:hook:after:create');
const debug_after_remove = require('debug')('auth:hook:after:remove');
const debug_timeout = require('debug')('auth:hook:jwt:timeout');

/**
 * After remove hook
 * @param {*} hook 
 */
async function after_remove(hook) {
    const secret = hook.app.get('authentication').secret
    const remove_reason = hook.params['reason']
    const removed = hook.service.removedTokens[hook.result.accessToken]
    let payload = null

    // Ensure this token hasn't already been removed : We must avoid firing event twice because of "authenticate" service may call remove method too
    if (removed == false) return

    // Clear token timeout
    clearTimeout(removed)
    

    // Decode JWT to get User ID
    try {
        payload = await hook.app.passport.verifyJWT(hook.result.accessToken, { "secret": secret, jwt: { ignoreExpiration: true } })
    }
    catch (err) {
        throw err
    }
    // Store this removed token in service "removed tokens"
    hook.service.removedTokens[hook.result.accessToken] = false

    // Emit logout event
    //
    // IMPORTANT: Use a specific event name 'logout user' because of event named 'logout' is already emmitted by "@feathers/authenticate".
    // and we don't want our app to listen at this default event that DO NOT contains user payload infos
    debug_after_remove('Token removed', [payload])

    // Ensure that reason of the remove method call is "token expired" : We do not want to emit logout-user in case of "logout" called explicitely by a client
    if (remove_reason == 'token expired') {
        // Emit event
        hook.service.emit('user-token-expired', { user: payload, token: hook.result })
    }
}


/**
 * After create hook
 * 
 * Notify application when token has expired
 * 
 * @param {*} hook 
 */
async function after_create(hook) {
    const app = hook.app
    const secret = app.get('authentication').secret

    // We need the payload to get token computed expiration time
    const payload = await app.passport.verifyJWT(hook.result.accessToken, { "secret": secret })

    // Compute token expiration time in ms for settimeout
    const date = new Date()
    const time = date.getTime()
    const expire = (payload.exp * 1000 - time)

    /**
     * set token expiration timeout and call auth service logout when timeout reached
     */
    hook.service.removedTokens[hook.result.accessToken] = setTimeout(async (payload, token) => {
        debug_timeout('User token timeout reached', [payload])
        // Logout user
        // IMPORTANT: Add "reason" param to identify the "remove" method was called when token expired --> Usefull in the "after remove" hook (see function above)
        await hook.app.service('authentication').remove(token, { jwt: { ignoreExpiration: true }, reason: 'token expired' })
    }, expire, payload, hook.result.accessToken)

    // Emit event
    debug_after_create('Token Timeout sets', { user: payload, token: hook.result.accessToken })
    // app.emit('login-user', { user: payload, token: hook.result.accessToken })
    hook.service.emit('login-user', { user: payload, token: hook.result.accessToken }, { connection: app.io })
}

module.exports = {
    after_create: after_create,
    after_remove: after_remove
}