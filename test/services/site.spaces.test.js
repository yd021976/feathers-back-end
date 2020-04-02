const assert = require('assert');
const app = require('../../src/app');

describe('\'site.spaces\' service', () => {
  it('registered the service', () => {
    const service = app.service('site-spaces');

    assert.ok(service, 'Registered the service');
  });
});
