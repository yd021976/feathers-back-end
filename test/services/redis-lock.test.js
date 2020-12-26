const assert = require('assert');
const app = require('../../src/app');

describe('\'redis-lock\' service', () => {
  it('registered the service', () => {
    const service = app.service('redis-lock');

    assert.ok(service, 'Registered the service');
  });
});
