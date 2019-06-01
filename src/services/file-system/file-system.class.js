/* eslint-disable no-unused-vars */
const fs = require('fs');
const blobFs = require("fs-blob-store");
const path = require('path');
const util = require('util');
const routeParser = require('route-parser');
/**
 * Default routes
 */
const defaultRoute = [{
  "public": {
    "path": "/public/*child",
    "param": null,
    "requireAuth": false,
    "roles": ["ALL"]
  }
}]

class Service {
  constructor(options) {
    this.options = options || { "routes": defaultRoute };

    /**
     * Create the availables routes
     */
    var routeDefinition;
    this.options.routes.forEach(route => {
      route.parser = new routeParser(path.join(this.options.root, route.path));
    });

    /**
     * Create a new BlobService to get/delete/read files
     */
    const blobService = require("feathers-blob");
    const blobStorage = blobFs("./uploads");
    this.blobService = blobService({ Model: blobStorage });
  }
  /**
   * Get schema definition for this service
   */
  getSchema() {
    const schema = require('./file-system.schema.json');
    return schema
  }
  /**
   * Define access permissions for casl/abilities library
   */
  capabilities() {
    return {}
  }

  /**
   * 
   */
  setup(app, path) {
    this.app = app;
  }
  _readdir(path) {
    return (util.promisify(fs.readdir))(path);
  }

  /**
   * Clean path by removing trailing root file system from path
   */
  _cleanPath(path) {
    var rexp = new RegExp('^' + this.options.root);
    var clean_path = path.replace(rexp, '');
    if (clean_path == '') clean_path = '/';
    return clean_path;
  }

  /**
   * Check if ressource should be excluded (@see routes definition)
   */
  _isExcluded(routeConfig, ressource, isFile) {
    if (!isFile) return false; // Do not treat folders because they're protected against pathes config (@see hook handleRequestedPath)
    if (!routeConfig['excludes']) return false; // if no excludes options in route config, return false (no exclusion)

    var rexp = null, rexp_test = false;
    routeConfig.excludes.every(excludeItem => {
      rexp = new RegExp(excludeItem);
      rexp_test = rexp.test(ressource);
      return !rexp_test; // exit loop on first found exclude
    });

    return rexp_test; // return boolean : true if ressource is excluded, false if not
  }
  /**
   * List files and folders from root '/uploads'
   * 
   * @param {any} params Not used because the requested path (params.query.path) is controlled, computed and validated by hook "handleRequestedPath".
   *                     INSTEAD use params.matchedRoute that is updated by the hook
   * @returns 
   * @memberof Service
   */
  find(params) {
    // return Promise.resolve([]);
    var files = [], fileStats, filePath = '', fileParse, isFile = false, rexp;
    var pathName, pathValue, currentPath = params.matchedRoute.fullPath;
    /**
     * Sets requested path to read
     */
    return this._readdir(currentPath)
      .then(
        data => {

          data.forEach((file, index) => {
            filePath = path.join(currentPath, file);
            fileStats = fs.lstatSync(filePath);
            isFile = fileStats.isFile();

            fileParse = path.parse(filePath);
            fileParse.dir = this._cleanPath(fileParse.dir);

            /**
             * Check route config excludes options
             * if "file" is not excluded, add it to the results
             */
            if (!this._isExcluded(params.matchedRoute.route, file, isFile)) {
              files.push({
                "path": fileParse,
                "isFile": isFile
              });
            }
          })

          /**
           * Return response
           */
          return {
            "path": params.matchedRoute.path,
            "files": files
          };
        }
      )
      .catch(error => {
        throw new Error('Path \'' + currentPath + '\' : Access denied or path doesn\'t exist');
      })
  }

  get(id, params) {
    return this.blobService.get(id);
  }

  create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current)));
    }

    return Promise.resolve(data);
  }

  /**
   * 
   * @param {*} id 
   * @param {*} params 
   */
  remove(id, params) {
    return this.blobService.remove(id);
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
