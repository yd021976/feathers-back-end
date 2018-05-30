const users = require('./users/users.service.js');
const googleDrive = require('./google-drive/google-drive.service.js');
const templates = require('./templates/templates.service.js');
const templateCategories = require('./template-categories/template-categories.service.js');
const fileUpload = require('./file-upload/file-upload.service.js');
const fileSystem = require('./file-system/file-system.service.js');
const authentication = require('./authentication/authentication.js');

module.exports = function () {
  const app = this; // eslint-disable-line no-unused-vars
  app.configure(authentication); // Always has to be the first service
  app.configure(users);
  app.configure(googleDrive);
  app.configure(templates);
  app.configure(templateCategories);
  app.configure(fileUpload);
  app.configure(fileSystem);
};
