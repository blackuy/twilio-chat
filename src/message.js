'use strict';
const EventEmitter = require('events').EventEmitter;
const log = require('./logger');
const JsonDiff = require('./util/jsondiff');

function parseAttributes(msgSid, attributes) {
  try {
    return attributes ? JSON.parse(attributes) : {};
  } catch (e) {
    log.warn('Got malformed attributes for the message', msgSid);
    return {};
  }
}

/**
 * @classdesc A Message represents a Message in a Channel.
 * @property {String} author - The name of the user that authored this Message.
 * @property {String} body - The body of the Message.
 * @property {Object} attributes - Message custom attributes
 * @property {Channel} channel - The Channel the Message belongs to.
 * @property {Date} dateUpdated - When the Message was updated.
 * @property {Number} index - Index of Message in the Channel's messages stream.
 * @property {String} lastUpdatedBy - The name of the last user updated this Message.
 * @property {String} sid - The server-assigned unique identifier for
 *   the Message.
 * @property {Date} timestamp - When the Message was sent.
 * @fires Message#updated
 */
class Message extends EventEmitter {
  constructor(channel, entityId, data) {
    super();

    var body = data.text;
    var dateUpdated = data.dateUpdated ? new Date(data.dateUpdated) : null;
    var lastUpdatedBy = data.lastUpdatedBy ? data.lastUpdatedBy : null;

    Object.defineProperties(this, {
      _body: {
        get: () => body,
        set: (_body) => body = _body
      },
      _dateUpdated: {
        get: () => dateUpdated,
        set: (_dateUpdated) => dateUpdated = _dateUpdated
      },
      _lastUpdatedBy: {
        get: () => lastUpdatedBy,
        set: (_lastUpdatedBy) => lastUpdatedBy = _lastUpdatedBy
      },
      _attributes: {
        value: parseAttributes(data.sid, data.attributes),
        writable: true
      },
      author: {
        enumerable: true,
        value: data.author
      },
      body: {
        enumerable: true,
        get: () => body
      },
      channel: {
        enumerable: true,
        value: channel
      },
      dateUpdated: {
        enumerable: true,
        get: () => dateUpdated
      },
      index: {
        enumerable: true,
        value: parseInt(entityId)
      },
      lastUpdatedBy: {
        enumerable: true,
        get: () => lastUpdatedBy
      },
      sid: {
        enumerable: true,
        value: data.sid
      },
      timestamp: {
        enumerable: true,
        value: new Date(data.timestamp)
      },
      attributes: {
        enumerable: true,
        get: () => this._attributes
      }
    });
  }

  _update(data) {
    let updated = false;

    if ((data.text || ((typeof data.text) === 'string')) && data.text !== this._body) {
      this._body = data.text;
      updated = true;
    }

    if (data.lastUpdatedBy && data.lastUpdatedBy !== this._lastUpdatedBy) {
      this._lastUpdatedBy = data.lastUpdatedBy;
      updated = true;
    }

    if (data.dateUpdated &&
        new Date(data.dateUpdated).getTime() !== (this._dateUpdated && this._dateUpdated.getTime())) {
      this._dateUpdated = new Date(data.dateUpdated);
      updated = true;
    }

    let updatedAttributes = parseAttributes(this.sid, data.attributes);
    if (!JsonDiff.isDeepEqual(this._attributes, updatedAttributes)) {
      this._attributes = updatedAttributes;
      updated = true;
    }

    if (updated) {
      this.emit('updated', this);
    }
  }

  /**
   * Remove the Message.
   * @returns {Promise<Message|SessionError>}
   */
  remove() {
    return this.channel._session.addCommand('deleteMessage', {
      channelSid: this.channel.sid,
      messageIdx: this.index.toString()
    }).then(() => this);
  }

  /**
   * Edit message body.
   * @param {String} body - new body of Message.
   * @returns {Promise<Message|SessionError>}
   */
  updateBody(body) {
    if (typeof body !== 'string') {
      throw new Error('Body <String> is a required parameter for updateBody');
    }

    return this.channel._session.addCommand('editMessage', {
      channelSid: this.channel.sid,
      messageIdx: this.index.toString(),
      text: body
    }).then(() => this);
  }

  /**
   * Edit message attributes.
   * @param {Object} attributes new attributes for Message.
   * @returns {Promise<Message|SessionError|Error>}
   */
  updateAttributes(attributes) {
    if (typeof attributes === 'undefined') {
      return Promise.reject(new Error('Attributes is a required parameter for updateAttributes'));
    } else if (attributes.constructor !== Object)  {
      return Promise.reject(new Error('Attributes must be a valid JSON object'));
    }

    return this.channel._session.addCommand('editMessageAttributes', {
      channelSid: this.channel.sid,
      messageIdx: this.index,
      attributes: JSON.stringify(attributes)
    }).then(() => this);
  }
}

/**
 * Fired when the Message's fields have been updated.
 * @param {Message} message
 * @event Message#updated
 */

module.exports = Message;

