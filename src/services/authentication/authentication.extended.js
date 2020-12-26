const { AuthenticationService } = require('@feathersjs/authentication');
const ms = require('ms');
const debug = require('debug')('authentication:tigrou');
const errors = require('@feathersjs/errors');


/**
 * Customized authenticate service to handle token expiration and to send event when token expiration occurs 
 */
class tigrouAuthenticationService extends AuthenticationService {
    static token_expired_reason = 'token expired'
    static token_expired_event = 'user-token-expired'
    static channel_prefix = 'authenticate'

    /** List of removed tokens */
    /** TODO: Implement a persistant storage for removed token like REDIS to do this because of restart of server will clear this in-memory storage */
    removedTokens = []

    constructor(app, configKey) {
        super(app, configKey)
        this.events = [tigrouAuthenticationService.token_expired_event]
    }

    /**
     * 
     * @param {*} id 
     * @param {*} params 
     */
    create(id, params) {
        return super.create(id, params)
            .then((result) => {
                debug('Token created')

                /** Check token is not already "expired" */
                var token_state = this.removedTokens[result.accessToken]
                if (token_state === false) throw new errors.NotAuthenticated('Invalid token')

                /** Register token and set timeout if the token is a new one */
                if (token_state === undefined) {
                    this._setTimeout(result, params)
                }
                return result
            })
            .catch((err) => {
                throw err
            })
    }

    /**
     * 
     * @param {*} id 
     * @param {*} params 
     */
    remove(id, params) {
        /** First, call parent class "remove" method */
        return super.remove(id, params)
            .then((result) => {
                this._handleTokenExpiration(result, params)
                return result
            })
            .catch((err) => {
                throw err
            })
    }

    setup(path, app) {
        // call original service setup method
        super.setup(path, app)

        // Check token expiration duration is > 1 minute
        const expiration = ms(this.configuration.jwtOptions.expiresIn)
        if (ms < 60000) throw new Error('JWT expriation must be higher than 60 secondes')


        /** Configure service publisher */
        this.publish(tigrouAuthenticationService.token_expired_event, (event_data) => {
            if (!event_data.data.user) return

            const channel = `${tigrouAuthenticationService.channel_prefix}/${event_data.data.user._id}`
            return this.app.channel(channel)
        })
    }

    /**
     * 
     * @param {*} result 
     * @param {*} params 
     */
    _setTimeout(result, params) {
        const expiration_setting = this.configuration.jwtOptions.expiresIn
        const settings_ms = ms(expiration_setting)
        const expiration = settings_ms >= 30000 ? settings_ms - 20000 : settings_ms

        debug('Set token timeout in ms', expiration)
        /** init timeout for token expiration */
        this.removedTokens[result.accessToken] = setTimeout(() => {
            debug('Token expired. Try to remove token', [result.accessToken, params.user])
            /** Build params for call authentication service remove method */
            params["authentication"] = { accessToken: result.accessToken, strategy: 'jwt' }
            params.user = result.user
            params.reason = tigrouAuthenticationService.token_expired_reason
            return this.remove(null, params).then((result) => {
                /** Leave user channel
                 * IMPORTANT: we don't do this in "logout" event because we want to be sure that event 'user-token-expired' is sent before leaving channel
                 */
                const channel = `${tigrouAuthenticationService.channel_prefix}/${params.user._id}`
                const connections = this.app.channel(channel)
                if (connections.length != 0) {
                    /** Loop over all user connections and leave it */
                    for (var connection of connections.connections) {
                        debug('Token timed out and removed: Leave connection', [connection])
                        this.app.channel(channel).leave(connection)
                    }
                }
            })
        }, expiration, params);
    }


    /**
     * 
     * @param {*} result 
     * @param {*} params 
     */
    _handleTokenExpiration(result, params) {
        const remove_reason = params['reason'] // "reason" is set when token is removed by settimeout in hook "after_create"
        const token = result.accessToken // token that is removed
        const removed = this.removedTokens[token] // get the removed token state (timeout function or false if already removed)

        // If token has already been removed (i.e. in case of "logout") or do not exists, do nothing
        if (removed === false || removed === undefined) return

        // Clear token timeout function
        clearTimeout(removed)
        this.removedTokens[token] = false

        // If remove reason is "token expired", emit event to notify client app that session expired (token ttl reached)
        if (remove_reason == tigrouAuthenticationService.token_expired_reason) {
            debug('Token expired and removed. Emit event to client', [token])
            /** 
             * Emit event "token expired". 
             * Note that we MUST await event to publish because we remove all user connection to the channel after publishing this event
             * */
            this.emit(tigrouAuthenticationService.token_expired_event, { data: result })
        }
    }
}
exports.tigrouAuthenticationService = tigrouAuthenticationService

