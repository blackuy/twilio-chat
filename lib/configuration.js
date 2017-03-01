'use strict';

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _isInteger = require('babel-runtime/core-js/number/is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BASE_CHAT_URI = 'https://aim.twilio.com';
var TYPING_PATH = '/v1/typing';
var TYPING_TIMEOUT = 5;
var CONSUMPTION_HORIZON_SENDING_INTERVAL = 'PT5S';

var ChatConfig = function () {
  function ChatConfig(token, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, ChatConfig);

    options = options || {};
    var _options = options.Chat || options.IPMessaging || {};
    var baseUri = _options.apiUri || _options.typingUri || BASE_CHAT_URI;

    var httpCacheLifetime = (0, _isInteger2.default)(options.httpCacheLifetime) ? options.httpCacheLifetime : 10000;
    (0, _defineProperties2.default)(this, {
      _token: { value: token, writable: true },

      token: { get: function get() {
          return _this._token;
        }, enumerable: true },
      baseUri: { value: baseUri },
      baseUrl: { value: baseUri },

      typingIndicatorUri: { enumerable: true,
        value: baseUri + TYPING_PATH },
      typingIndicatorTimeout: { enumerable: true,
        value: TYPING_TIMEOUT * 1000 },
      consumptionReportInterval: { enumerable: true,
        value: CONSUMPTION_HORIZON_SENDING_INTERVAL },
      httpCacheLifetime: { enumberable: true, value: httpCacheLifetime }
    });
  }

  (0, _createClass3.default)(ChatConfig, [{
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
    }
  }]);
  return ChatConfig;
}();

module.exports = ChatConfig;