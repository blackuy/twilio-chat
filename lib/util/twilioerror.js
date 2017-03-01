'use strict';

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var inherits = require('util').inherits;

/**
 * Constructs a new {@link TwilioError}
 * @class
 * @classdesc An extension of Error that contains details about
 *   a specific Twilio error
 * @param {Object} errorData - The specifications to add to the error
 * @param {String} customMessage - A custom message to override the default
 */
function TwilioError(errorData, customMessage) {
  (0, _defineProperties2.default)(this, {
    _errorData: { value: errorData },
    name: { value: errorData.name },
    message: { value: customMessage || errorData.message }
  });
}

inherits(TwilioError, Error);

/**
 * Convert the {@link TwilioError} to a readable string
 * @returns {String} A string representation of the error.
 * @public
 */
TwilioError.prototype.toString = function toString() {
  return [this.name, this.message].join(' | ');
};

/**
 * Clone this {@link TwilioError}, optionally with a new message
 * @params {String} customMessage - A custom detail message to emit
 * @returns {TwilioError} A new instance of {@link TwilioError}
 * @public
 */
TwilioError.prototype.clone = function clone(customMessage) {
  return new TwilioError(this._errorData, customMessage);
};

module.exports = TwilioError;