/**
 * { function_description }
 *
 * @param      {<type>}  hook    The hook
 */
function pre_process_upload(hook) {
  // check user ID is set
  if (!hook.params.user || hook.params.user._id == "") {
    throw new errors.NotAuthenticated('User not authenticated or <user> params not correctly sets.');
  }

  // set store path relative to "./uploads"
  if (hook.data.path) {
    hook.service.Model.path = './uploads/' + hook.params.user._id + '/' + hook.data.path;
  } else {
    hook.data.path = '';
  }

  // check that param "allowedMimeTypes" is an array or null
  if (hook.data.allowedMimeTypes && !Array.isArray(hook.data.allowedMimeTypes)) {
    throw new errors.NotAcceptable('Param <allowedMimeTypes> must be an array. Value received : ' + hook.data.allowedMimeTypes);
  }
  if (!hook.data.uri && hook.params.file) {
    const file = hook.params.file;
    const uri = dauria.getBase64DataURI(file.buffer, file.mimetype);
    hook.data = { uri: uri };
  } else {
    // Check request contains data, fallback to error if no URI or no file to proceed
    if (!hook.data.uri) {
      throw new errors.BadRequest('No file data to process');
    }
  }
}

// exports functions
module.exports.pre_process_upload = pre_process_upload;
