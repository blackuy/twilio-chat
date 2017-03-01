'use strict';

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = require('loglevel');

function prepareLine(prefix, args) {
  return [prefix].concat((0, _from2.default)(args));
}

var Logger = function () {
  function Logger() {
    (0, _classCallCheck3.default)(this, Logger);

    (0, _defineProperties2.default)(this, {
      _prefix: { value: '', writable: true }
    });
  }

  (0, _createClass3.default)(Logger, [{
    key: 'setLevel',
    value: function setLevel(level) {
      log.setLevel(level);
    }
  }, {
    key: 'trace',
    value: function trace() {
      log.trace.apply(null, prepareLine('Chat T:' + this._prefix, arguments));
    }
  }, {
    key: 'debug',
    value: function debug() {
      log.debug.apply(null, prepareLine('Chat D:' + this._prefix, arguments));
    }
  }, {
    key: 'info',
    value: function info() {
      log.info.apply(null, prepareLine('Chat I:' + this._prefix, arguments));
    }
  }, {
    key: 'warn',
    value: function warn() {
      log.warn.apply(null, prepareLine('Chat W:' + this._prefix, arguments));
    }
  }, {
    key: 'error',
    value: function error() {
      log.error.apply(null, prepareLine('Chat E:' + this._prefix, arguments));
    }
  }], [{
    key: 'scope',
    value: function scope(prefix) {
      this._prefix += ' ' + prefix;
      return new Logger();
    }
  }, {
    key: 'setLevel',
    value: function setLevel(level) {
      log.setLevel(level);
    }
  }, {
    key: 'trace',
    value: function trace() {
      log.trace.apply(null, prepareLine('Chat T:', arguments));
    }
  }, {
    key: 'debug',
    value: function debug() {
      log.debug.apply(null, prepareLine('Chat D:', arguments));
    }
  }, {
    key: 'info',
    value: function info() {
      log.info.apply(null, prepareLine('Chat I:', arguments));
    }
  }, {
    key: 'warn',
    value: function warn() {
      log.warn.apply(null, prepareLine('Chat W:', arguments));
    }
  }, {
    key: 'error',
    value: function error() {
      log.error.apply(null, prepareLine('Chat E:', arguments));
    }
  }]);
  return Logger;
}();

module.exports = Logger;