'use strict';

/**
 * @class
 * @classdesc Exception type for service-side issues
 *
 * @property {Number} code - Error code
 * @property {String} message - Error description
 */
class SessionError extends Error {
  constructor(message, code) {
    super();

    this.name = this.constructor.name;
    this.message = message;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
  }
}

module.exports = SessionError;
