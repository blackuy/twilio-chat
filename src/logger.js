'use strict';

const log = require('loglevel');

function prepareLine(prefix, args) {
  return [prefix].concat(Array.from(args));
}

class Logger {
  constructor() {
    Object.defineProperties(this, {
      _prefix: { value: '', writable: true }
    });
  }

  static scope(prefix) {
    this._prefix += ' ' + prefix;
    return new Logger();
  }

  setLevel(level) {
    log.setLevel(level);
  }

  static setLevel(level) {
    log.setLevel(level);
  }

  trace() {
    log.trace.apply(null, prepareLine('Chat T:' + this._prefix, arguments));
  }

  debug() {
    log.debug.apply(null, prepareLine('Chat D:' + this._prefix, arguments));
  }

  info() {
    log.info.apply(null, prepareLine('Chat I:' + this._prefix, arguments));
  }

  warn() {
    log.warn.apply(null, prepareLine('Chat W:' + this._prefix, arguments));
  }

  error() {
    log.error.apply(null, prepareLine('Chat E:' + this._prefix, arguments));
  }

  static trace() {
    log.trace.apply(null, prepareLine('Chat T:', arguments));
  }

  static debug() {
    log.debug.apply(null, prepareLine('Chat D:', arguments));
  }

  static info() {
    log.info.apply(null, prepareLine('Chat I:', arguments));
  }

  static warn() {
    log.warn.apply(null, prepareLine('Chat W:', arguments));
  }

  static error() {
    log.error.apply(null, prepareLine('Chat E:', arguments));
  }
}

module.exports = Logger;

