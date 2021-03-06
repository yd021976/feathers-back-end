/**
 * 
 * Hook : Field access permission for a service model
 * 
 * This hook "abilities" is ONLY used to check user/role abilities (i.e. Permissions) at service model level.
 * It will check user/role field permissions for a given service.
 * 
 * !!! IMPORTANT !!!
 * 1 - You must use any service level access before this hook field permissions
 * 2 - Only two permissions available : 
 *    "read" : User can/cannot read a field data (if no permission, then the data will be cleared)
 *    "update" : User can/cannot update field data
 * 
 * For example : User has "update" permission for service model field "Status"
 * 
 * 
 */


const { Ability, AbilityBuilder } = require('@casl/ability');
const { permittedFieldsOf } = require('@casl/ability/extra');
const TYPE_KEY = Symbol.for('type');
const { Forbidden } = require('@feathersjs/errors');
const flatJSON = require('flatnest').flatten;
const unflatJSON = require('flatnest').nest;
/**
 * Retrieve "subject" from hook result/data (i.e. The service name)
 */
function subjectName(subject) {
  if (!subject || typeof subject === 'string') {
    return subject
  }
  const subjectType = subject[TYPE_KEY];
  return subjectType;
}


/**
 * Build abilities
 * TODO: Retrieve abilities from a "roles" service or whatever
 * 
 */
function defineAbilitiesFor(user, service = '') {
  const { rules, can } = AbilityBuilder.extract();

  can('read', ['foo', 'foo.bar']);
  can('update', ['foo']);

  return new Ability(rules);
}

/**
 * "after hook" : checks for user service read field level permissions and mask/clear data value for forbidden fields
 */
function authorize_read(name = "") {
  return async function (hook) {
    const serviceName = name || hook.path;
    var ability = defineAbilitiesFor(hook.params.user, serviceName);
    var property = "";
    var flattened_data = flatJSON(hook.result);

    for (var jsonProperty in flattened_data) {
      // Compute flat string without array squared bracket for ability testing
      property = jsonProperty.replace(/\[[0-9]*\]/, "");

      if (!ability.can('read', jsonProperty)) {
        flattened_data[jsonProperty] = ""; // clear data
      }
    }
    hook.result = unflatJSON(flattened_data);
    return hook;
  }
}

/**
 * "before hook" : checks for user service PATCH field level permissions -> Patch method tries to update only certain fields
 * NOTE : Update method should not be checked with this hook as update method should replace all fields ==> Must be checked at "service-level" hook
 */
function authorize_update(name = "") {
  return async function (hook) {
    const serviceName = name || hook.path;
    var ability = defineAbilitiesFor(hook.params.user, serviceName);
    var data = flatJSON(hook.data);
    for (var property in data) {
      if (ability.cannot('update', property)) {
        throw new Forbidden(`You are not allowed to update field ${property} of model ${serviceName}`);
      }
    }
  }
}

module.exports = {
  authorize_read: authorize_read,
  authorize_update: authorize_update
}