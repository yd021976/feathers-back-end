const NeDB = require('nedb');
const path = require('path');

module.exports = function (app) {
  const dbPath = app.get('nedb');
  const Model = new NeDB({
    filename: path.join(dbPath, 'users.db'),
    autoload: true
  });

  Model.ensureIndex({ fieldName: 'email', unique: true, sparse: true });
  Model.ensureIndex({ fieldName: 'createDate', sparse: true, expireAfterSeconds: 3600 });

  return Model;
};

