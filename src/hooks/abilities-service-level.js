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

const { Ability, AbilityBuilder } = require('@casl/ability')
const { permittedFieldsOf, rulesToQuery } = require('@casl/ability/extra')
const TYPE_KEY = Symbol.for('type')
const { Forbidden } = require('@feathersjs/errors')
const _ = require('lodash')

// Ability.addAlias('update', 'patch');
// Ability.addAlias('read', ['get', 'find']);
// Ability.addAlias('remove', 'delete');

function ruleToQuery(rule) {
    return rule.inverted ? { $not: rule.conditions } : rule.conditions
}

/**
 * Retrieve "subject" from hook result/data (i.e. The service name)
 */
function subjectName(subject) {
    if (!subject || typeof subject === 'string') {
        return subject
    }
    const subjectType = subject[TYPE_KEY]
    return subjectType
}

/**
 * Build abilities
 */
async function defineAbilitiesFor(roles) {
    const { rules, can } = AbilityBuilder.extract()

    /** Init abilities */
    roles.forEach((role) => {
        role.children.forEach((service) => {
            service.children.forEach((operation) => {
                /** TODO Add fields */
                if (operation.allowed === '1' || operation.allowed === 'indeterminate') can(operation.name, service.name)
            })
        })
    })

    return new Ability(rules, { subjectName })
    /**
     * Exemples of what we can define with 'can' :
     
      can('find', ['test'], { name: 'Template toto' })
      can('get', 'test')
      can('get', ['templates'], { author: user._id });
      can('delete', 'templates', { _id: user._id });
      
    */
}

/**
 * Main hook function that checks for user permissions
 */
module.exports = async function authorize(hook) {
    /** map service method to role operation */
    const map = new Map([
        ['get', 'read'],
        ['update', 'update'],
        ['find', 'read'],
        ['remove', 'delete'],
        ['patch', 'update'],
        ['create', 'create'],
    ])
    const serviceName = hook.path
    const ability = await defineAbilitiesFor(hook.params.roles)
    hook.params.abilities = ability
    var result = null

    return /**TODO do service access checks */

    // const action = hook.method
    // const service = name ? hook.app.service(name) : hook.service
    /**
     * Permission checks function
     */
    // const throwUnlessCan = (action, resource) => {
    //     if (ability.cannot(action, resource)) {
    //         throw new Forbidden(`You are not allowed to ${action} ${serviceName}`)
    //     }
    // }

    // /** check user ability */
    // try {
    //     throwUnlessCan(map.get(hook.method), hook.path)
    // } catch (e) {
    //     /** user not authorized to access to service/method */
    //     throw new Error(`Not allowed to access this resource (${hook.path}/${hook.method})`)
    // }

    // hook.params.ability = ability
    // switch (action) {
    //     case 'find':
    // Object.assign(hook.params.query, rulesToQuery(ability, action, serviceName, ruleToQuery))
    //         return hook

    //     case 'create':
    //         hook.data[TYPE_KEY] = serviceName
    //         throwUnlessCan('create', hook.data)
    //         break

    //     default:
    //         const params = Object.assign({}, hook.params, { provider: null })
    //         result = await service.get(hook.id, params)
    //         result[TYPE_KEY] = serviceName
    //         throwUnlessCan(action, result)
    //         break
    // }
}
