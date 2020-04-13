const { authenticate } = require('@feathersjs/authentication').hooks;
const commonHooks = require('feathers-hooks-common');
// const { restrictToOwner } = require('feathers-authentication-hooks');
const { setField } = require('feathers-authentication-hooks');
const { hashPassword } = require('@feathersjs/authentication-local').hooks;
const user_hooks = require('./users.utils');

/**
 * Restrictions applied in order :
 * 1 - Auth users
 * 2 - check user has role 'admins' => can get/find/update/remove/create any users
 * 3 - check auth user is the owner =>  can get/find/update/remove its own user object
 */
const restrict = [
  authenticate('jwt'),
  commonHooks.iff(
    !user_hooks.isAdmin(),

    // Not an admin, auth user must be the owner

    /** deprecated : upgrade feathersjs from v3 to v4 */
    // restrictToOwner({
    //   idField: '_id',
    //   ownerField: '_id'
    // })

    /** upgraded feathersjs v4 code */
    setField({ from: 'params.user._id', as: 'params.query._id' })
  )
];

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt')],
    get: [...restrict],
    // Only auth users having role 'admins' can create users
    create: [authenticate('jwt'), commonHooks.iff(
      !user_hooks.isAdmin(),
      // Not an admin, throw error
      () => { throw new Error('You must be \'admin\' to create new user') }
    )
      , hashPassword('password')],
    update: [...restrict, hashPassword('password')],
    patch: [...restrict, hashPassword('password')],
    remove: [commonHooks.iff(user_hooks.isLoggedInUser(), () => { throw new Error('Removing user that is currently loggedin is forbidden') }), ...restrict]
  },

  after: {
    all: [
      commonHooks.when(
        hook => hook.params.provider,
        commonHooks.discard('password')
      )
    ],
    find: [
      // Sort users by _id ASC
      user_hooks.sortByIdAsc()
    ],
    get: [
      // user_hooks.userRole()
    ],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
