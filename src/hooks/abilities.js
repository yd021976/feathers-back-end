const { Ability, AbilityBuilder } = require('@casl/ability');
const TYPE_KEY = Symbol.for('type')
const { Forbidden } = require('@feathersjs/errors');

Ability.addAlias('update', 'patch');
Ability.addAlias('read', ['get', 'find']);
Ability.addAlias('remove', 'delete');

function subjectName(subject) {
  if (!subject || typeof subject === 'string') {
    return subject
  }

  return subject[TYPE_KEY]
}

function defineAbilitiesFor(user) {
  const { rules, can } = AbilityBuilder.extract()

  can('read', ['file-system']);

  if (user) {
    can('manage', ['file-system'], { author: user._id });
    can(['read', 'update'], 'file-system', { _id: user._id });
  }

  return new Ability(rules, { subjectName });
}

module.exports = function authorize(name = null) {
  return function (hook) {
    const action = hook.method
    const service = name ? hook.app.service(name) : hook.service
    const serviceName = name || hook.path
    const ability = defineAbilitiesFor(hook.params.user)
    const throwUnlessCan = (action, resource) => {
      if (ability.cannot(action, resource)) {
        throw new Forbidden(`You are not allowed to ${action} ${serviceName}`)
      }
    }

    hook.params.ability = ability

    if (hook.method === 'create') {
      hook.data[TYPE_KEY] = serviceName;
      throwUnlessCan('create', hook.data);
    }
  }
}