module.exports = async function loadUserRoles(hook) {
    const userRoleNames = hook.params.user.roles

    const query = {
        name: { $in: userRoleNames },
    }

    const userRoles = await hook.app.service('roles').find({ query: query })
    hook.params.roles = userRoles
}
