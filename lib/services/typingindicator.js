'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = require('../logger').scope('TypingIndicator');

var TYPING_INDICATOR_MESSAGE_TYPE = 'twilio.ipmsg.typing_indicator';

/**
 * @class TypingIndicator
 *
 * @constructor
 * @private
 */

var TypingIndicator = function () {
  function TypingIndicator(config, transport, notifications, getChannel) {
    var _this = this;

    (0, _classCallCheck3.default)(this, TypingIndicator);

    (0, _defineProperties2.default)(this, {
      _transport: { value: transport },
      _notifications: { value: notifications },
      _config: { value: config },
      _typingTimeout: { value: null, writable: true },
      _sentUpdates: { value: new _map2.default() },
      _getChannel: { value: getChannel },
      token: { get: function get() {
          return config.token;
        } },
      typingTimeout: { get: function get() {
          return _this._typingTimeout || config.typingIndicatorTimeout;
        } }
    });
  }

  /**
   * Initialize TypingIndicator controller
   * Registers for needed message types and sets listeners
   * @private
   */


  (0, _createClass3.default)(TypingIndicator, [{
    key: 'initialize',
    value: function initialize() {
      var _this2 = this;

      this._notifications.subscribe(TYPING_INDICATOR_MESSAGE_TYPE, 'twilsock');
      this._notifications.on('message', function (type, message) {
        if (type === TYPING_INDICATOR_MESSAGE_TYPE) {
          _this2._handleRemoteTyping(message);
        }
      });
    }

    /**
     * Remote members typing events handler
     * @private
     */

  }, {
    key: '_handleRemoteTyping',
    value: function _handleRemoteTyping(message) {
      var _this3 = this;

      log.trace('Got new typing indicator ', message);
      this._getChannel(message.channel_sid).then(function (channel) {
        if (channel) {
          channel._members.forEach(function (member) {
            if (member.identity === message.identity) {
              member._startTyping(_this3.typingTimeout);
            }
          });
        }
      }).catch(function (err) {
        log.error(err);
        throw err;
      });
    }

    /**
     * Send typing event for the given channel sid
     * @param {String} channelSid
     */

  }, {
    key: 'send',
    value: function send(channelSid) {
      var lastUpdate = this._sentUpdates.get(channelSid);
      if (lastUpdate && lastUpdate > Date.now() - this.typingTimeout) {
        return _promise2.default.resolve();
      }

      this._sentUpdates.set(channelSid, Date.now());
      return this._send(channelSid);
    }
  }, {
    key: '_send',
    value: function _send(channelSid) {
      var _this4 = this;

      log.trace('Sending typing indicator');

      var url = this._config.typingIndicatorUri;
      var headers = {
        'X-Twilio-Token': this.token,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      var body = 'ChannelSid=' + channelSid;

      this._transport.post(url, headers, body).then(function (response) {
        if (response.body.hasOwnProperty('typing_timeout')) {
          _this4._typingTimeout = response.body.typing_timeout * 1000;
        }
      }).catch(function (err) {
        log.error('Failed to send typing indicator: ', err);
        throw err;
      });
    }
  }]);
  return TypingIndicator;
}();

module.exports = TypingIndicator;