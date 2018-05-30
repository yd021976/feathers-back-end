const assert = require('assert');
const app = require('../../src/app');

describe('\'google-drive\' service', () => {
  it('registered the service', () => {
    const service = app.service('google-drive');

    assert.ok(service, 'Registered the service');
  });
});
