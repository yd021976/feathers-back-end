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
  /**
   * FIND should return all available services
   */
  async find(params) {
    var serviceList = [];
    for (var service of Object.keys(this._app.services)) {
      serviceList.push(service);
    }
    return serviceList;
  }

  async get(id, params) {
    var schema = false;
    var service = this._app.services[id];

    // First try to get schema from db
    try {
      schema = await this._app.service('service-model-db').get(id);
    } catch (error) { }

    // If no service schema stored in DB, then request service to provide default schema
    if (schema == false) {
      if (service) {
        if (service['getSchema']) {
          schema = await service.getSchema();
        } else {
          throw new errors.NotImplemented(`Service ${id} doesn\'t implement data model`);
        }
      } else {
        throw new errors.NotFound(`Service ${id} doesn\'t exist`);
      }
    }
    return schema;
  }

  async create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }

    return data;
  }

  async update(id, data, params) {
    return data;
  }

  async patch(id, data, params) {
    return data;
  }

  async remove(id, params) {
    return { id };
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
