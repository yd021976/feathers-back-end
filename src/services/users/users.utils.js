/**
 * Hook : get and set rolename for the user entity IF not anonymous and IF roleId field is not empty. Sets roleName to empty string else.
 */
function userRole() {
    return async function (hook) {
        var roleName = 'anonymous'

        if (hook.result['role'] && (hook.result['anonymous'] == false || hook.result['anonymous'] === undefined)) {
            try {
                roleObj = await hook.app.service('roles').get(hook.result.role)
                roleName = roleObj.name
            } catch (err) {
                // No record found for role ID
                roleName = 'unknown'
            }
        }
        hook.result.role = roleName
    }
}
function sortByNameAsc() {
    return (hook) => {
        let comp
        hook.result.data.sort((a, b) => {
            comp = a.name < b.name ? -1 : a.name == b.name ? 0 : 1
            return comp
        })
    }
}
function isLoggedInUser() {
    return (hook) => {
        if (hook.params.user._id == hook.id) {
            return true
        } else {
            return false
        }
    }
}

function isAdmin() {
    return (hook) => {
        if (!hook.params.user || !hook.params.user['roles']) return false
        if (!hook.params.provider) return true /** internal service calls do not have to check this */

        const index = hook.params.user.roles.findIndex((role) => role == 'admins')
        return index === -1 ? false : true
    }
}

module.exports = {
    userRole: userRole,
    isAdmin: isAdmin,
    isLoggedInUser: isLoggedInUser,
    sortByNameAsc: sortByNameAsc,
}
