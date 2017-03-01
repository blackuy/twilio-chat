'use strict';

/**
 * @class
 * @classdesc Exception type for service-side issues
 *
 * @property {Number} code - Error code
 * @property {String} message - Error description
 */

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SessionError = function (_Error) {
  (0, _inherits3.default)(SessionError, _Error);

  function SessionError(message, code) {
    (0, _classCallCheck3.default)(this, SessionError);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SessionError.__proto__ || (0, _getPrototypeOf2.default)(SessionError)).call(this));

    _this.name = _this.constructor.name;
    _this.message = message;
    _this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(_this, _this.constructor);
    } else {
      _this.stack = new Error().stack;
    }
    return _this;
  }

  return SessionError;
}(Error);

module.exports = SessionError;