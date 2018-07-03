/* eslint-disable no-unused-vars */
class Service {
  constructor(options) {
    this.options = options || {};
  }

  async find(params) {
    return [];
  }

  async get(id, params) {
    // return
    // [
    //   { "item 1": 1 },
    //   { "item 2": 2 }
    // ]
    return {
      "foo": {
        "bar": "foo.bar value"
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
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
