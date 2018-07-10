/**
 * Hook : get and set rolename for the user entity IF not anonymous and IF roleId field is not empty. Sets roleName to empty string else.
 */
function userRole() {
  return async function (hook) {
    var roleName = "";

    if (hook.result['roleId'] && hook.result['anonymous']==false) {
      roleName = await hook.app.service('roles').get(hook.result.roleId);
    }
    hook.result.roleName = roleName;
  }
}

module.exports = {
  userRole: userRole
}