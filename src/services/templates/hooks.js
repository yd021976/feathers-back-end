/**
* @description Delete old img in /uploads folder by calling <file-uploads> service
* @param {any} hook 
* @returns 
*/
function manageUploadsTemplates(hook) {
  // TODO: implement this feature if needed with angular-materialUI project
  return;
  
  // do nothing if no Template ID is provided
  if (hook.id == '') return;

  var fuService = hook.app.service('file-upload');
  var tplService = hook.app.service('templates');
  var currentTplObjects = [], currentFileId = '';
  var newTplObjects = hook.data.objects.objects, newFileId = '';
  var url = [];

  // compute new/updated image file ID
  newTplObjects.forEach((element) => {
    if (element.type == 'image') {
      if (element.src.substr(0, 4) == 'http') {
        url = element.src.split('/');
        newFileId = url[url.length - 1];
      }
    }
  });

  // Get current stored template image and delete from file system
  return new Promise((resolve, reject) => {
    tplService.get(hook.id).then(
      (tpl) => {

        // Compute current template image file ID
        url = []; currentFileId = "";
        currentTplObjects = tpl.objects.objects;
        currentTplObjects.forEach(element => {
          if (element.type == "image") {
            // get file name only on HTTP src image (i.e. Do nothing with base64UrlEncoded URL)
            if (element.src.substr(0, 4) == 'http') {
              url = element.src.split('/');
              currentFileId = url[url.length - 1];
            }
          }
        });

        // Remove old image file from FS if new/updated template image file ID is changed
        if (currentFileId != "" && currentFileId != newFileId) {
          fuService.remove(currentFileId).then(
            (result) => {
              resolve();
            },
            (error) => {
              reject(error);
            });
        } else {
          resolve();
        }
      },
      // Tpl ID not found
      (error) => {
        reject(error);
      });
  });
}

module.exports.manageUploadsTemplates = manageUploadsTemplates; 