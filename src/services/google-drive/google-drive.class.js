const googleapis = require("googleapis");
/* eslint-disable no-unused-vars */
class Service {
  constructor(options) {
    this.options = options || {};
    this.events = ['googleService-get-progress'];
  }

  setup(app) {
    // auth client
    var _this = this;

    // Properties of this service
    _this.socket = app.io;
    _this.googleapis = null;


    // Processing
    return new Promise(function (resolve, reject) {
      // Init google api
      var key = require('./tigrou-project-40dd3c8bf23c.json');

      var jwtClient = new googleapis.auth.JWT(
        key.client_email,
        null,
        key.private_key, [
          "https://www.googleapis.com/auth/drive"
        ], // an array of auth scopes
        null
      );

      /**
       * Authenticate google service account
       */
      jwtClient.authorize(function (err, tokens) {
        if (err) {
          console.log(err);
          reject(err);
          //return;
        } else {
          console.log('Google drive service account authorized');
          resolve(true);
          _this.jwtClient = jwtClient;

          // Construct google drive object
          var drive = googleapis.drive({ version: 'v3', auth: _this.jwtClient });
          _this.googleDrive = drive;
        }
      });
    });
  }
  find(params) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.googleDrive.files.list({
        q: "trashed=false",
        fields: 'files'
      }, function (err, resp) {
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  }

  /**
   * { function_description }
   *
   * @param      {string}   id      The folderId parents of file must be in
   * @param      {<type>}   params  The parameters
   * @return     {Promise}  { description_of_the_return_value }
   */
  get(id, params) {
    var _this = this;
    // this.socket.emit('googleService-get-progress', { state: "begin" });
    this.emit('googleService-get-progress', { state: "begin" });
    return new Promise(function (resolve, reject) {
      var ParentQuery = "parents in \"" + id + "\"";
      var query = "trashed=false";

      // if folderId is set and not empty get files with parent in folderId param
      if (id != '') {
        query = query + " and " + ParentQuery;
      }
      _this.googleDrive.files.list({ q: query, fields: 'files' }, function (err, resp) {
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  }

  create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current)));
    }

    return Promise.resolve(data);
  }

  update(id, data, params) {
    return Promise.resolve(data);
  }

  patch(id, data, params) {
    return Promise.resolve(data);
  }

  remove(id, params) {
    return Promise.resolve({ id });
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
