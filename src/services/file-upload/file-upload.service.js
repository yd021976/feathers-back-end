// Initializes the `file-upload` service on path `/file-upload`
// 
// 
// 
// Service Methods specific parameters added from original 'feathers-blob' service
// 
// CREATE :
//    > AllowedMimeTypes : [Array] of restricted mime type that will be accepted
//    > path : [String] the path to store file, is relative to the root './uploads' and MUST NOT contains trailing and leading '/'
//    > convertToPDF : [boolean] set to true if you want to convert PDF into image. Note: Only the first PDF page will be converted
// 
// const createService = require('./file-upload.class.js');
const hooks = require('./file-upload.hooks');

const blobService = require("feathers-blob");
const fs = require("fs-blob-store");
const blobStorage = fs("./uploads");
const multer = require('multer');
const multipartMiddleware = multer();

module.exports = function() {
  const app = this;
  const paginate = app.get('paginate');

  const options = {
    name: 'file-upload',
    paginate
  };


  // Initialize our service with any options it requires
  // app.use('/file-upload', blobService({ Model: blobStorage }));
  app.use(
    '/file-upload',
    // multer parses the file named 'uri'.
    // Without extra params the data is
    // temporarely kept in memory
    multipartMiddleware.single('uri'),
    // another middleware, this time to
    // transfer the received file to feathers
    function(req,res,next){
        req.feathers.file = req.file;
        next();
    },
    blobService({ Model: blobStorage })
  );

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('file-upload');

  service.hooks(hooks);
};
