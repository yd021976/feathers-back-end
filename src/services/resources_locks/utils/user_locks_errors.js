function lockError(msg, name, code, data) {
    msg = msg || 'Error'
}
function inheritsFrom(Child, Parent) {
    Child.prototype = Object.create(Parent.prototype);
    Child.prototype.constructor = Child;
}

function lockRejected(message, data) {
    lockError.call(this, message, 'lockRejected', 1, data)
}
inheritsFrom(lockRejected, lockError)

function lockAlreadyAcquired(message, data) {
    lockError.call(this, message, 'lockAlreadyAcquired', 2, data)
}
inheritsFrom(lockAlreadyAcquired, lockError)

function unlockError(message, data) {
    lockError.call(this, message, 'unlockError', 3, data)
}
inheritsFrom(unlockError, lockError)

function userNotRegistered(message, data) {
    lockError.call(this, message, 'userNotRegistered', 3, data)
}
inheritsFrom(userNotRegistered, lockError)

function userHasNoLock(message, data) {
    lockError.call(this, message, 'userHasNoLock', 3, data)
}
inheritsFrom(userHasNoLock, lockError)

module.exports = {
    lockError,
    lockRejected,
    lockAlreadyAcquired,
    unlockError,
    userNotRegistered,
    userHasNoLock
}