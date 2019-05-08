const errors = require('@feathersjs/errors');

/* eslint-disable no-unused-vars */
class Service {
  constructor(options) {
    this.options = options || {};
  }

  /**
   * Setup service
   */
  setup(app) {
    this._app = app;
  }
  getSchema() {
    const schema = require('./service-model.schema.json');
    return schema;
  }
  /**
   * FIND : Return all available services
   */
  async find(params) {
    var serviceList = [];
    var serviceObject = {};
    var serviceSchema = null;

    for (var service of Object.keys(this._app.services)) {
      serviceSchema = null
      if (this._app.service(service)['getSchema']) {
        serviceSchema = await this._app.service(service).getSchema()
      }

      // Skip the service if it is an internal service or if it haven't a schema definition
      if (serviceSchema === null || serviceSchema['isInternalService'] == true) {
        continue
      }
      serviceObject = {
        id: service,
        name: service,
        description: serviceSchema !== null ? serviceSchema.description : '',
        schema: serviceSchema !== null ? serviceSchema : {}
      }
      serviceList.push(serviceObject);
    }
    return serviceList;
  }

  /**
   * GET : Return JSON schema for a given service
   * PARAMS :
   *    id : Service name to retrieve schema from
   *    params : object of the form 
   *      style : "json" || "flat"
   */
  async get(id, params) {
    var schema = false;
    var service = this._app.services[id];

    // Request service method "getSchema" to provide default schema
    if (service) {
      if (service['getSchema']) {
        schema = await service.getSchema();
      } else { // if service doesn't implement "getSchema" method, throw error
        throw new errors.NotImplemented(`Service ${id} doesn\'t implement data model`);
      }
    } else {
      throw new errors.NotFound(`Service ${id} doesn\'t exist`);
    }

    return schema;
  }

  async create(data, params) {
    throw new errors.NotImplemented(`Method "create" is not implemented`);
  }

  async update(id, data, params) {
    throw new errors.NotImplemented(`Method "update" is not implemented`);
  }

  async patch(id, data, params) {
    throw new errors.NotImplemented(`Method "patch" is not implemented`);
  }

  async remove(id, params) {
    throw new errors.NotImplemented(`Method "remove" is not implemented`);
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
