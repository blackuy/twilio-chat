'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var JsonDiff = require('./jsondiff');

/**
 * Tracks changes for JS objects and emits appropriate callbacks
 */
function ChangeTracker(data) {
  Object.defineProperties(this, {
    _pendingListeners: { value: {} },
    _data: { value: data || {}, writable: true }
  });
  EventEmitter.call(this);

  ['keyAdded', 'keyRemoved', 'keyUpdated'].forEach((eventName) => {
    this._pendingListeners[eventName] = { };
    this.on(eventName, (path, value) => {
      var handlers = this._pendingListeners[eventName][path] || [];
      handlers.forEach(handler => handler(value) );
      this._pendingListeners[eventName][path] = [];
    });
  });
}
inherits(ChangeTracker, EventEmitter);

/**
 * Compare old and new data and fire events if difference found
 * @private
 */
ChangeTracker.prototype._traverse = function(originalData, updatedData)
{
  var diff = JsonDiff.diff(originalData, updatedData);
  diff.forEach((row) => {
    if (row.op === 'add') {
      this.emit('keyAdded', row.path, row.value);
    }
    else if (row.op === 'replace') {
      this.emit('keyUpdated', row.path, row.value);
    }
    else if (row.op === 'remove') {
      this.emit('keyRemoved', row.path);
    }
  });
};

/**
 * Set new data to process
 * @param Object updatedData new data set
 * @public
 */
ChangeTracker.prototype.update = function(updatedData) {
  var originalData = this._data;
  this._data = updatedData;
  this._traverse(originalData, updatedData);
};

ChangeTracker.prototype.addEventHandler = function(eventName, path, handler) {
  var handlers = this._pendingListeners[eventName][path] || [];
  handlers.push(handler);
  this._pendingListeners[eventName][path] = handlers;
};

module.exports = ChangeTracker;


