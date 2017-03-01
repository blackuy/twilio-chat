'use strict';

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var JsonDiff = require('./jsondiff');

/**
 * Tracks changes for JS objects and emits appropriate callbacks
 */
function ChangeTracker(data) {
  var _this = this;

  (0, _defineProperties2.default)(this, {
    _pendingListeners: { value: {} },
    _data: { value: data || {}, writable: true }
  });
  EventEmitter.call(this);

  ['keyAdded', 'keyRemoved', 'keyUpdated'].forEach(function (eventName) {
    _this._pendingListeners[eventName] = {};
    _this.on(eventName, function (path, value) {
      var handlers = _this._pendingListeners[eventName][path] || [];
      handlers.forEach(function (handler) {
        return handler(value);
      });
      _this._pendingListeners[eventName][path] = [];
    });
  });
}
inherits(ChangeTracker, EventEmitter);

/**
 * Compare old and new data and fire events if difference found
 * @private
 */
ChangeTracker.prototype._traverse = function (originalData, updatedData) {
  var _this2 = this;

  var diff = JsonDiff.diff(originalData, updatedData);
  diff.forEach(function (row) {
    if (row.op === 'add') {
      _this2.emit('keyAdded', row.path, row.value);
    } else if (row.op === 'replace') {
      _this2.emit('keyUpdated', row.path, row.value);
    } else if (row.op === 'remove') {
      _this2.emit('keyRemoved', row.path);
    }
  });
};

/**
 * Set new data to process
 * @param Object updatedData new data set
 * @public
 */
ChangeTracker.prototype.update = function (updatedData) {
  var originalData = this._data;
  this._data = updatedData;
  this._traverse(originalData, updatedData);
};

ChangeTracker.prototype.addEventHandler = function (eventName, path, handler) {
  var handlers = this._pendingListeners[eventName][path] || [];
  handlers.push(handler);
  this._pendingListeners[eventName][path] = handlers;
};

module.exports = ChangeTracker;