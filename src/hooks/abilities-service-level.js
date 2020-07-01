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
 * TODO: Retrieve abilities from "roles" service
 *
 */
async function defineAbilitiesFor(context) {
    const { rules, can } = AbilityBuilder.extract()
    const { app, params, user } = context
    const roleService = app.service('roles')
    let authorizeParams = _.pick(context.params, 'user')

    let query = {
        name: { $in: authorizeParams.user.roles },
    }

    authorizeParams.query = query
    /** set provider to 'abilities' to avoid check and load again and again abilities when calling internal services  */
    authorizeParams.provider = 'abilities'
    /** force authenticate to true to avoid authenticate service to do auth user @see authenticate hook source code*/
    authorizeParams.authenticated = true

    let roles
    try {
        roles = await roleService.find(authorizeParams)
    } catch (e) {
        throw new Error(`Can't find user roles : ${e.message}`)
    }

    /** Init abilities */
    roles.forEach((role) => {
        role.children.forEach((service) => {
            service.children.forEach((operation) => {
                /** TODO Add fields */
                if (operation.allowed === '1' || operation.allowed === 'indeterminate') can(operation.name, service.name)
            })
        })
    })

    /**
     * Exemples
     * define can with :
     */
    // can('find', ['test'], { name: 'Template toto' })
    // can('get', 'test')
    //   can('get', ['templates'], { author: user._id });
    //   can('delete', 'templates', { _id: user._id });

    return new Ability(rules, { subjectName })
}

/**
 * Main hook function that checks for user permissions
 */
module.exports = function authorize(name = null) {
    return async function (hook) {
        // const action = hook.method
        // const service = name ? hook.app.service(name) : hook.service

        /** map service method to role operation */
        const map = new Map([
            ['get', 'read'],
            ['update', 'update'],
            ['find', 'read'],
            ['remove', 'delete'],
            ['patch', 'update'],
            ['create', 'create'],
        ])
        const serviceName = name || hook.path
        const ability = await defineAbilitiesFor(hook)
        var result = null

        return
        /**
         * Permission checks function
         */
        const throwUnlessCan = (action, resource) => {
            if (ability.cannot(action, resource)) {
                throw new Forbidden(`You are not allowed to ${action} ${serviceName}`)
            }
        }

        /** check user ability */
        try {
            throwUnlessCan(map.get(hook.method), hook.path)
        } catch (e) {
            /** user not authorized to access to service/method */
            throw new Error(`Not allowed to access this resource (${hook.path}/${hook.method})`)
        }

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
}
