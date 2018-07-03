/**
 * 
 * 
 * This hook "abilities" is ONLY used to check user/role abilities (i.e. Permissions) at service level.
 * It will only check user/role access/permissions to a service action.
 * 
 * For example : User has "create" permission for service "file-system"
 * 
 * 
 */


const { Ability, AbilityBuilder } = require('@casl/ability');
const { permittedFieldsOf, rulesToQuery } = require('@casl/ability/extra');
const TYPE_KEY = Symbol.for('type');
const { Forbidden } = require('@feathersjs/errors');

// Ability.addAlias('update', 'patch');
// Ability.addAlias('read', ['get', 'find']);
// Ability.addAlias('remove', 'delete');

function ruleToQuery(rule) {
  return rule.inverted ? { $not: rule.conditions } : rule.conditions;
}


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
 * TODO: Retrieve abilities from a "roles" service
 * 
 */
function defineAbilitiesFor(user) {
  const { rules, can } = AbilityBuilder.extract();

  can('find', ['test'], { name: 'Template toto' });
  can('get', 'test');

  // if (user) {
  //   can('get', ['templates'], { author: user._id });
  //   can('delete', 'templates', { _id: user._id });
  // }

  return new Ability(rules, { subjectName });
}

/**
 * Main hook function that checks for user permissions
 */
module.exports = function authorize(name = null) {
  return async function (hook) {
    var query;
    const action = hook.method;
    const service = name ? hook.app.service(name) : hook.service;
    const serviceName = name || hook.path;
    const ability = defineAbilitiesFor(hook.params.user);
    var result = null;

    /**
     * Permission checks function
     */
    const throwUnlessCan = (action, resource) => {
      if (ability.cannot(action, resource)) {
        throw new Forbidden(`You are not allowed to ${action} ${serviceName}`);
      }
    }

    hook.params.ability = ability;
    switch (action) {
      case "find":
        Object.assign(hook.params.query, rulesToQuery(ability, action, serviceName, ruleToQuery));
        return hook;

      case "create":
        hook.data[TYPE_KEY] = serviceName;
        throwUnlessCan('create', hook.data);
        break;

      default:
        const params = Object.assign({}, hook.params, { provider: null });
        result = await service.get(hook.id, params);
        result[TYPE_KEY] = serviceName;
        throwUnlessCan(action, result);
        break;
    }
  }
}