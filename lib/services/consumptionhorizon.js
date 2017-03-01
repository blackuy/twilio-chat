'use strict';

/**
 * @classdesc Provides consumption horizon management functionality
 */

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ConsumptionHorizon = function () {
  function ConsumptionHorizon(config, session) {
    (0, _classCallCheck3.default)(this, ConsumptionHorizon);

    (0, _defineProperties2.default)(this, {
      _session: { value: session },
      _consumptionHorizonReports: { value: new _map2.default() },
      _consumptionHorizonUpdateTimer: { value: null, writable: true }
    });
  }

  (0, _createClass3.default)(ConsumptionHorizon, [{
    key: '_getReportInterval',
    value: function _getReportInterval() {
      return this._session.getConsumptionReportInterval().then(function (duration) {
        return duration.seconds * 1000;
      });
    }
  }, {
    key: '_delayedSendConsumptionHorizon',
    value: function _delayedSendConsumptionHorizon(delay) {
      var _this = this;

      if (this._consumptionHorizonUpdateTimer !== null) {
        return;
      }

      this._consumptionHorizonUpdateTimer = setTimeout(function () {
        var reports = [];
        _this._consumptionHorizonReports.forEach(function (entry) {
          return reports.push(entry);
        });
        if (reports.length > 0) {
          _this._session.addCommand('consumptionReport', { report: reports });
        }
        _this._consumptionHorizonUpdateTimer = null;
        _this._consumptionHorizonReports.clear();
      }, delay);
    }

    /**
     * Updates consumption horizon value without any checks
     */

  }, {
    key: 'updateLastConsumedMessageIndexForChannel',
    value: function updateLastConsumedMessageIndexForChannel(channelSid, messageIdx) {
      var _this2 = this;

      this._consumptionHorizonReports.set(channelSid, { channelSid: channelSid, messageIdx: messageIdx });
      this._getReportInterval().then(function (delay) {
        return _this2._delayedSendConsumptionHorizon(delay);
      });
    }

    /**
     * Move consumption horizon forward
     */

  }, {
    key: 'advanceLastConsumedMessageIndexForChannel',
    value: function advanceLastConsumedMessageIndexForChannel(channelSid, messageIdx) {
      var _this3 = this;

      var currentHorizon = this._consumptionHorizonReports.get(channelSid);
      if (currentHorizon && currentHorizon.messageIdx >= messageIdx) {
        return;
      }

      this._consumptionHorizonReports.set(channelSid, { channelSid: channelSid, messageIdx: messageIdx });
      this._getReportInterval().then(function (delay) {
        return _this3._delayedSendConsumptionHorizon(delay);
      });
    }
  }]);
  return ConsumptionHorizon;
}();

module.exports = ConsumptionHorizon;