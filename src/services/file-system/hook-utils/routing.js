const node_path = require('path');
const node_fs = require('fs');
const authenticate = require('@feathersjs/authentication').hooks.authenticate;

/**
 *                    Main hook function
 * 
 * This hook validates requested path against service routes definition
 * 
 * @param {any} context 
 * @returns {any} Update "context.params.matchedRoute" (@see matchedRoute) in main function "handleRequestedPath"  
 */
function handleRequestedPath() {
  return function (context) {
    /**
     * main variables
     */
    var
      requestedPath = context.params.query.path, // The requested oath
      routes = context.service.options.routes, // The service routes definition parser
      rootPath = context.service.options.root, // The service root path
      authUser = false, // Auth user
      matchedRoute =  // Contains info of matched route against requested path ==> will be stored in context.params.matchedRoute
        {
          requestedPath: '', // The requested path that matches the route
          fullPath: '', // The file system path to the requested path (@see requestedPath)
          routeIndex: -1, // Service toutes matched index
          route: {}, // The found service route object
          match: {}, // route-parser "match" method resuts (@see https://github.com/rcs/route-parser)
          user: false // Auth user
        };

    /**
     * Check if we match a route
     */
    var auth = context.app.get('user');
    matchedRoute = checkRoute(requestedPath, routes, rootPath); // Will throw error if no match

    /**
     * Check route is allowed
     */
    checkRestrictedRoute(matchedRoute);

    /**
     * Check if user need to be authenticated
     */
    if (checkAuthRequired(matchedRoute, context.params)) {
      matchedRoute.user = context.params['user'] ? context.params['user'] : { _id: '' };
      /**
       * If path MUST belong to user by config, check that the requested path "belong" to user (i.e The folder name is user ID)
       */
      checkUserParam(matchedRoute);

      /**
       * Check the path really exists in file system
       */
      checkPathExist(matchedRoute);

      /**
       * Update query param with matched route
       */
      context.params.matchedRoute = matchedRoute;

      return context;
    } else {
      throw Error('You\'re not allowed to access this path');
    }

  }

}

/**
 * Check if requested url match an allowed route
 * 
 * @param {*} path 
 * @param {*} routes 
 */
function checkRoute(requestedPath = '/', routes, rootPath) {
  var match = false, routeIndex = -1, foundRoute = {};
  var path = node_path.join(rootPath, requestedPath);
  var realPath = node_path.resolve(path);

  routes.every((route, index) => {
    match = route.parser.match(path);
    if (match) {
      routeIndex = index;
      foundRoute = route;
      return false; // exit when route is found
    }
    return true;
  });

  if (!match) throw new Error('Path \'' + path + '\' is not allowed.');
  return {
    "requestedPath": requestedPath,
    "fullPath": realPath,
    "routeIndex": routeIndex,
    "route": foundRoute,
    "match": match,
  };
}

/**
 * Check access to route is allowed by config
 */
function checkRestrictedRoute(matchedRoute) {
  if (matchedRoute['forbidden']) throw new Error("Path \'" + matchedRoute.requestedPath + "\' is not allowed.");
}


/**
 * Check that matched route path exists in file system
 */
function checkPathExist(matchedRoute) {
  var pathExist = node_fs.statSync(matchedRoute.fullPath);
  return pathExist;
}

/**
 * If matched route needs auth user : Check user is authenticated to access the matched route
 * @returns boolean returns false if route require auth user and no user is authenticated, otherwise returns "true"
 */
function checkAuthRequired(matchedRoute, params) {
  var auth = false;
  if (matchedRoute.route['requireAuth'] && matchedRoute.route['requireAuth'] == true) {
    auth = params.authenticated;
  } else {
    auth = true; // No auth user is required
  }
  return auth;
}

/**
 * For routes build on user ID, check that the authenticated user is the "owner" of the folder
 * i.e. The folder name must be the user ID
 */
function checkUserParam(matchedRoute) {
  if (matchedRoute.route.param == "AUTH_USER") {
    if (matchedRoute.match.user != matchedRoute.user._id) {
      throw new Error("You are not allowed to access this path.");
    }
  }
  return true;
}

module.exports.handleRequestedPath = handleRequestedPath;