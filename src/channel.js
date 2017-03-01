'use strict';

const EventEmitter = require('events').EventEmitter;

const MembersEntity = require('./data/members');
const Member = require('./member');
const MessagesEntity = require('./data/messages');
const JsonDiff = require('./util/jsondiff');
const log = require('./logger');

const UriBuilder = require('./util').UriBuilder;

const fieldMappings = {
  attributes: 'attributes',
  createdBy: 'createdBy',
  dateCreated: 'dateCreated',
  dateUpdated: 'dateUpdated',
  friendlyName: 'friendlyName',
  lastConsumedMessageIndex: 'lastConsumedMessageIndex',
  name: 'friendlyName',
  sid: 'sid',
  status: 'status',
  type: 'type',
  uniqueName: 'uniqueName'
};

function parseTime(timeString) {
  try {
    return new Date(timeString);
  } catch (e) {
    return null;
  }
}

function filterStatus(status) {
  switch (status) {
    case 'notParticipating':
      return 'known';
    default:
      return status;
  }
}

/**
 * @classdesc A Channel represents a remote channel of communication between
 * multiple IP Messaging Clients.
 * @property {Object} attributes - The Channel's custom attributes.
 * @property {String} createdBy - The identity of the User that created this Channel.
 * @property {Date} dateCreated - The Date this Channel was created.
 * @property {Date} dateUpdated - The Date this Channel was last updated.
 * @property {String} friendlyName - The Channel's name.
 * @property {Boolean} isPrivate - Whether the channel is private (as opposed to public).
 * @property {Number} lastConsumedMessageIndex - Index of the last Message the User has consumed in this Channel.
 * @property {String} sid - The Channel's unique system identifier.
 * @property {Enumeration} status - Whether the Channel is 'known' to local Client, Client is 'invited' to or
 *   is 'joined' to this Channel.
 * @property {Enumeration} type - The Channel's type as a String: ['private', 'public']
 * @property {String} uniqueName - The Channel's unique name (tag).
 *
 * @fires Channel#memberJoined
 * @fires Channel#memberLeft
 * @fires Channel#memberUpdated
 * @fires Channel#memberInfoUpdated
 * @fires Channel#messageAdded
 * @fires Channel#messageRemoved
 * @fires Channel#messageUpdated
 * @fires Channel#typingEnded
 * @fires Channel#typingStarted
 * @fires Channel#updated
 */
class Channel extends EventEmitter {
  constructor(services, data, sid) {
    super();

    let attributes = data.attributes || { };
    let createdBy = data.createdBy;
    let dateCreated = parseTime(data.dateCreated);
    let dateUpdated = parseTime(data.dateUpdated);
    let friendlyName = data.name || data.friendlyName || null;
    let lastConsumedMessageIndex = (typeof data.lastConsumedMessageIndex !== 'undefined') ? data.lastConsumedMessageIndex : null;
    let status = 'known';
    let type = data.type || Channel.type.PUBLIC;
    let uniqueName = data.uniqueName || null;
    let entityName = data.channel;

    if (data.isPrivate) {
      type = Channel.type.PRIVATE;
    }

    try {
      JSON.stringify(attributes);
    } catch (e) {
      throw new Error('Attributes must be a valid JSON object.');
    }

    let members = new Map();
    let membersEntity = new MembersEntity(this, services.session, services.userInfos, members);
    membersEntity.on('memberJoined', this.emit.bind(this, 'memberJoined'));
    membersEntity.on('memberLeft', this.emit.bind(this, 'memberLeft'));
    membersEntity.on('memberUpdated', this.emit.bind(this, 'memberUpdated'));
    membersEntity.on('memberInfoUpdated', this.emit.bind(this, 'memberInfoUpdated'));

    let messages = [];
    let messagesEntity = new MessagesEntity(this, services.session, messages);
    messagesEntity.on('messageAdded', message => this._onMessageAdded(message));
    messagesEntity.on('messageUpdated', this.emit.bind(this, 'messageUpdated'));
    messagesEntity.on('messageRemoved', this.emit.bind(this, 'messageRemoved'));

    Object.defineProperties(this, {
      _attributes: {
        get: () => attributes,
        set: (_attributes) => attributes = _attributes
      },
      _createdBy: {
        get: () => createdBy,
        set: (_createdBy) => createdBy = _createdBy
      },
      _dateCreated: {
        get: () => dateCreated,
        set: (_dateCreated) => dateCreated = _dateCreated
      },
      _dateUpdated: {
        get: () => dateUpdated,
        set: (_dateUpdated) => dateUpdated = _dateUpdated
      },
      _friendlyName: {
        get: () => friendlyName,
        set: (_friendlyName) => friendlyName = _friendlyName
      },
      _lastConsumedMessageIndex: {
        get: () => lastConsumedMessageIndex,
        set: (_lastConsumedMessageIndex) => lastConsumedMessageIndex = _lastConsumedMessageIndex
      },
      _type: {
        get: () => type,
        set: (_type) => type = _type
      },
      _sid: {
        get: () => sid,
        set: (_sid) => sid = _sid
      },
      _status: {
        get: () => status,
        set: (_status) => status = _status
      },
      _uniqueName: {
        get: () => uniqueName,
        set: (_uniqueName) => uniqueName = _uniqueName
      },
      _entityPromise: { value: null, writable: true },
      _subscribePromise: { value: null, writable: true },
      _membersEntity: { value: membersEntity },
      _messagesEntity: { value: messagesEntity },
      _services: { value: services },
      _session: { value: services.session },
      _typingIndicator: { value: services.typingIndicator },
      _consumptionHorizon: { value: services.consumptionHorizon },
      _entityName: { value: entityName, writable: true },
      _members: { value: members },
      _messages: { value: messages },
      attributes: {
        enumerable: true,
        get: () => attributes
      },
      createdBy: {
        enumerable: true,
        get: () => createdBy
      },
      dateCreated: {
        enumerable: true,
        get: () => dateCreated
      },
      dateUpdated: {
        enumerable: true,
        get: () => dateUpdated
      },
      friendlyName: {
        enumerable: true,
        get: () => friendlyName
      },
      isPrivate: {
        enumerable: true,
        get: () => this._type === Channel.type.PRIVATE
      },
      lastConsumedMessageIndex: {
        enumerable: true,
        get: () => lastConsumedMessageIndex
      },
      sid: {
        enumerable: true,
        get: () => sid
      },
      status: {
        enumerable: true,
        get: () => status
      },
      type: {
        enumerable: true,
        get: () => type
      },
      uniqueName: {
        enumerable: true,
        get: () => uniqueName
      }
    });
  }


  /**
   * Load and Subscribe to this Channel and do not subscribe to its Members and Messages.
   * This or _subscribeStreams will need to be called before any events on Channel will fire.
   * @returns {Promise}
   * @private
   */
  _subscribe() {
    if (this._entityPromise) { return this._entityPromise; }
    this._entityPromise = this._session.datasync.document({ uniqueName: this._entityName, mode: 'open' })
      .then(doc => {
        this._entity = doc;
        doc.on('updated', value => this._update(value));
        this._update(doc.value);
        return this._entity;
      })
      .catch(err => {
        this._enityPromise = null;
        log.error('Failed to get channel object', err);
        throw err;
      });
    return this._entityPromise;
  }

  /**
   * Load the attributes of this Channel and instantiate its Members and Messages.
   * This or _subscribe will need to be called before any events on Channel will fire.
   * This will need to be called before any events on Members or Messages will fire
   * @returns {Promise}
   * @private
   */
  _subscribeStreams() {
    this._subscribePromise = this._subscribePromise || this._subscribe()
      .then(entity => {
        const messagesObjectName = entity.value.messages;
        const rosterObjectName = entity.value.roster;
        return Promise.all([
          this._messagesEntity.subscribe(messagesObjectName),
          this._membersEntity.subscribe(rosterObjectName)
        ]);
      })
      .then(() => this._entity)
      .catch(err => {
        this._subscribePromise = null;
        log.error('Failed to subscribe on channel objects', this.sid, err);
        throw err;
      });
    return this._subscribePromise;
  }

  /**
   * Load the Channel state.
   * @returns {Promise}
   * @private
   */
  _fetch() {
    return this._session.datasync.document({ uniqueName: this._entityName, mode: 'open' }).then(doc => doc.value);
  }

  /**
   * Stop listening for and firing events on this Channel.
   * @returns {Promise}
   * @private
   */
  _unsubscribe() {
    let promises = [];
    if (this._entityPromise) {
      promises.push(this._entity.close());
    }

    promises.push(this._membersEntity.unsubscribe());
    promises.push(this._messagesEntity.unsubscribe());
    this._entityPromise = null;
    this._subscribePromise = null;
    return Promise.all(promises);
  }

  /**
   * Set channel status
   * @private
   */
  _setStatus(status) {
    if (this._status === status) { return; }

    this._status = status;

    if (status === Channel.status.JOINED) {
      this._subscribeStreams();
    } else if (status === Channel.status.INVITED) {
      this._subscribe();
    } else if (this._entityPromise) {
      this._unsubscribe();
    }
  }

  static _preprocessUpdate(update, channelSid) {
    try {
      if (typeof update.attributes === 'string') {
        update.attributes = JSON.parse(update.attributes);
      } else if (update.attributes) {
        JSON.stringify(update.attributes);
      }
    } catch (e) {
      log.warn('Retrieved malformed attributes from the server for channel: ' + channelSid);
      update.attributes = {};
    }

    try {
      if (update.dateCreated) {
        update.dateCreated = new Date(update.dateCreated);
      }
    } catch (e) {
      log.warn('Retrieved malformed attributes from the server for channel: ' + channelSid);
      delete update.dateCreated;
    }

    try {
      if (update.dateUpdated) {
        update.dateUpdated = new Date(update.dateUpdated);
      }
    } catch (e) {
      log.warn('Retrieved malformed attributes from the server for channel: ' + channelSid);
      delete update.dateUpdated;
    }
  }

  /**
   * Updates local channel object with new values
   * @private
   */
  _update(update) {
    Channel._preprocessUpdate(update, this._sid);

    let updated = false;
    for (let key in update) {
      let localKey = fieldMappings[key];
      if (!localKey) {
        continue;
      }

      if (localKey === fieldMappings.status) {
        this._status = filterStatus(update.status);
      } else if (localKey === fieldMappings.attributes) {
        if (!JsonDiff.isDeepEqual(this._attributes, update.attributes)) {
          this._attributes = update.attributes;
          updated = true;
        }
      } else if (update[key] instanceof Date) {
        if (!this[localKey] || this[localKey].getTime() !== update[key].getTime()) {
          this['_' + localKey] = update[key];
          updated = true;
        }
      } else if (this[localKey] !== update[key]) {
        this['_' + localKey] = update[key];
        updated = true;
      }
    }

    // if uniqueName is not present in the update - then we should set it to null on the client object
    if (!update.status && !update.uniqueName) {
      if (this._uniqueName) {
        this._uniqueName = null;
        updated = true;
      }
    }

    if (updated) { this.emit('updated', this); }
  }

  /**
   * @private
   */
  _onMessageAdded(message) {
    for (let member of this._members.values()) {
      if (member.identity === message.author) {
        member._endTyping();
        break;
      }
    }

    this.emit('messageAdded', message);
  }

  /**
   * Add a participant to the Channel by its Identity.
   * @param {String} identity - Identity of the Client to add.
   * @returns {Promise}
   */
  add(identity) {
    if (!identity || typeof identity !== 'string') {
      throw new Error('Channel.add requires an <String>identity parameter');
    }

    return this._membersEntity.add(identity);
  }

  /**
   * Advance last consumed Channel's Message index to current consumption horizon.
   * Last consumed Message index is updated only if new index value is higher than previous.
   * @param {Number} index - Message index to advance to as last read.
   * @returns {Promise}
   */
  advanceLastConsumedMessageIndex(index) {
    if (parseInt(index) !== index) {
      throw new Error('Channel.advanceLastConsumedMessageIndex requires an integral <Number>index parameter');
    }

    if ((this.lastConsumedMessageIndex !== null) && index <= this.lastConsumedMessageIndex || 0) {
      return Promise.resolve();
    }

    return this._subscribeStreams().then(() => {
      this._consumptionHorizon.advanceLastConsumedMessageIndexForChannel(this.sid, index);
    }).then(() => this);
  }

  /**
   * Decline an invitation to the Channel.
   * @returns {Promise<Channel|SessionError>}
   */
  decline() {
    return this._session.addCommand('declineInvitation', {
      channelSid: this._sid
    }).then(() => this);
  }

  /**
   * Delete the Channel.
   * @returns {Promise<Channel|SessionError>}
   */
  delete() {
    return this._session.addCommand('destroyChannel', {
      channelSid: this._sid
    }).then(() => this);
  }

  /**
   * Get the custom attributes of this channel.
   * NOTE: Attributes will be empty in public channels until this is called.
   * However, private channels will already have this due to back-end limitation.
   * @returns {Promise<Object>}
   */
  getAttributes() {
    if (this._entityPromise) {
      return this._subscribe().then(() => this.attributes);
    }

    return this._fetch().then((data) => {
      this._update(data);
      return this.attributes;
    });
  }

  /**
   * Returns messages from channel using paginator interface
   * @param {Number} [pageSize=30] Number of messages to return in single chunk.
   * @param {Number} [anchor] - Index of newest Message to fetch. From the end by default.
   * @returns {Promise<Paginator<Message>>} page of messages
   */
  getMessages(count, anchor) {
    return this._subscribeStreams().then(() => this._messagesEntity.getMessages(count, anchor));
  }

  /**
   * Get a list of all Members joined to this Channel.
   * @returns {Promise<Array<Member>>}
   */
  getMembers() {
    return this._subscribeStreams().then(() => this._membersEntity.getMembers());
  }


  /**
   * Get channel members count
   * @returns {Promise<integer>}
   */
  getMembersCount() {
    return this._session.getSessionLinks()
      .then(links => new UriBuilder(links.publicChannelsUrl).path(this.sid).build())
      .then(url => this._services.network.get(url))
      .then(response => response.body.members_count);
  }

  /**
   * Get total message count in a channel
   * @returns {Promise<integer>}
   */
  getMessagesCount() {
    return this._session.getSessionLinks()
      .then(links => new UriBuilder(links.publicChannelsUrl).path(this.sid).build())
      .then(url => this._services.network.get(url))
      .then(response => response.body.messages_count);
  }

  /**
   * Get unconsumed messages count
   * @returns {Promise<integer>}
   */
  getUnconsumedMessagesCount() {
    return this._session.getSessionLinks()
      .then(links => new UriBuilder(links.myChannelsUrl).arg('ChannelSid', this.sid).build())
      .then(url => this._services.network.get(url))
      .then(response => {
        if (response.body.channels.length) {
          return response.body.channels[0].unread_messages_count || 0;
        }
        throw new Error('Channel not found');
      });
  }

  /**
   * Invite a user to the Channel by their Identity.
   * @param {String} identity - Identity of the user to invite.
   * @returns {Promise}
   */
  invite(identity) {
    if (typeof identity !== 'string' || !identity.length) {
      throw new Error('Channel.invite requires an <String>identity parameter');
    }

    return this._membersEntity.invite(identity);
  }

  /**
   * Join the Channel.
   * @returns {Promise<Channel|SessionError>}
   */
  join() {
    return this._session.addCommand('joinChannel', {
      channelSid: this._sid
    }).then(() => this);
  }

  /**
   * Leave the Channel.
   * @returns {Promise<Channel|SessionError>}
   */
  leave() {
    if (this._status !== Channel.status.JOINED) { return Promise.resolve(this); }

    return this._session.addCommand('leaveChannel', {
      channelSid: this._sid
    }).then(() => this);
  }

  /**
   * Remove a Member from the Channel.
   * @param {Member|String} member - The Member (Or identity) to remove.
   * @returns {Promise<Member>}
   */
  removeMember(member) {
    if (!member || (typeof member !== 'string' && !(member instanceof Member))) {
      throw new Error('Channel.removeMember requires a <String|Member>member parameter.');
    }

    return this._membersEntity.remove(typeof member === 'string' ? member : member.identity);
  }

  /**
   * Send a Message on the Channel.
   * @param {String} messageBody - The message body.
   * @param {Object} messageAttributes - attributes for the message
   * @returns {Promise<String>} A Promise for the message ID
   */
  sendMessage(messageBody, messageAttributes) {
    return this._messagesEntity.send(messageBody, messageAttributes).then(response => response.messageId);
  }

  /**
   * Set last consumed Channel's Message index to last known Message's index in this Channel.
   * @returns {Promise}
   */
  setAllMessagesConsumed() {
    return this._subscribeStreams()
      .then(() => this.getMessages(1))
      .then(messagesPage => {
        if (messagesPage.items.length > 0) {
          this.advanceLastConsumedMessageIndex(messagesPage.items[0].index);
        }
      })
      .then(() => this);
  }

  /**
   * Set all messages in the channel unread
   */
  setNoMessagesConsumed() {
    return this.updateLastConsumedMessageIndex(null);
  }

  /**
   * Send a notification to the server indicating that this Client is currently typing in this Channel.
   * @returns {Promise}
   */
  typing() {
    return this._typingIndicator.send(this._sid);
  }

  /**
   * Update the Channel's attributes.
   * @param {Object} attributes - The new attributes object.
   * @returns {Promise<Channel|SessionError>} A Promise for the Channel
   */
  updateAttributes(attributes) {
    if (typeof attributes === 'undefined') {
      throw new Error('Attributes is a required parameter for updateAttributes');
    } else if (attributes.constructor !== Object)  {
      throw new Error('Attributes must be a valid JSON object.');
    }

    return this._session.addCommand('editAttributes', {
      channelSid: this._sid,
      attributes: JSON.stringify(attributes)
    }).then(() => this);
  }

  /**
   * Update the Channel's friendlyName.
   * @param {String} name - The new Channel friendlyName.
   * @returns {Promise<Channel|SessionError>} A Promise for the Channel
   */
  updateFriendlyName(name) {
    if (this._friendlyName === name) {
      return Promise.resolve(this);
    }

    return this._session.addCommand('editFriendlyName', {
      channelSid: this._sid,
      friendlyName: name
    }).then(() => this);
  }

  /**
   * Set last consumed Channel's Message index to current consumption horizon.
   * @param {Number|null} index - Message index to set as last read. Null if no messages have been read
   * @returns {Promise}
   */
  updateLastConsumedMessageIndex(index) {
    if (index !== null && parseInt(index) !== index) {
      let err = 'Channel.updateLastConsumedMessageIndex requires an integral <Number>index parameter';
      throw new Error(err);
    }

    return this._subscribeStreams().then(() => {
      this._consumptionHorizon.updateLastConsumedMessageIndexForChannel(this.sid, index);
    }).then(() => this);
  }

  /**
   * Update the Channel's type (public or private). Currently not implemented.
   * @param {String} type
   * @private
   * @returns {Promise<Channel>} A Promise for the Channel
   */
  updateType(type) {
    if (type !== Channel.type.PRIVATE && type !== Channel.type.PUBLIC) {
      throw new Error('Can\'t set unknown channel type ' + type);
    }

    if (this._type !== type) {
      throw new Error('Changing of channel type isn\'t supported');
    }

    return Promise.resolve(this);
  }

  /**
   * Update the Channel's unique name (tag).
   * @param {String} uniqueName - The new Channel uniqueName.
   * @returns {Promise<Channel|SessionError>} A Promise for the Channel
   */
  updateUniqueName(uniqueName) {
    if (this._uniqueName === uniqueName) {
      return Promise.resolve(this);
    }

    return this._session.addCommand('editUniqueName', {
      channelSid: this._sid,
      uniqueName: uniqueName
    }).then(() => this);
  }
}

/**
 * The type of Channel (Public or private).
 * @readonly
 * @enum {String}
 */
Channel.type = {
  /** 'public' | This channel is Public. */
  PUBLIC: 'public',
  /** 'private' | This channel is Private. */
  PRIVATE: 'private'
};

/**
 * The status of the Channel, relative to the Client.
 * @readonly
 * @enum {String}
 */
Channel.status = {
  /** 'known' | This Client knows about the Channel, but the User is neither joined nor invited to it. */
  KNOWN: 'known',
  /** 'invited' | This Client's User is invited to the Channel. */
  INVITED: 'invited',
  /** 'joined' | This Client's User is joined to the Channel. */
  JOINED: 'joined',
  /** 'failed' | This Channel is malformed, or has failed to load. */
  FAILED: 'failed'
};

Object.freeze(Channel.type);
Object.freeze(Channel.status);

/**
 * Fired when a Member has joined the Channel.
 * @param {Member} member
 * @event Channel#memberJoined
 */
/**
 * Fired when a Member has left the Channel.
 * @param {Member} member
 * @event Channel#memberLeft
 */
/**
 * Fired when a Member's fields has been updated.
 * @param {Member} member
 * @event Channel#memberUpdated
 */
/**
 * Fired when a Member's UserInfo fields has been updated.
 * @param {Member} member
 * @event Channel#memberInfoUpdated
 */
/**
 * Fired when a new Message has been added to the Channel on the server.
 * @param {Message} message
 * @event Channel#messageAdded
 */
/**
 * Fired when Message is removed from Channel's message list.
 * @param {Message} message
 * @event Channel#messageRemoved
 */
/**
 * Fired when an existing Message's fields are updated with new values.
 * @param {Message} message
 * @event Channel#messageUpdated
 */
/**
 * Fired when a member has stopped typing.
 * @param {Member} member
 * @event Channel#typingEnded
 */
/**
 * Fired when a member has begun typing.
 * @param {Member} member
 * @event Channel#typingStarted
 */
/**
 * Fired when the Channel's fields have been updated.
 * @param {Channel} channel
 * @event Channel#updated
 */

module.exports = Channel;
