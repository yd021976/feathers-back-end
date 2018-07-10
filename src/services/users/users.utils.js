/**
 * Hook : get and set rolename for the user entity IF not anonymous and IF roleId field is not empty. Sets roleName to empty string else.
 */
function userRole() {
  return async function (hook) {
    var roleName = "anonymous";

    if (hook.result['role'] && (hook.result['anonymous'] == false || hook.result['anonymous'] === undefined)) {
      try {
        roleObj = await hook.app.service('roles').get(hook.result.role);
        roleName = roleObj.name;
      } catch (err) {
        // No record found for role ID
        roleName = "unknown";
      }
    }
    hook.result.role = roleName;
  }
}

module.exports = {
  userRole: userRole
}