const assert = require('assert');
const app = require('../../src/app');

describe('\'file-system\' service', () => {
  it('registered the service', () => {
    const service = app.service('file-system');

    assert.ok(service, 'Registered the service');
  });
});
