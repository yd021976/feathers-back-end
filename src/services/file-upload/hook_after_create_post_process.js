const errors = require('@feathersjs/errors');
const fs = require('fs');
const mmMagic = require('mmmagic');
const magic = new mmMagic.Magic(mmMagic.MAGIC_MIME_TYPE); // Our mmmagic object to check file mime-type
const pdf2img = require('pdf-image').PDFImage;
/**
 * { function_description }
 *
 * @param      {<type>}   hook    The hook
 * @return     {Promise}  { description_of_the_return_value }
 */
function post_process_upload(hook) {
  var message = '';
  var allowedMimeTypes = []; // by default allow all mime types

  if (hook.data.allowedMimeTypes && Array.isArray(hook.data.allowedMimeTypes)) {
    allowedMimeTypes = hook.data.allowedMimeTypes;
  }
  // after processing, URI should contain file name.ext => rename it to full static feather url
  if (hook.result.id) {


    // ok we have a file, first check what mime-type file is
    var filePath = fs.realpathSync(hook.service.Model.path + '/' + hook.result.id);
    return new Promise((resolve, reject) => {
      magic.detectFile(filePath, function(err, result) {
        if (err) {
          throw new errors.NotAcceptable('Error while decoding file MIME-TYPE');
          reject();
        } else {
          var isAllowed = allowedMimeTypes.indexOf(result); // check if returned mime-type is allowed
          if (isAllowed != -1 || allowedMimeTypes.length == 0) { // mime-type is allowed

            // do we convert PDF to images ?
            if (result == 'application/pdf' && hook.data.convertPDF == true) {
              // if file is PDF, convert the first page to image
              return _convertToPdf(hook).then(
                (imagePath) => {
                  _buildURL(hook);
                  resolve(hook);
                },
                (error) => {
                  reject(error);
                }
              );
            } else {
              _buildURL(hook);
              resolve(hook);
            }

            // if mime type is not allowed, then delete file and send error to client
          } else {
            return _mime_type_not_allowed(hook).then(
              (result) => {
                reject(result);
              },
              (error) => {
                reject(error);
              }
            );
          }
        }
      });
    });
  }
}

function _buildURL(hook) {
  var host, port, url;
  // add new file URL that points to the feathers mount point '/uploads' so client can download image
  host = hook.app.get('host');
  port = hook.app.get('port');
  // remove any trailing "." in path
  var path = hook.service.Model.path.substr(1);
  url = 'http://' + host + ':' + port + path + '/' + hook.result.id;
  hook.result.url = url;
}

function _mime_type_not_allowed(hook) {
  // file type not allowed, delete stored file with service 'file-upload'
  return hook.app.service('file-upload').remove(hook.result.id)
    .then(
      function(result) {
        return new errors.NotAcceptable('The file type <' + result + '> is not allowed. Application only accepts PDF or IMAGES.');
      },
      function(error) {
        message = 'The file type <' + result + '> is not allowed. Application only accepts PDF or IMAGES.';
        message += '\nAnyway, the file is still stored on the server because it can\'t be delete.';
        message += '\nThe error is ' + error;
        return new errors.NotAcceptable(message);
      }
    )
}

function _convertToPdf(hook) {
  var pdfImage = new pdf2img(hook.service.Model.path + '/' + hook.result.id);

  return pdfImage.convertPage(0).then(
    function(imagePath) {
      hook.app.service('file-upload').remove(hook.result.id); // remove old uploaded pdf file
      var pathes = imagePath.split('/');
      var fileName = pathes[pathes.length-1]; // get last array item
      hook.result.id = fileName; // set result ID to new image
      return imagePath;
    },
    function(error) {
      hook.app.service('file-upload').remove(hook.result.id); // remove original uploaded file
      console.log(error);
      return error;
    });

}

// exports functions
module.exports.post_process_upload = post_process_upload;
