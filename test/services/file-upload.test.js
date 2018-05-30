const assert = require('assert');
const app = require('../../src/app');

describe('\'file-upload\' service', () => {
  it('registered the service', () => {
    const service = app.service('file-upload');

    assert.ok(service, 'Registered the service');
  });
});
