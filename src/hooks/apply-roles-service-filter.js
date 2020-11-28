const _ = require('lodash')

module.exports = async function (hook) {
    /** we can't process filtering if user and user roles are not set in hook */
    if (!hook.params.user || !hook.params.roles) {
        hook.app.logger(hook).warn('applyFilters/Hook not run because <user> and/or <roles> params unknown')
        return
    }
    /** find service/operation active filters */
    const activeFilters = getFilters(hook)

    switch (hook.method) {
        case 'delete':
        case 'patch':
        case 'update':
        case 'create':
            if (hook.type !== 'before') return
            executeFilters(hook, activeFilters)
            break
        case 'get':
        case 'find':
            if (hook.type !== 'after') return
            executeFilters(hook, activeFilters)
            break
        default:
            hook.app.logger(hook).error(`/applyFilters/unknown service method ${hook.method}`)
            return
    }
}

function getFilters(hook) {
    let activeFilters = []

    hook.params.roles.forEach((role) => {
        role.children.forEach((service) => {
            if (service.name === hook.path) {
                service.children.forEach((operation) => {
                    if (operation.name === hook.method) {
                        let filters = operation.filters ? operation.filters : []
                        filters.forEach((filter) => {
                            if (filter.isActive) {
                                activeFilters.push(filter)
                            }
                        })
                    }
                })
            }
        })
    })
    return activeFilters
}

function executeFilters(hook, filters) {
    let filterMethod = null
    filters.forEach((filter) => {
        filterMethod = hook.service[filter.name]
        if (_.isFunction(filterMethod)) {
            filterMethod(hook)
        } else {
            hook.app.logger(hook).warn(`Filter ${filter.name} doesn't exist in service ${hook.path} or is not a function`)
        }
    })
}
