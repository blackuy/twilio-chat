'use strict';

/**
 * @classdesc Provides consumption horizon management functionality
 */
class ConsumptionHorizon {
  constructor(config, session) {
    Object.defineProperties(this, {
      _session: { value: session },
      _consumptionHorizonReports: { value: new Map() },
      _consumptionHorizonUpdateTimer: { value: null, writable: true }
    });
  }

  _getReportInterval() {
    return this._session.getConsumptionReportInterval().then(duration => duration.seconds * 1000);
  }

  _delayedSendConsumptionHorizon(delay) {
    if (this._consumptionHorizonUpdateTimer !== null) {
      return;
    }

    this._consumptionHorizonUpdateTimer = setTimeout(() => {
      let reports = [];
      this._consumptionHorizonReports.forEach(entry => reports.push(entry));
      if (reports.length > 0) {
        this._session.addCommand('consumptionReport', { report: reports });
      }
      this._consumptionHorizonUpdateTimer = null;
      this._consumptionHorizonReports.clear();
    }, delay);
  }

  /**
   * Updates consumption horizon value without any checks
   */
  updateLastConsumedMessageIndexForChannel(channelSid, messageIdx) {
    this._consumptionHorizonReports.set(channelSid, { channelSid, messageIdx });
    this._getReportInterval().then(delay => this._delayedSendConsumptionHorizon(delay));
  }

  /**
   * Move consumption horizon forward
   */
  advanceLastConsumedMessageIndexForChannel(channelSid, messageIdx) {
    let currentHorizon = this._consumptionHorizonReports.get(channelSid);
    if (currentHorizon && currentHorizon.messageIdx >= messageIdx) {
      return;
    }

    this._consumptionHorizonReports.set(channelSid, { channelSid, messageIdx });
    this._getReportInterval().then(delay => this._delayedSendConsumptionHorizon(delay));
  }
}

module.exports = ConsumptionHorizon;
