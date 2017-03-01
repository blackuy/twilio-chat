'use strict';

/**
 * Memoize a function. Be careful with this.
 * @param {function} fn - the function to memoize
 * @returns {function}
 */

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function memoize(fn) {
  var memo = {};
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    return memo[args] ? memo[args] : memo[args] = fn.apply(null, args);
  };
}

/**
 * Deep-clone an object. Note that this does not work on object containing
 * functions.
 * @param {object} obj - the object to deep-clone
 * @returns {object}
 */
function deepClone(obj) {
  return JSON.parse((0, _stringify2.default)(obj));
}

function faultTolerantWait(promises) {
  return new _promise2.default(function (resolve) {
    var totalCount = promises.length;
    var failuresCount = 0;

    if (totalCount === 0) {
      resolve();
    }

    function handle() {
      if (--totalCount <= 0) {
        resolve(failuresCount);
      }
    }

    promises.forEach(function (promise) {
      promise.then(handle).catch(function () {
        failuresCount++;handle();
      });
    });
  });
}

function emitNext() {
  var args = [].slice.call(arguments);
  var eventEmitter = args[0];
  args = args.slice(1);
  setTimeout(function () {
    eventEmitter.emit.call(eventEmitter, args);
  });
  return eventEmitter;
}

/**
 * Traverse down multiple nodes on an object and return null if
 * any link in the path is unavailable.
 * @param {Object} obj - Object to traverse
 * @param {String} path - Path to traverse. Period-separated.
 * @returns {Any|null}
 */
function getOrNull(obj, path) {
  return path.split('.').reduce(function (output, step) {
    if (!output) {
      return null;
    }
    return output[step];
  }, obj);
}

/**
 * Overwrite an existing Array with a new one. This is useful when the existing
 * Array is an immutable property of another object.
 * @param {Array} oldArray - the existing Array to overwrite
 * @param {Array} newArray - the new Array to overwrite with
 */
function overwriteArray(oldArray, newArray) {
  oldArray.splice(0, oldArray.length);
  newArray.forEach(function (item) {
    oldArray.push(item);
  });
}

/**
 * Construct URI with query parameters
 */
function UriBuilder(base) {
  (0, _defineProperties2.default)(this, {
    base: { value: base.replace(/\/$/, '') },
    paths: { value: [] },
    args: { value: [] }
  });

  this.arg = function (name, value) {
    if (typeof value !== 'undefined') {
      this.args.push(name + '=' + value);
    }
    return this;
  };

  this.path = function (name) {
    this.paths.push(name);
    return this;
  };

  this.build = function () {
    var result = this.base;
    if (this.paths.length) {
      result += '/' + this.paths.join('/');
    }

    if (this.args.length) {
      result += '?' + this.args.join('&');
    }
    return result;
  };
}

module.exports.deepClone = deepClone;
module.exports.emitNext = emitNext;
module.exports.getOrNull = getOrNull;
module.exports.overwriteArray = overwriteArray;
module.exports.faultTolerantWait = faultTolerantWait;
module.exports.UriBuilder = UriBuilder;