'use strict';

const log = require('./logger');

function parseAttributes(attrs) {
  try {
    return JSON.parse(attrs);
  } catch (e) {
    log.warning('Failed to parse channel attributes', e);
  }
  return {};
}

function parseTime(timeString) {
  try {
    return new Date(timeString);
  } catch (e) {
    return null;
  }
}

/**
 * Contains channel information.
 * Unlike {@link Channel}, this information won't be updated in realtime.
 * To have a fresh data, user should query channel descriptors again.
 *
 * @property {String} sid Channel sid
 * @property {String} uniqueName Channel unique name
 * @property {String} friendlyName - The Channel's name.
 * @property {String} createdBy Identity of the User that created this Channel.
 * @property {Date} dateCreated Date this Channel was created.
 * @property {Date} dateUpdated Date this Channel was last updated.
 * @property {Object} attributes Channel's custom attributes.
 * @property {Integer} messagesCount Number of messages in a channel
 * @property {Integer} membersCount Number of memembers in a channel
 */
class ChannelDescriptor {
  /**
   * @param {Client} chat client instance
   * @param {Object} channel descriptor data object
   * @private
   */
  constructor(client, descriptor) {
    Object.defineProperties(this, {
      _client: { value: client },
      _descriptor: { value: descriptor },

      sid: { value: descriptor.sid, enumerable: true },
      channel: { value: descriptor.sid + '.channel', enumerable: true },
      uniqueName: { value: descriptor.unique_name, enumerable: true },
      friendlyName: { value: descriptor.friendly_name, enumerable: true },
      attributes: { value: parseAttributes(descriptor.attributes) },
      createdBy: { value: descriptor.created_by, enumerable: true },
      dateCreated: { value: parseTime(descriptor.date_created), enumerable: true },
      dateUpdated: { value: parseTime(descriptor.date_updated), enumerable: true },
      messagesCount: { value: descriptor.messages_count, enumerable: true },
      membersCount: { value: descriptor.members_count, enumerable: true },
      type: { value: descriptor.type, enumerable: true }
    });
  }

  /**
   * Get channel object from descriptor
   * @returns Promise<Channel>
   */
  getChannel() {
    return this._client.getChannelBySid(this.sid);
  }
}

module.exports = ChannelDescriptor;
