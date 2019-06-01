const assert = require('assert');
const app = require('../../src/app');

describe('\'resources_locks\' service', () => {
  it('registered the service', () => {
    const service = app.service('resources-locks');

    assert.ok(service, 'Registered the service');
  });
});
