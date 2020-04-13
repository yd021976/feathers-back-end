// A hook that logs service method before, after and error
const logger = require('winston');
const util = require('util');

module.exports = function () {
  return context => {
    // This debugs the service call and a stringified version of the hook context
    // You can customize the message (and logger) to your needs
    logger.debug(`${context.type} app.service('${context.path}').${context.method}()`);

    if (typeof context.toJSON === 'function' && logger.level === 'debug') {
      logger.debug('Hook Context', util.inspect(context, { colors: false }));
    }

    if (context.error && !context.result) {
      logger.error(context.error.stack);
    }
  }
};
