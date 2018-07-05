const assert = require('assert');
const app = require('../../src/app');

describe('\'service-model-db\' service', () => {
  it('registered the service', () => {
    const service = app.service('service-model-db');

    assert.ok(service, 'Registered the service');
  });
});
