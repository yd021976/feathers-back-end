// Initializes the `users` service on path `/users`
const createService = require('feathers-nedb')
const createModel = require('../../models/users.model')
const hooks = require('./users.hooks')

module.exports = function () {
    const app = this
    const Model = createModel(app)
    const paginate = app.get('paginate')

    const options = {
        name: 'users',
        Model,
        paginate,
    }

    // Initialize our service with any options it requires
    app.use('/users', createService(options))

    // Get our initialized service so that we can register hooks and filters
    const service = app.service('users')

    // Add service method to get service schema
    service.getSchema = () => {
        const schema = require('./users.schema.json')
        return schema
    }

    /** service filters */
    service.ownerOnly = (params, results) => {
        const filteredResults = results.filter((result) => {
            return result._id === params.user._id
        })
        return filteredResults
    }
    service.hooks(hooks)
}
