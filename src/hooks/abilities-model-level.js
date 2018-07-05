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
 * Transform strucutured JSON data to flat array properties list
 */
function flattenJson(data, propertyKey = "", currentPath = "", separator = ".") {
  var flattened = [];
  var subFlattened = [];
  var typeOfProperty = "", isArray = false;
  var path = "", pathToData = "";
  var flat = {
    flat: "",
    realPath: ""
  }

  for (var prop in data) {
    typeOfProperty = typeof data[prop];
    subFlattened = [];

    /**
     * 
     */
    pathToData = currentPath ? currentPath.concat(separator, prop) : prop;
    
    /**
     * Ignore ARRAYs indexes for flat representation. The real path, including Array indexes could be found in the "path" property
     */
    if (!Array.isArray(data)) {
      path = "";
      path = propertyKey ? String.prototype.concat(propertyKey, separator, prop) : prop;
      flattened[pathToData] = path;
    }
    /**
     * Recursive analysis only if "prop" of "data" is not a primitive data type
     */
    if (data.hasOwnProperty(prop) && typeOfProperty != "string" && typeOfProperty != "boolean" && typeOfProperty != "number") {
      subFlattened = flattenJson(data[prop], Array.isArray(data) ? propertyKey : prop, pathToData);
    }

    if (subFlattened.length != 0) flattened = flattened.concat(subFlattened);
    
  }
  return flattened;

}
/**
 * "after hook" : checks for user service read field level permissions
 */
function authorize_read(name = "") {
  return async function (hook) {
    // TODO: implement the "read" field permission against requested data
    const serviceName = name || hook.path;
    var ability = defineAbilitiesFor(hook.params.user, serviceName);
    var abilityProperty = "";
    var regexPath = "";
    var flatted_data = flatJSON(hook.result);
    var unflatted_data = unflatJSON(flatted_data);
    
    for (var jsonProperty in flatted_data) {
      // Compute flat string without array squared bracket for ability testing
      if (!ability.can('read', jsonProperty)) {

      }
    }
    return hook;
  }
}

/**
 * "before hook" : checks for user service update field level permissions
 */
function authorize_update(name = "") {
  return async function (hook) {
    const serviceName = name || hook.path;
    var ability = defineAbilitiesFor(hook.params.user, serviceName);
    var data = flattenJson(hook.data);
  }
}

module.exports = {
  authorize_read: authorize_read,
  authorize_update: authorize_update
}