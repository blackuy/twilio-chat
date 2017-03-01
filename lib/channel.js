'use strict';

var _freeze = require('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventEmitter = require('events').EventEmitter;

var MembersEntity = require('./data/members');
var Member = require('./member');
var MessagesEntity = require('./data/messages');
var JsonDiff = require('./util/jsondiff');
var log = require('./logger');

var UriBuilder = require('./util').UriBuilder;

var fieldMappings = {
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

var Channel = function (_EventEmitter) {
  (0, _inherits3.default)(Channel, _EventEmitter);

  function Channel(services, data, sid) {
    (0, _classCallCheck3.default)(this, Channel);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Channel.__proto__ || (0, _getPrototypeOf2.default)(Channel)).call(this));

    var attributes = data.attributes || {};
    var createdBy = data.createdBy;
    var dateCreated = parseTime(data.dateCreated);
    var dateUpdated = parseTime(data.dateUpdated);
    var friendlyName = data.name || data.friendlyName || null;
    var lastConsumedMessageIndex = typeof data.lastConsumedMessageIndex !== 'undefined' ? data.lastConsumedMessageIndex : null;
    var status = 'known';
    var type = data.type || Channel.type.PUBLIC;
    var uniqueName = data.uniqueName || null;
    var entityName = data.channel;

    if (data.isPrivate) {
      type = Channel.type.PRIVATE;
    }

    try {
      (0, _stringify2.default)(attributes);
    } catch (e) {
      throw new Error('Attributes must be a valid JSON object.');
    }

    var members = new _map2.default();
    var membersEntity = new MembersEntity(_this, services.session, services.userInfos, members);
    membersEntity.on('memberJoined', _this.emit.bind(_this, 'memberJoined'));
    membersEntity.on('memberLeft', _this.emit.bind(_this, 'memberLeft'));
    membersEntity.on('memberUpdated', _this.emit.bind(_this, 'memberUpdated'));
    membersEntity.on('memberInfoUpdated', _this.emit.bind(_this, 'memberInfoUpdated'));

    var messages = [];
    var messagesEntity = new MessagesEntity(_this, services.session, messages);
    messagesEntity.on('messageAdded', function (message) {
      return _this._onMessageAdded(message);
    });
    messagesEntity.on('messageUpdated', _this.emit.bind(_this, 'messageUpdated'));
    messagesEntity.on('messageRemoved', _this.emit.bind(_this, 'messageRemoved'));

    (0, _defineProperties2.default)(_this, {
      _attributes: {
        get: function get() {
          return attributes;
        },
        set: function set(_attributes) {
          return attributes = _attributes;
        }
      },
      _createdBy: {
        get: function get() {
          return createdBy;
        },
        set: function set(_createdBy) {
          return createdBy = _createdBy;
        }
      },
      _dateCreated: {
        get: function get() {
          return dateCreated;
        },
        set: function set(_dateCreated) {
          return dateCreated = _dateCreated;
        }
      },
      _dateUpdated: {
        get: function get() {
          return dateUpdated;
        },
        set: function set(_dateUpdated) {
          return dateUpdated = _dateUpdated;
        }
      },
      _friendlyName: {
        get: function get() {
          return friendlyName;
        },
        set: function set(_friendlyName) {
          return friendlyName = _friendlyName;
        }
      },
      _lastConsumedMessageIndex: {
        get: function get() {
          return lastConsumedMessageIndex;
        },
        set: function set(_lastConsumedMessageIndex) {
          return lastConsumedMessageIndex = _lastConsumedMessageIndex;
        }
      },
      _type: {
        get: function get() {
          return type;
        },
        set: function set(_type) {
          return type = _type;
        }
      },
      _sid: {
        get: function get() {
          return sid;
        },
        set: function set(_sid) {
          return sid = _sid;
        }
      },
      _status: {
        get: function get() {
          return status;
        },
        set: function set(_status) {
          return status = _status;
        }
      },
      _uniqueName: {
        get: function get() {
          return uniqueName;
        },
        set: function set(_uniqueName) {
          return uniqueName = _uniqueName;
        }
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
        get: function get() {
          return attributes;
        }
      },
      createdBy: {
        enumerable: true,
        get: function get() {
          return createdBy;
        }
      },
      dateCreated: {
        enumerable: true,
        get: function get() {
          return dateCreated;
        }
      },
      dateUpdated: {
        enumerable: true,
        get: function get() {
          return dateUpdated;
        }
      },
      friendlyName: {
        enumerable: true,
        get: function get() {
          return friendlyName;
        }
      },
      isPrivate: {
        enumerable: true,
        get: function get() {
          return _this._type === Channel.type.PRIVATE;
        }
      },
      lastConsumedMessageIndex: {
        enumerable: true,
        get: function get() {
          return lastConsumedMessageIndex;
        }
      },
      sid: {
        enumerable: true,
        get: function get() {
          return sid;
        }
      },
      status: {
        enumerable: true,
        get: function get() {
          return status;
        }
      },
      type: {
        enumerable: true,
        get: function get() {
          return type;
        }
      },
      uniqueName: {
        enumerable: true,
        get: function get() {
          return uniqueName;
        }
      }
    });
    return _this;
  }

  /**
   * Load and Subscribe to this Channel and do not subscribe to its Members and Messages.
   * This or _subscribeStreams will need to be called before any events on Channel will fire.
   * @returns {Promise}
   * @private
   */


  (0, _createClass3.default)(Channel, [{
    key: '_subscribe',
    value: function _subscribe() {
      var _this2 = this;

      if (this._entityPromise) {
        return this._entityPromise;
      }
      this._entityPromise = this._session.datasync.document({ uniqueName: this._entityName, mode: 'open' }).then(function (doc) {
        _this2._entity = doc;
        doc.on('updated', function (value) {
          return _this2._update(value);
        });
        _this2._update(doc.value);
        return _this2._entity;
      }).catch(function (err) {
        _this2._enityPromise = null;
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

  }, {
    key: '_subscribeStreams',
    value: function _subscribeStreams() {
      var _this3 = this;

      this._subscribePromise = this._subscribePromise || this._subscribe().then(function (entity) {
        var messagesObjectName = entity.value.messages;
        var rosterObjectName = entity.value.roster;
        return _promise2.default.all([_this3._messagesEntity.subscribe(messagesObjectName), _this3._membersEntity.subscribe(rosterObjectName)]);
      }).then(function () {
        return _this3._entity;
      }).catch(function (err) {
        _this3._subscribePromise = null;
        log.error('Failed to subscribe on channel objects', _this3.sid, err);
        throw err;
      });
      return this._subscribePromise;
    }

    /**
     * Load the Channel state.
     * @returns {Promise}
     * @private
     */

  }, {
    key: '_fetch',
    value: function _fetch() {
      return this._session.datasync.document({ uniqueName: this._entityName, mode: 'open' }).then(function (doc) {
        return doc.value;
      });
    }

    /**
     * Stop listening for and firing events on this Channel.
     * @returns {Promise}
     * @private
     */

  }, {
    key: '_unsubscribe',
    value: function _unsubscribe() {
      var promises = [];
      if (this._entityPromise) {
        promises.push(this._entity.close());
      }

      promises.push(this._membersEntity.unsubscribe());
      promises.push(this._messagesEntity.unsubscribe());
      this._entityPromise = null;
      this._subscribePromise = null;
      return _promise2.default.all(promises);
    }

    /**
     * Set channel status
     * @private
     */

  }, {
    key: '_setStatus',
    value: function _setStatus(status) {
      if (this._status === status) {
        return;
      }

      this._status = status;

      if (status === Channel.status.JOINED) {
        this._subscribeStreams();
      } else if (status === Channel.status.INVITED) {
        this._subscribe();
      } else if (this._entityPromise) {
        this._unsubscribe();
      }
    }
  }, {
    key: '_update',


    /**
     * Updates local channel object with new values
     * @private
     */
    value: function _update(update) {
      Channel._preprocessUpdate(update, this._sid);

      var updated = false;
      for (var key in update) {
        var localKey = fieldMappings[key];
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

      if (updated) {
        this.emit('updated', this);
      }
    }

    /**
     * @private
     */

  }, {
    key: '_onMessageAdded',
    value: function _onMessageAdded(message) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(this._members.values()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var member = _step.value;

          if (member.identity === message.author) {
            member._endTyping();
            break;
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

      this.emit('messageAdded', message);
    }

    /**
     * Add a participant to the Channel by its Identity.
     * @param {String} identity - Identity of the Client to add.
     * @returns {Promise}
     */

  }, {
    key: 'add',
    value: function add(identity) {
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

  }, {
    key: 'advanceLastConsumedMessageIndex',
    value: function advanceLastConsumedMessageIndex(index) {
      var _this4 = this;

      if (parseInt(index) !== index) {
        throw new Error('Channel.advanceLastConsumedMessageIndex requires an integral <Number>index parameter');
      }

      if (this.lastConsumedMessageIndex !== null && index <= this.lastConsumedMessageIndex || 0) {
        return _promise2.default.resolve();
      }

      return this._subscribeStreams().then(function () {
        _this4._consumptionHorizon.advanceLastConsumedMessageIndexForChannel(_this4.sid, index);
      }).then(function () {
        return _this4;
      });
    }

    /**
     * Decline an invitation to the Channel.
     * @returns {Promise<Channel|SessionError>}
     */

  }, {
    key: 'decline',
    value: function decline() {
      var _this5 = this;

      return this._session.addCommand('declineInvitation', {
        channelSid: this._sid
      }).then(function () {
        return _this5;
      });
    }

    /**
     * Delete the Channel.
     * @returns {Promise<Channel|SessionError>}
     */

  }, {
    key: 'delete',
    value: function _delete() {
      var _this6 = this;

      return this._session.addCommand('destroyChannel', {
        channelSid: this._sid
      }).then(function () {
        return _this6;
      });
    }

    /**
     * Get the custom attributes of this channel.
     * NOTE: Attributes will be empty in public channels until this is called.
     * However, private channels will already have this due to back-end limitation.
     * @returns {Promise<Object>}
     */

  }, {
    key: 'getAttributes',
    value: function getAttributes() {
      var _this7 = this;

      if (this._entityPromise) {
        return this._subscribe().then(function () {
          return _this7.attributes;
        });
      }

      return this._fetch().then(function (data) {
        _this7._update(data);
        return _this7.attributes;
      });
    }

    /**
     * Returns messages from channel using paginator interface
     * @param {Number} [pageSize=30] Number of messages to return in single chunk.
     * @param {Number} [anchor] - Index of newest Message to fetch. From the end by default.
     * @returns {Promise<Paginator<Message>>} page of messages
     */

  }, {
    key: 'getMessages',
    value: function getMessages(count, anchor) {
      var _this8 = this;

      return this._subscribeStreams().then(function () {
        return _this8._messagesEntity.getMessages(count, anchor);
      });
    }

    /**
     * Get a list of all Members joined to this Channel.
     * @returns {Promise<Array<Member>>}
     */

  }, {
    key: 'getMembers',
    value: function getMembers() {
      var _this9 = this;

      return this._subscribeStreams().then(function () {
        return _this9._membersEntity.getMembers();
      });
    }

    /**
     * Get channel members count
     * @returns {Promise<integer>}
     */

  }, {
    key: 'getMembersCount',
    value: function getMembersCount() {
      var _this10 = this;

      return this._session.getSessionLinks().then(function (links) {
        return new UriBuilder(links.publicChannelsUrl).path(_this10.sid).build();
      }).then(function (url) {
        return _this10._services.network.get(url);
      }).then(function (response) {
        return response.body.members_count;
      });
    }

    /**
     * Get total message count in a channel
     * @returns {Promise<integer>}
     */

  }, {
    key: 'getMessagesCount',
    value: function getMessagesCount() {
      var _this11 = this;

      return this._session.getSessionLinks().then(function (links) {
        return new UriBuilder(links.publicChannelsUrl).path(_this11.sid).build();
      }).then(function (url) {
        return _this11._services.network.get(url);
      }).then(function (response) {
        return response.body.messages_count;
      });
    }

    /**
     * Get unconsumed messages count
     * @returns {Promise<integer>}
     */

  }, {
    key: 'getUnconsumedMessagesCount',
    value: function getUnconsumedMessagesCount() {
      var _this12 = this;

      return this._session.getSessionLinks().then(function (links) {
        return new UriBuilder(links.myChannelsUrl).arg('ChannelSid', _this12.sid).build();
      }).then(function (url) {
        return _this12._services.network.get(url);
      }).then(function (response) {
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

  }, {
    key: 'invite',
    value: function invite(identity) {
      if (typeof identity !== 'string' || !identity.length) {
        throw new Error('Channel.invite requires an <String>identity parameter');
      }

      return this._membersEntity.invite(identity);
    }

    /**
     * Join the Channel.
     * @returns {Promise<Channel|SessionError>}
     */

  }, {
    key: 'join',
    value: function join() {
      var _this13 = this;

      return this._session.addCommand('joinChannel', {
        channelSid: this._sid
      }).then(function () {
        return _this13;
      });
    }

    /**
     * Leave the Channel.
     * @returns {Promise<Channel|SessionError>}
     */

  }, {
    key: 'leave',
    value: function leave() {
      var _this14 = this;

      if (this._status !== Channel.status.JOINED) {
        return _promise2.default.resolve(this);
      }

      return this._session.addCommand('leaveChannel', {
        channelSid: this._sid
      }).then(function () {
        return _this14;
      });
    }

    /**
     * Remove a Member from the Channel.
     * @param {Member|String} member - The Member (Or identity) to remove.
     * @returns {Promise<Member>}
     */

  }, {
    key: 'removeMember',
    value: function removeMember(member) {
      if (!member || typeof member !== 'string' && !(member instanceof Member)) {
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

  }, {
    key: 'sendMessage',
    value: function sendMessage(messageBody, messageAttributes) {
      return this._messagesEntity.send(messageBody, messageAttributes).then(function (response) {
        return response.messageId;
      });
    }

    /**
     * Set last consumed Channel's Message index to last known Message's index in this Channel.
     * @returns {Promise}
     */

  }, {
    key: 'setAllMessagesConsumed',
    value: function setAllMessagesConsumed() {
      var _this15 = this;

      return this._subscribeStreams().then(function () {
        return _this15.getMessages(1);
      }).then(function (messagesPage) {
        if (messagesPage.items.length > 0) {
          _this15.advanceLastConsumedMessageIndex(messagesPage.items[0].index);
        }
      }).then(function () {
        return _this15;
      });
    }

    /**
     * Set all messages in the channel unread
     */

  }, {
    key: 'setNoMessagesConsumed',
    value: function setNoMessagesConsumed() {
      return this.updateLastConsumedMessageIndex(null);
    }

    /**
     * Send a notification to the server indicating that this Client is currently typing in this Channel.
     * @returns {Promise}
     */

  }, {
    key: 'typing',
    value: function typing() {
      return this._typingIndicator.send(this._sid);
    }

    /**
     * Update the Channel's attributes.
     * @param {Object} attributes - The new attributes object.
     * @returns {Promise<Channel|SessionError>} A Promise for the Channel
     */

  }, {
    key: 'updateAttributes',
    value: function updateAttributes(attributes) {
      var _this16 = this;

      if (typeof attributes === 'undefined') {
        throw new Error('Attributes is a required parameter for updateAttributes');
      } else if (attributes.constructor !== Object) {
        throw new Error('Attributes must be a valid JSON object.');
      }

      return this._session.addCommand('editAttributes', {
        channelSid: this._sid,
        attributes: (0, _stringify2.default)(attributes)
      }).then(function () {
        return _this16;
      });
    }

    /**
     * Update the Channel's friendlyName.
     * @param {String} name - The new Channel friendlyName.
     * @returns {Promise<Channel|SessionError>} A Promise for the Channel
     */

  }, {
    key: 'updateFriendlyName',
    value: function updateFriendlyName(name) {
      var _this17 = this;

      if (this._friendlyName === name) {
        return _promise2.default.resolve(this);
      }

      return this._session.addCommand('editFriendlyName', {
        channelSid: this._sid,
        friendlyName: name
      }).then(function () {
        return _this17;
      });
    }

    /**
     * Set last consumed Channel's Message index to current consumption horizon.
     * @param {Number|null} index - Message index to set as last read. Null if no messages have been read
     * @returns {Promise}
     */

  }, {
    key: 'updateLastConsumedMessageIndex',
    value: function updateLastConsumedMessageIndex(index) {
      var _this18 = this;

      if (index !== null && parseInt(index) !== index) {
        var err = 'Channel.updateLastConsumedMessageIndex requires an integral <Number>index parameter';
        throw new Error(err);
      }

      return this._subscribeStreams().then(function () {
        _this18._consumptionHorizon.updateLastConsumedMessageIndexForChannel(_this18.sid, index);
      }).then(function () {
        return _this18;
      });
    }

    /**
     * Update the Channel's type (public or private). Currently not implemented.
     * @param {String} type
     * @private
     * @returns {Promise<Channel>} A Promise for the Channel
     */

  }, {
    key: 'updateType',
    value: function updateType(type) {
      if (type !== Channel.type.PRIVATE && type !== Channel.type.PUBLIC) {
        throw new Error('Can\'t set unknown channel type ' + type);
      }

      if (this._type !== type) {
        throw new Error('Changing of channel type isn\'t supported');
      }

      return _promise2.default.resolve(this);
    }

    /**
     * Update the Channel's unique name (tag).
     * @param {String} uniqueName - The new Channel uniqueName.
     * @returns {Promise<Channel|SessionError>} A Promise for the Channel
     */

  }, {
    key: 'updateUniqueName',
    value: function updateUniqueName(uniqueName) {
      var _this19 = this;

      if (this._uniqueName === uniqueName) {
        return _promise2.default.resolve(this);
      }

      return this._session.addCommand('editUniqueName', {
        channelSid: this._sid,
        uniqueName: uniqueName
      }).then(function () {
        return _this19;
      });
    }
  }], [{
    key: '_preprocessUpdate',
    value: function _preprocessUpdate(update, channelSid) {
      try {
        if (typeof update.attributes === 'string') {
          update.attributes = JSON.parse(update.attributes);
        } else if (update.attributes) {
          (0, _stringify2.default)(update.attributes);
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
  }]);
  return Channel;
}(EventEmitter);

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

(0, _freeze2.default)(Channel.type);
(0, _freeze2.default)(Channel.status);

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