/* eslint-disable no-unused-vars */
class Service {
  constructor(options) {
    this.options = options || {};
  }

  async find(params) {
    return [];
  }

  async get(id, params) {
    return {
      "foo": {
        "bar1": "foo.bar value",
        "bar2": {
          "bar3": "test depth 3"
        }
      },
      "bar": "bar value",
      "namedArray": [
        { "toto": 1, "titi": 2 },
        { "toto": 3, "titi": 4 }
      ]
    }
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

  /**
   * Return the JSON schema of this service
   */
  async getSchema() {
    const schema = require('./test.schema.json');
    return schema;
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
