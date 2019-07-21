const errors = require('@feathersjs/errors')
const ms = require('ms');

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
    debug_after_remove('Token removed', [payload])

    // If remove reason is "token expired", emit event to notify client app that session expired (token ttl reached)
    if (remove_reason == 'token expired') {
        // Emit token expired
        hook.service.emit('user-token-expired', { user: payload, token: hook.result })
    }


    // Leave user channel
    // IMPORTANT: we don't do this in "logout" event because we want to be sure that event 'user-token-expired' is sent before leaving channel
    const channel = `auth/${payload.userId}`
    const connections = hook.app.channel(channel)
    if (connections) {
        for (connection in connections) {
            hook.app.channel(channel).leave(connection)
        }
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
    // const date = new Date()
    // const time = date.getTime()
    // const expire = (payload.exp * 1000 - time)
    const settings = hook.app.settings.auth.jwt.expiresIn
    const settings_ms = ms(settings) 
    const expiration = settings_ms >= 30000 ? settings_ms - 20000 : settings_ms
    let timeout_delay = ms(settings) - 20000 // sets timeout to expiration MINUS 20s to ensure we reach timeout BEFORE authentication module

    /**
     * set token expiration timeout and call auth service logout when timeout reached
     */
    hook.service.removedTokens[hook.result.accessToken] = setTimeout(async (payload, token) => {
        debug_timeout('User token timeout reached', [payload])
        // Logout user
        // IMPORTANT: Add "reason" param to identify the "remove" method was called when token expired --> Usefull in the "after remove" hook (see function above)
        await hook.app.service('authentication').remove(token, { jwt: { ignoreExpiration: true }, reason: 'token expired' })
    }, expiration, payload, hook.result.accessToken)

    debug_after_create('Token Timeout sets', { user: payload, token: hook.result.accessToken })
}

module.exports = {
    after_create: after_create,
    after_remove: after_remove
}