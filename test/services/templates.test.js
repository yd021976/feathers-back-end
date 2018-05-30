const assert = require('assert');
const app = require('../../src/app');

describe('\'templates\' service', () => {
  it('registered the service', () => {
    const service = app.service('templates');

    assert.ok(service, 'Registered the service');
  });
});
