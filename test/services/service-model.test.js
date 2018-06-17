const assert = require('assert');
const app = require('../../src/app');

describe('\'serviceModel\' service', () => {
  it('registered the service', () => {
    const service = app.service('service-model');

    assert.ok(service, 'Registered the service');
  });
});
