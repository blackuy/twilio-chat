'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventEmitter = require('events').EventEmitter;
var log = require('./logger');
var JsonDiff = require('./util/jsondiff');

function parseAttributes(msgSid, attributes) {
  try {
    return attributes ? JSON.parse(attributes) : {};
  } catch (e) {
    log.warn('Got malformed attributes for the message', msgSid);
    return {};
  }
}

/**
 * @classdesc A Message represents a Message in a Channel.
 * @property {String} author - The name of the user that authored this Message.
 * @property {String} body - The body of the Message.
 * @property {Object} attributes - Message custom attributes
 * @property {Channel} channel - The Channel the Message belongs to.
 * @property {Date} dateUpdated - When the Message was updated.
 * @property {Number} index - Index of Message in the Channel's messages stream.
 * @property {String} lastUpdatedBy - The name of the last user updated this Message.
 * @property {String} sid - The server-assigned unique identifier for
 *   the Message.
 * @property {Date} timestamp - When the Message was sent.
 * @fires Message#updated
 */

var Message = function (_EventEmitter) {
  (0, _inherits3.default)(Message, _EventEmitter);

  function Message(channel, entityId, data) {
    (0, _classCallCheck3.default)(this, Message);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Message.__proto__ || (0, _getPrototypeOf2.default)(Message)).call(this));

    var body = data.text;
    var dateUpdated = data.dateUpdated ? new Date(data.dateUpdated) : null;
    var lastUpdatedBy = data.lastUpdatedBy ? data.lastUpdatedBy : null;

    (0, _defineProperties2.default)(_this, {
      _body: {
        get: function get() {
          return body;
        },
        set: function set(_body) {
          return body = _body;
        }
      },
      _dateUpdated: {
        get: function get() {
          return dateUpdated;
        },
        set: function set(_dateUpdated) {
          return dateUpdated = _dateUpdated;
        }
      },
      _lastUpdatedBy: {
        get: function get() {
          return lastUpdatedBy;
        },
        set: function set(_lastUpdatedBy) {
          return lastUpdatedBy = _lastUpdatedBy;
        }
      },
      _attributes: {
        value: parseAttributes(data.sid, data.attributes),
        writable: true
      },
      author: {
        enumerable: true,
        value: data.author
      },
      body: {
        enumerable: true,
        get: function get() {
          return body;
        }
      },
      channel: {
        enumerable: true,
        value: channel
      },
      dateUpdated: {
        enumerable: true,
        get: function get() {
          return dateUpdated;
        }
      },
      index: {
        enumerable: true,
        value: parseInt(entityId)
      },
      lastUpdatedBy: {
        enumerable: true,
        get: function get() {
          return lastUpdatedBy;
        }
      },
      sid: {
        enumerable: true,
        value: data.sid
      },
      timestamp: {
        enumerable: true,
        value: new Date(data.timestamp)
      },
      attributes: {
        enumerable: true,
        get: function get() {
          return _this._attributes;
        }
      }
    });
    return _this;
  }

  (0, _createClass3.default)(Message, [{
    key: '_update',
    value: function _update(data) {
      var updated = false;

      if ((data.text || typeof data.text === 'string') && data.text !== this._body) {
        this._body = data.text;
        updated = true;
      }

      if (data.lastUpdatedBy && data.lastUpdatedBy !== this._lastUpdatedBy) {
        this._lastUpdatedBy = data.lastUpdatedBy;
        updated = true;
      }

      if (data.dateUpdated && new Date(data.dateUpdated).getTime() !== (this._dateUpdated && this._dateUpdated.getTime())) {
        this._dateUpdated = new Date(data.dateUpdated);
        updated = true;
      }

      var updatedAttributes = parseAttributes(this.sid, data.attributes);
      if (!JsonDiff.isDeepEqual(this._attributes, updatedAttributes)) {
        this._attributes = updatedAttributes;
        updated = true;
      }

      if (updated) {
        this.emit('updated', this);
      }
    }

    /**
     * Remove the Message.
     * @returns {Promise<Message|SessionError>}
     */

  }, {
    key: 'remove',
    value: function remove() {
      var _this2 = this;

      return this.channel._session.addCommand('deleteMessage', {
        channelSid: this.channel.sid,
        messageIdx: this.index.toString()
      }).then(function () {
        return _this2;
      });
    }

    /**
     * Edit message body.
     * @param {String} body - new body of Message.
     * @returns {Promise<Message|SessionError>}
     */

  }, {
    key: 'updateBody',
    value: function updateBody(body) {
      var _this3 = this;

      if (typeof body !== 'string') {
        throw new Error('Body <String> is a required parameter for updateBody');
      }

      return this.channel._session.addCommand('editMessage', {
        channelSid: this.channel.sid,
        messageIdx: this.index.toString(),
        text: body
      }).then(function () {
        return _this3;
      });
    }

    /**
     * Edit message attributes.
     * @param {Object} attributes new attributes for Message.
     * @returns {Promise<Message|SessionError|Error>}
     */

  }, {
    key: 'updateAttributes',
    value: function updateAttributes(attributes) {
      var _this4 = this;

      if (typeof attributes === 'undefined') {
        return _promise2.default.reject(new Error('Attributes is a required parameter for updateAttributes'));
      } else if (attributes.constructor !== Object) {
        return _promise2.default.reject(new Error('Attributes must be a valid JSON object'));
      }

      return this.channel._session.addCommand('editMessageAttributes', {
        channelSid: this.channel.sid,
        messageIdx: this.index,
        attributes: (0, _stringify2.default)(attributes)
      }).then(function () {
        return _this4;
      });
    }
  }]);
  return Message;
}(EventEmitter);

/**
 * Fired when the Message's fields have been updated.
 * @param {Message} message
 * @event Message#updated
 */

module.exports = Message;