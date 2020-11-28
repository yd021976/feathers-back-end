module.exports = function (resourceName) {
    return async (hook) => {
        let isLocked = false
        /** check user has a lock for the requested resource */
        const lockService = hook.app.service('resources-locks')
        try {
            const lock = await lockService.get(resourceName, { user: hook.params.user })
        } catch (e) {
            if (e.className === 'lockAlreadyAcquired') isLocked = true
        }

        if (isLocked === false) {
            throw new Error(`Resource ${resourceName} must be locked to modifiy data`)
        }
    }
}
