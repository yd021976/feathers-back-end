const assert = require('assert');
const app = require('../../src/app');

describe('\'template_categories\' service', () => {
  it('registered the service', () => {
    const service = app.service('template-categories');

    assert.ok(service, 'Registered the service');
  });
});
