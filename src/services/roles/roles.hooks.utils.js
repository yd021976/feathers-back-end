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


    return service.find(params)
        .then(locks => {
            let lock_infos
            Object.keys(locks).forEach((lock) => {
                lock_infos = locks[lock].lockInfos
                if (lock_infos && lock_infos.user == params.user._id && lock_infos.state == 'locked') {
                    hasLock = true
                }
            })
        })
        .catch(err => {
            // Error occured, throw it
            throw err
        })
        .then(result => {
            if (!hasLock) {
                throw new Error('ACL data not locked. Lock is required for ' + hook.method)
            }
        })
}

module.exports = {
    checkUserHasLock: checkUserHasLock
}