'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * @classdesc A Member represents a remote Client in a Channel.
 * @property {Channel} channel - The Channel the remote Client is a Member of.
 * @property {String} identity - Deprecated: The identity of the remote Client.
 * @property {UserInfo} userInfo - UserInfo structure for member.
 * @property {Boolean} isTyping - Whether or not this Member is currently typing.
 * @property {Number} lastConsumedMessageIndex - Latest consumed Message index by this Member.
 * @property {Date} lastConsumptionTimestamp - Date when Member has updated his consumption horizon.
 * @property {String} sid - The server-assigned unique identifier for the Member.
 * @fires Member#typingEnded
 * @fires Member#typingStarted
 * @fires Member#updated
 * @fires Member#userInfoUpdated
 */
class Member extends EventEmitter {
  constructor(channel, data, sid, userInfo) {
    super();

    let isTyping = false;
    let typingTimeout = null;

    let identity = data.identity;
    let roleSid = data.roleSid || null;
    let lastConsumedMessageIndex = (typeof data.lastConsumedMessageIndex !== 'undefined') ? data.lastConsumedMessageIndex : null;
    let lastConsumptionTimestamp = data.lastConsumptionTimestamp ?
        new Date(data.lastConsumptionTimestamp) : null;

    if (!data.identity) {
      throw new Error('Received invalid Member object from server: Missing identity.');
    }

    Object.defineProperties(this, {
      _identity: {
        get: () => identity,
        set: (_identity) => identity = _identity
      },
      _isTyping: {
        get: () => isTyping,
        set: (_isTyping) => isTyping = _isTyping
      },
      _lastConsumedMessageIndex: {
        get: () => lastConsumedMessageIndex,
        set: _lastConsumedMessageIndex => lastConsumedMessageIndex = _lastConsumedMessageIndex
      },
      _lastConsumptionTimestamp: {
        get: () => lastConsumptionTimestamp,
        set: _lastConsumptionTimestamp => lastConsumptionTimestamp = _lastConsumptionTimestamp
      },
      _roleSid: {
        get: () => roleSid,
        set: _roleSid => roleSid = _roleSid
      },
      _typingTimeout: {
        writable: true,
        value: typingTimeout
      },
      channel: {
        enumerable: true,
        value: channel
      },
      identity: {
        enumerable: true,
        get: () => identity
      },
      isTyping: {
        enumerable: true,
        get: () => isTyping
      },
      lastConsumedMessageIndex: {
        enumerable: true,
        get: () => lastConsumedMessageIndex
      },
      lastConsumptionTimestamp: {
        enumerable: true,
        get: () => lastConsumptionTimestamp
      },
      roleSid: {
        enumerable: true,
        get: () => roleSid
      },
      sid: {
        enumerable: true,
        value: sid
      },
      userInfo: {
        enumerable: true,
        get: () => userInfo
      }
    });

    userInfo.on('updated', () => this.emit('userInfoUpdated', this));
  }

  /**
   * Private method used to start or reset the typing indicator timeout (with event emitting)
   * @private
   */
  _startTyping(timeout) {
    clearTimeout(this._typingTimeout);

    this._isTyping = true;
    this.emit('typingStarted', this);
    this.channel.emit('typingStarted', this);

    this._typingTimeout = setTimeout(() => this._endTyping(), timeout);
    return this;
  }

  /**
   * Private method function used to stop typing indicator (with event emitting)
   * @private
   */
  _endTyping() {
    if (!this._typingTimeout) { return; }

    this._isTyping = false;
    this.emit('typingEnded', this);
    this.channel.emit('typingEnded', this);

    clearInterval(this._typingTimeout);
    this._typingTimeout = null;
  }

  /**
   * Private method function used update local object's property roleSid with new value
   * @private
   */
  _update(data) {
    let updated = false;

    if (data.roleSid && this._roleSid !== data.roleSid) {
      this._roleSid = data.roleSid;
      updated = true;
    }

    if ((typeof data.lastConsumedMessageIndex !== 'undefined')
        && this._lastConsumedMessageIndex !== data.lastConsumedMessageIndex) {
      this._lastConsumedMessageIndex = data.lastConsumedMessageIndex;
      updated = true;
    }

    if (data.lastConsumptionTimestamp) {
      let lastConsumptionTimestamp = new Date(data.lastConsumptionTimestamp);
      if (!this._lastConsumptionTimestamp ||
          this._lastConsumptionTimestamp.getTime() !== lastConsumptionTimestamp.getTime()) {
        this._lastConsumptionTimestamp = lastConsumptionTimestamp;
        updated = true;
      }
    }

    if (updated) {
      this.emit('updated', this);
    }
  }

  /**
   * Remove this Member from the Channel.
   * @returns Promise
   */
  remove() {
    return this.channel.removeMember(this);
  }
}

module.exports = Member;

/**
* Fired when member started to type
* @event Member#typingStarted
* @type {Member}
*/

/**
* Fired when member ended to type
* @event Member#typingEnded
* @type {Member}
*/

/**
 * Fired when member is updated
 * @event Member#updated
 * @type {Member}
 */

/**
 * Fired when member's user info is updated
 * @event Member#userInfoUpdated
 * @type {Member}
 */
