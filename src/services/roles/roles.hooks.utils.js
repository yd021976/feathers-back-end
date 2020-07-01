const { userRole } = require('../users/users.utils')

/**
 * Before create/delete/update ACL, check user has lock
 * IMPORTANT: The lock must be acquired by the client. Feathers app will not acquire the lock
 *
 * @param {*} hook
 */
function checkUserHasLock(hook) {
    const service = hook.app.service('resources-locks')
    var hasLock = false

    // Build query for service 'resources-locks'
    let params = {}
    Object.assign(params, hook.params)

    // We must do this to get all locks
    params.query.all_owner = true
    params.user.role = 'admin'

    return service
        .find(params)
        .then((locks) => {
            let lock_infos
            Object.keys(locks).forEach((lock) => {
                lock_infos = locks[lock].lockInfos
                if (lock_infos && lock_infos.user == params.user._id && lock_infos.state == 'locked') {
                    hasLock = true
                }
            })
        })
        .catch((err) => {
            // Error occured, throw it
            throw err
        })
        .then((result) => {
            if (!hasLock) {
                throw new Error(`Resource 'ROLES' not locked. Lock is required for \"${hook.method}\"`)
            }
        })
}

/**
 * check role is unused by any user
 *
 * @param {*} hook
 */
async function ensureRoleIsUnused(hook) {
    let roleObject, roleName
    const roleToRemove = hook.id
    if (!roleToRemove) return

    /** get role name */
    try {
        roleObject = await hook.service.get(roleToRemove)
        roleName = roleObject.name
    } catch (e) {
        throw e
    }
    /** get users assigned to this role */
    const query = { query: { roles: roleName } }
    const result = await hook.app.service('users').find(query)

    /** if role is assigned to a user, throw error */
    if (Array.isArray(result['data']) && result['data'].length !== 0) {
        throw new Error(`Role \"${roleName}\" is assigned to at least one user. It can not be removed.`)
    }
}


module.exports = {
    checkUserHas_Lock: checkUserHasLock,
    ensureRoleIsUnused: ensureRoleIsUnused,
}
