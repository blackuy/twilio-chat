'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Network = function () {
  function Network(config, session, transport) {
    (0, _classCallCheck3.default)(this, Network);

    (0, _defineProperties2.default)(this, {
      _config: { value: config },
      _transport: { value: transport },
      _session: { value: session },
      _cacheLifetime: { value: config.httpCacheLifetime, writable: true },

      _cache: { value: new _map2.default() },
      _timer: { value: null, writable: true }
    });
  }

  (0, _createClass3.default)(Network, [{
    key: '_isExpired',
    value: function _isExpired(timestamp) {
      return !this._cacheLifetime || Date.now() - timestamp > this._cacheLifetime;
    }
  }, {
    key: '_cleanupCache',
    value: function _cleanupCache() {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(this._cache), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = (0, _slicedToArray3.default)(_step.value, 2),
              k = _step$value[0],
              v = _step$value[1];

          if (this._isExpired(v.timestamp)) {
            this._cache.delete(k);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (this._cache.size === 0) {
        clearTimeout(this._timer);
      }
    }
  }, {
    key: '_pokeTimer',
    value: function _pokeTimer() {
      var _this = this;

      this._timer = this._timer || setInterval(function () {
        return _this._cleanupCache();
      }, this._cacheLifetime * 2);
    }
  }, {
    key: 'get',
    value: function get(url) {
      var _this2 = this;

      var cacheEntry = this._cache.get(url);
      if (cacheEntry && !this._isExpired(cacheEntry.timestamp)) {
        return _promise2.default.resolve(cacheEntry.response);
      }

      var headers = { 'X-Twilio-Token': this._config.token };
      return this._transport.get(url, headers).then(function (response) {
        _this2._cache.set(url, { response: response, timestamp: Date.now() });
        _this2._pokeTimer();
        return response;
      });
    }
  }]);
  return Network;
}();

module.exports = Network;