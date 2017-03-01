'use strict';

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

/**
 * @classdesc A Member represents a remote Client in a Channel.
 * @property {Channel} channel - The Channel the remote Client is a Member of.
 * @property {String} identity - Deprecated: The identity of the remote Client.
 * @property {UserInfo} userInfo - UserInfo structure for member.
 * @property {Boolean} isTyping - Whether or not this Member is currently typing.
 * @property {Number} lastConsumedMessageIndex - Latest consumed Message index by this Member.
 * @property {Date} lastConsumptionTimestamp - Date when Member has updated his consumption horizon.
 * @property {String} sid - The server-assigned unique identifier for the Member.
 * @fires Member#typingEnded
 * @fires Member#typingStarted
 * @fires Member#updated
 * @fires Member#userInfoUpdated
 */

var Member = function (_EventEmitter) {
  (0, _inherits3.default)(Member, _EventEmitter);

  function Member(channel, data, sid, userInfo) {
    (0, _classCallCheck3.default)(this, Member);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Member.__proto__ || (0, _getPrototypeOf2.default)(Member)).call(this));

    var isTyping = false;
    var typingTimeout = null;

    var identity = data.identity;
    var roleSid = data.roleSid || null;
    var lastConsumedMessageIndex = typeof data.lastConsumedMessageIndex !== 'undefined' ? data.lastConsumedMessageIndex : null;
    var lastConsumptionTimestamp = data.lastConsumptionTimestamp ? new Date(data.lastConsumptionTimestamp) : null;

    if (!data.identity) {
      throw new Error('Received invalid Member object from server: Missing identity.');
    }

    (0, _defineProperties2.default)(_this, {
      _identity: {
        get: function get() {
          return identity;
        },
        set: function set(_identity) {
          return identity = _identity;
        }
      },
      _isTyping: {
        get: function get() {
          return isTyping;
        },
        set: function set(_isTyping) {
          return isTyping = _isTyping;
        }
      },
      _lastConsumedMessageIndex: {
        get: function get() {
          return lastConsumedMessageIndex;
        },
        set: function set(_lastConsumedMessageIndex) {
          return lastConsumedMessageIndex = _lastConsumedMessageIndex;
        }
      },
      _lastConsumptionTimestamp: {
        get: function get() {
          return lastConsumptionTimestamp;
        },
        set: function set(_lastConsumptionTimestamp) {
          return lastConsumptionTimestamp = _lastConsumptionTimestamp;
        }
      },
      _roleSid: {
        get: function get() {
          return roleSid;
        },
        set: function set(_roleSid) {
          return roleSid = _roleSid;
        }
      },
      _typingTimeout: {
        writable: true,
        value: typingTimeout
      },
      channel: {
        enumerable: true,
        value: channel
      },
      identity: {
        enumerable: true,
        get: function get() {
          return identity;
        }
      },
      isTyping: {
        enumerable: true,
        get: function get() {
          return isTyping;
        }
      },
      lastConsumedMessageIndex: {
        enumerable: true,
        get: function get() {
          return lastConsumedMessageIndex;
        }
      },
      lastConsumptionTimestamp: {
        enumerable: true,
        get: function get() {
          return lastConsumptionTimestamp;
        }
      },
      roleSid: {
        enumerable: true,
        get: function get() {
          return roleSid;
        }
      },
      sid: {
        enumerable: true,
        value: sid
      },
      userInfo: {
        enumerable: true,
        get: function get() {
          return userInfo;
        }
      }
    });

    userInfo.on('updated', function () {
      return _this.emit('userInfoUpdated', _this);
    });
    return _this;
  }

  /**
   * Private method used to start or reset the typing indicator timeout (with event emitting)
   * @private
   */


  (0, _createClass3.default)(Member, [{
    key: '_startTyping',
    value: function _startTyping(timeout) {
      var _this2 = this;

      clearTimeout(this._typingTimeout);

      this._isTyping = true;
      this.emit('typingStarted', this);
      this.channel.emit('typingStarted', this);

      this._typingTimeout = setTimeout(function () {
        return _this2._endTyping();
      }, timeout);
      return this;
    }

    /**
     * Private method function used to stop typing indicator (with event emitting)
     * @private
     */

  }, {
    key: '_endTyping',
    value: function _endTyping() {
      if (!this._typingTimeout) {
        return;
      }

      this._isTyping = false;
      this.emit('typingEnded', this);
      this.channel.emit('typingEnded', this);

      clearInterval(this._typingTimeout);
      this._typingTimeout = null;
    }

    /**
     * Private method function used update local object's property roleSid with new value
     * @private
     */

  }, {
    key: '_update',
    value: function _update(data) {
      var updated = false;

      if (data.roleSid && this._roleSid !== data.roleSid) {
        this._roleSid = data.roleSid;
        updated = true;
      }

      if (typeof data.lastConsumedMessageIndex !== 'undefined' && this._lastConsumedMessageIndex !== data.lastConsumedMessageIndex) {
        this._lastConsumedMessageIndex = data.lastConsumedMessageIndex;
        updated = true;
      }

      if (data.lastConsumptionTimestamp) {
        var lastConsumptionTimestamp = new Date(data.lastConsumptionTimestamp);
        if (!this._lastConsumptionTimestamp || this._lastConsumptionTimestamp.getTime() !== lastConsumptionTimestamp.getTime()) {
          this._lastConsumptionTimestamp = lastConsumptionTimestamp;
          updated = true;
        }
      }

      if (updated) {
        this.emit('updated', this);
      }
    }

    /**
     * Remove this Member from the Channel.
     * @returns Promise
     */

  }, {
    key: 'remove',
    value: function remove() {
      return this.channel.removeMember(this);
    }
  }]);
  return Member;
}(EventEmitter);

module.exports = Member;

/**
* Fired when member started to type
* @event Member#typingStarted
* @type {Member}
*/

/**
* Fired when member ended to type
* @event Member#typingEnded
* @type {Member}
*/

/**
 * Fired when member is updated
 * @event Member#updated
 * @type {Member}
 */

/**
 * Fired when member's user info is updated
 * @event Member#userInfoUpdated
 * @type {Member}
 */