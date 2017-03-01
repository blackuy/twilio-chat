'use strict';

const log = require('../logger').scope('TypingIndicator');

const TYPING_INDICATOR_MESSAGE_TYPE = 'twilio.ipmsg.typing_indicator';

/**
 * @class TypingIndicator
 *
 * @constructor
 * @private
 */
class TypingIndicator {
  constructor(config, transport, notifications, getChannel) {
    Object.defineProperties(this, {
      _transport: { value: transport },
      _notifications: { value: notifications },
      _config: { value: config },
      _typingTimeout: { value: null, writable: true },
      _sentUpdates: { value: new Map() },
      _getChannel: { value: getChannel },
      token: { get: () => config.token },
      typingTimeout: { get: () => this._typingTimeout || config.typingIndicatorTimeout }
    });
  }

  /**
   * Initialize TypingIndicator controller
   * Registers for needed message types and sets listeners
   * @private
   */
  initialize() {
    this._notifications.subscribe(TYPING_INDICATOR_MESSAGE_TYPE, 'twilsock');
    this._notifications.on('message', (type, message) => {
      if (type === TYPING_INDICATOR_MESSAGE_TYPE) {
        this._handleRemoteTyping(message);
      }
    });
  }

  /**
   * Remote members typing events handler
   * @private
   */
  _handleRemoteTyping(message) {
    log.trace('Got new typing indicator ', message);
    this._getChannel(message.channel_sid)
      .then(channel => {
        if (channel) {
          channel._members.forEach(member => {
            if (member.identity === message.identity) {
              member._startTyping(this.typingTimeout);
            }
          });
        }
      })
      .catch(err => {
        log.error(err);
        throw err;
      });
  }

  /**
   * Send typing event for the given channel sid
   * @param {String} channelSid
   */
  send(channelSid) {
    const lastUpdate = this._sentUpdates.get(channelSid);
    if (lastUpdate && lastUpdate > (Date.now() - this.typingTimeout)) {
      return Promise.resolve();
    }

    this._sentUpdates.set(channelSid, Date.now());
    return this._send(channelSid);
  }

  _send(channelSid) {
    log.trace('Sending typing indicator');

    const url = this._config.typingIndicatorUri;
    const headers = {
        'X-Twilio-Token': this.token,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const body = 'ChannelSid=' + channelSid;

    this._transport.post(url, headers, body)
      .then(response => {
        if (response.body.hasOwnProperty('typing_timeout')) {
          this._typingTimeout = response.body.typing_timeout * 1000;
        }
      }).catch(err => {
        log.error('Failed to send typing indicator: ', err);
        throw err;
      });
  }
}

module.exports = TypingIndicator;
