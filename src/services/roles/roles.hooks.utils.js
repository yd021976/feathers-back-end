module.exports = {
    populateServiceOperationOptions,
    ensureRoleIsUnused,
}

/**
 * check role is unused by any user
 *
 * @param {*} hook
 */
async function ensureRoleIsUnused(hook) {
    let roleObject, roleName
    const roleToRemove = hook.id
    if (!roleToRemove) return

    /** get role name */
    try {
        roleObject = await hook.service.get(roleToRemove)
        roleName = roleObject.name
    } catch (e) {
        throw e
    }
    /** get users assigned to this role */
    const query = { query: { roles: roleName } }
    const result = await hook.app.service('users').find(query)

    /** if role is assigned to a user, throw error */
    if (Array.isArray(result['data']) && result['data'].length !== 0) {
        throw new Error(`Role \"${roleName}\" is assigned to at least one user. It can not be removed.`)
    }
}

/** populate each service "operation" with service operation filter option that do not exist yet in "roles" data */
async function populateServiceOperationOptions(hook) {
    /** hook execution conditions */
    let doExecute = false
    if (hook.type === 'before' && (hook.method === 'create' || hook.method === 'update' || hook.method === 'patch')) doExecute = true
    if (hook.type === 'after' && (hook.method === 'get' || hook.method === 'find')) doExecute = true
    if (!doExecute) return

    hook.app.logger(hook).info(`hook:${hook.path}/${hook.type}/${hook.method}/populateServiceOperationOptions`)
    const availableServices = await hook.app.service('service-model').find()
    updateOperationsFilters(hook, availableServices)
}

function updateOperationsFilters(hook, availableServices) {
    let filterExist = -1,
        availableService = null,
        actionDefinition,
        availableFilters

    let results = hook.method !== 'find' ? [hook.result] : hook.result

    results.forEach((role) => {
        role.children.forEach((service) => {
            service.children.forEach((operation) => {
                /** in case role service operation filters does not exist, init it as empty array */
                if (!operation.filters) operation.filters = []

                /** get service model definition */
                availableService = availableServices.find((availableService) => {
                    return availableService.id === service.name
                })
                if (availableService) {
                    /** available service operation filters */
                    actionDefinition = availableService.schema.actions[operation.name]
                    availableFilters = actionDefinition ? actionDefinition.restrictionOptions : []

                    /** add available service model definition filters that do not exist in role-operation data */
                    if (availableFilters) {
                        /** */
                        availableFilters.forEach((availableFilter) => {
                            /** does filter exists in role operation data ? */
                            filterExist = operation.filters.findIndex((current) => {
                                return current.filterName === availableFilter.filterName
                            })

                            /** if available filter is "new", add it to the role service operation data  */
                            if (filterExist === -1) {
                                availableFilter.isActive = false /** by default this filter is inactive */
                                operation.filters.push(availableFilter)
                            }
                        })
                    }
                    /** remove old service operation filters that do not exist in service model definition anymore */
                    operation.filters.forEach((operationFilter, index) => {
                        filterExist = availableFilters.findIndex((availableFilter) => availableFilter.name === operationFilter.name)
                        /** the operation filter do not exist, remove it */
                        if (filterExist === -1) {
                            operation.filters.splice(index, 1)
                        }
                    })
                } else {
                    hook.app.logger(hook).warn(`populateServiceOperationOptions/Service ${service.name} defined in role ${role.name} does not exist anymore`)
                }
            })
        })
    })
}
