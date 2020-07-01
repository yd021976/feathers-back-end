const { authenticate } = require('@feathersjs/authentication').hooks;
const commonHooks = require('feathers-hooks-common');
// const { restrictToOwner } = require('feathers-authentication-hooks');
const { setField } = require('feathers-authentication-hooks');
const { hashPassword } = require('@feathersjs/authentication-local').hooks;
const user_hooks = require('./users.utils');
const { isAdmin, isAdmin2 } = require('./users.utils');

/**
 * Filter results for users :
 * not admins : Can only access to their own data (user _id)
 * admins : can access all data (all users)
 */
const restrictToUsers = [
  authenticate('jwt'),
  commonHooks.iff(commonHooks.isNot(isAdmin()), setField({ from: 'params.user._id', as: 'params.query._id' })), /** non admin users can only access to their user object */
  hashPassword('password')
];

/** Authorize only admin roles to method */
const restrictToAdminsOnly = [
  authenticate('jwt'),
  commonHooks.iff(commonHooks.isNot(isAdmin()), () => { throw new Error('Acess restricted to admins') }),
  hashPassword('password')
]

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [...restrictToUsers],
    get: [...restrictToUsers],
    create: [...restrictToAdminsOnly],
    update: [...restrictToAdminsOnly],
    patch: [...restrictToAdminsOnly],
    remove: [commonHooks.iff(user_hooks.isLoggedInUser(), () => { throw new Error('Removing user that is currently loggedin is forbidden') }), ...restrictToUsers]
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
      user_hooks.sortByNameAsc()
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
