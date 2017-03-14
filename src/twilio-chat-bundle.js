(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.Twilio||(g.Twilio = {}));g=(g.Chat||(g.Chat = {}));g.Client = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _getIterator2 = _dereq_('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;

var MembersEntity = _dereq_('./data/members');
var Member = _dereq_('./member');
var MessagesEntity = _dereq_('./data/messages');
var JsonDiff = _dereq_('./util/jsondiff');
var log = _dereq_('./logger');

var UriBuilder = _dereq_('./util').UriBuilder;

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

},{"./data/members":6,"./data/messages":7,"./logger":10,"./member":11,"./util":21,"./util/jsondiff":22,"babel-runtime/core-js/get-iterator":25,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],2:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var log = _dereq_('./logger');

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

var ChannelDescriptor = function () {
  /**
   * @param {Client} chat client instance
   * @param {Object} channel descriptor data object
   * @private
   */
  function ChannelDescriptor(client, descriptor) {
    (0, _classCallCheck3.default)(this, ChannelDescriptor);

    (0, _defineProperties2.default)(this, {
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

  (0, _createClass3.default)(ChannelDescriptor, [{
    key: 'getChannel',
    value: function getChannel() {
      return this._client.getChannelBySid(this.sid);
    }
  }]);
  return ChannelDescriptor;
}();

module.exports = ChannelDescriptor;

},{"./logger":10,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],3:[function(_dereq_,module,exports){
'use strict';

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var log = _dereq_('./logger');

var NotificationClient = _dereq_('twilio-notifications');
var TwilsockClient = _dereq_('twilsock');
var Transport = _dereq_('twilio-transport');
var SyncClient = _dereq_('twilio-sync');

var Configuration = _dereq_('./configuration');
var Session = _dereq_('./session');
var ChannelsEntity = _dereq_('./data/channels');

var PublicChannels = _dereq_('./data/publicchannels');

var UserInfos = _dereq_('./data/userinfos');
var TypingIndicator = _dereq_('./services/typingindicator');
var ConsumptionHorizon = _dereq_('./services/consumptionhorizon');
var Network = _dereq_('./services/network');

var SDK_VERSION = _dereq_('./../package.json').version;

/**
 * @classdesc A Client provides an interface for the local
 *   User to interact with Channels. The Client constructor will
 *   synchronously return an instance of Client, and will hold
 *   any outgoing methods until it has asynchronously finished
 *   syncing with the server.
 * @property {Boolean} reachabilityEnabled - State of reachability feature
 * @property {Map<sid, Channel>} channels - A Map containing all Channels known locally on
 *   the Client. To ensure the Channels have loaded before getting a response, use
 *   {@link Client#getChannels}.
 * @property {UserInfo} userInfo - User information for logged in user
 * @property {Client#connectionState} connectionState - Connection state info
 *
 * @fires Client#channelAdded
 * @fires Client#channelInvited
 * @fires Client#channelJoined
 * @fires Client#channelLeft
 * @fires Client#channelRemoved
 * @fires Client#channelUpdated
 * @fires Client#memberJoined
 * @fires Client#memberLeft
 * @fires Client#memberUpdated
 * @fires Client#messageAdded
 * @fires Client#messageRemoved
 * @fires Client#messageUpdated
 * @fires Client#typingEnded
 * @fires Client#typingStarted
 * @fires Client#userInfoUpdated
 * @fires Client#connectionStateChanged
 */

var Client = function (_EventEmitter) {
  (0, _inherits3.default)(Client, _EventEmitter);

  /**
   * @param {string} token - Access token
   * @param {Client#ClientOptions} options - Options to customize the Client
   */
  function Client(token, options) {
    (0, _classCallCheck3.default)(this, Client);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Client.__proto__ || (0, _getPrototypeOf2.default)(Client)).call(this));

    options = options || {};
    options.logLevel = options.logLevel || 'error';
    options.productId = 'ip_messaging';

    if (!token) {
      throw new Error('A valid Twilio token must be passed to Chat client');
    }

    log.setLevel(options.logLevel);
    var config = new Configuration(token, options);

    options.twilsockClient = options.twilsockClient || new TwilsockClient(token, options);
    options.transport = options.transport || new Transport(options.twilsockClient, options);
    options.notificationsClient = options.notificationsClient || new NotificationClient(token, options);
    options.syncClient = options.syncClient || new SyncClient(token, options);

    var sync = options.syncClient;
    var transport = options.transport;
    var twilsock = options.twilsockClient;
    var notifications = options.notificationsClient;

    var session = new Session(sync, transport, config);
    var sessionPromise = session.initialize(token);

    var network = new Network(config, session, transport);

    var userInfos = new UserInfos(session, sync, null);
    userInfos.on('userInfoUpdated', _this.emit.bind(_this, 'userInfoUpdated'));

    var consumptionHorizon = new ConsumptionHorizon(config, session);
    var typingIndicator = new TypingIndicator(config, transport, notifications, _this.getChannelBySid.bind(_this));

    var channelsEntity = new ChannelsEntity({ session: session, userInfos: userInfos, typingIndicator: typingIndicator, consumptionHorizon: consumptionHorizon, network: network, config: config });
    var channelsPromise = sessionPromise.then(function () {
      channelsEntity.on('channelAdded', _this.emit.bind(_this, 'channelAdded'));
      channelsEntity.on('channelRemoved', _this.emit.bind(_this, 'channelRemoved'));
      channelsEntity.on('channelInvited', _this.emit.bind(_this, 'channelInvited'));
      channelsEntity.on('channelJoined', _this.emit.bind(_this, 'channelJoined'));
      channelsEntity.on('channelLeft', _this.emit.bind(_this, 'channelLeft'));
      channelsEntity.on('channelUpdated', _this.emit.bind(_this, 'channelUpdated'));

      channelsEntity.on('memberJoined', _this.emit.bind(_this, 'memberJoined'));
      channelsEntity.on('memberLeft', _this.emit.bind(_this, 'memberLeft'));
      channelsEntity.on('memberUpdated', _this.emit.bind(_this, 'memberUpdated'));

      channelsEntity.on('messageAdded', _this.emit.bind(_this, 'messageAdded'));
      channelsEntity.on('messageUpdated', _this.emit.bind(_this, 'messageUpdated'));
      channelsEntity.on('messageRemoved', _this.emit.bind(_this, 'messageRemoved'));

      channelsEntity.on('typingStarted', _this.emit.bind(_this, 'typingStarted'));
      channelsEntity.on('typingEnded', _this.emit.bind(_this, 'typingEnded'));

      return channelsEntity.fetchChannels();
    }).then(function () {
      return channelsEntity;
    });

    notifications.on('transportReady', function (state) {
      if (state) {
        _this._connectionState = Client.connectionState.CONNECTED;
        _this._session.syncToken().catch(function (err) {
          log.error('Failed to sync session token', err);
        });
      } else {
        switch (_this._twilsock.state) {
          case 'rejected':
            _this._connectionState = Client.connectionState.DENIED;
            break;
          default:
            _this._connectionState = Client.connectionState.CONNECTING;
        }
      }
      _this.emit('connectionStateChanged', _this._connectionState);
    });

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _channelsPromise: { value: channelsPromise },
      _channels: { value: channelsEntity },
      _transport: { value: network },
      _datasync: { value: sync },
      _notifications: { value: notifications },
      _session: { value: session },
      _sessionPromise: { value: sessionPromise },
      _initializePromise: { value: null, writable: true },
      _twilsock: { value: twilsock },
      _typingIndicator: { value: typingIndicator },
      _userInfos: { value: userInfos },
      _publicChannels: { value: null, writable: true },
      _connectionState: { value: Client.connectionState.CONNECTING, writable: true },
      userInfo: {
        enumerable: true,
        get: function get() {
          return _this._userInfos.myUserInfo;
        }
      },
      connectionState: {
        enumerable: true,
        get: function get() {
          return _this._connectionState;
        }
      },
      reachabilityEnabled: {
        enumerable: true,
        get: function get() {
          return _this._session.reachabilityEnabled;
        }
      }
    });

    _this._initializePromise = _this._initialize();
    return _this;
  }

  /**
   * @returns {Promise.<T>|Request}
   * @private
   */

  (0, _createClass3.default)(Client, [{
    key: '_initialize',
    value: function _initialize() {
      var _this2 = this;

      return this._sessionPromise.then(function () {
        _this2._notifications.subscribe('twilio.channel.new_message', 'apn');
        _this2._notifications.subscribe('twilio.channel.added_to_channel', 'apn');
        _this2._notifications.subscribe('twilio.channel.invited_to_channel', 'apn');

        _this2._notifications.subscribe('twilio.channel.new_message', 'gcm');
        _this2._notifications.subscribe('twilio.channel.added_to_channel', 'gcm');
        _this2._notifications.subscribe('twilio.channel.invited_to_channel', 'gcm');

        return _this2._session.getSessionLinks().then(function (links) {
          return links.publicChannelsUrl;
        }).then(function (url) {
          _this2._publicChannels = new PublicChannels(_this2._config, _this2, _this2._transport, url);
          return _this2._publicChannels;
        });
      }).then(this._typingIndicator.initialize());
    }

    /**
     * @private
     */

  }, {
    key: '_getSession',
    value: function _getSession() {
      return this._sessionPromise;
    }

    /**
     * Initializes library
     * Library will be eventually initialized even without this method called,
     * but client can use returned promise to track library initialization state.
     * It's safe to call this method multiple times. It won't reinitialize library in ready state.
     *
     * @public
     * @returns {Promise<Client>}
     */

  }, {
    key: 'initialize',
    value: function initialize() {
      var _this3 = this;

      return this._initializePromise.then(function () {
        return _this3;
      });
    }

    /**
     * Gracefully shutting down library instance
     */

  }, {
    key: 'shutdown',
    value: function shutdown() {
      return this._twilsock.disconnect();
    }

    /**
     * Update the token used by the Client and re-register with IP Messaging services.
     * @param {String} token - The JWT string of the new token.
     * @public
     * @returns {Promise<Client>}
     */

  }, {
    key: 'updateToken',
    value: function updateToken(token) {
      var _this4 = this;

      log.info('updateToken');
      if (token === this._config.token) {
        return _promise2.default.resolve(this);
      }

      return this._datasync.updateToken(token).then(function () {
        return _this4._notifications.updateToken(token);
      }).then(function () {
        return _this4._twilsock.updateToken(token);
      }).then(function () {
        return _this4._sessionPromise;
      }).then(function () {
        return _this4._session.updateToken(token);
      }).then(function () {
        return _this4._config.updateToken(token);
      }).then(function () {
        return _this4;
      });
    }

    /**
     * Get a Channel by its SID.
     * @param {String} channelSid - The sid of the Channel to get.
     * @returns {Promise<Channel>}
     */

  }, {
    key: 'getChannelBySid',
    value: function getChannelBySid(channelSid) {
      var _this5 = this;

      if (!channelSid || typeof channelSid !== 'string') {
        throw new Error('Client.getChannelBySid requires a <String>channelSid parameter');
      }

      return this._channels.getChannel(channelSid).then(function (channel) {
        return channel || _this5._publicChannels.getChannelBySid(channelSid).then(function (x) {
          return _this5._channels.pushChannel(x);
        });
      });
    }

    /**
     * Get a Channel by its unique identifier name.
     * @param {String} uniqueName - The unique identifier name of the Channel to get.
     * @returns {Promise<Channel>}
     */

  }, {
    key: 'getChannelByUniqueName',
    value: function getChannelByUniqueName(uniqueName) {
      var _this6 = this;

      if (!uniqueName || typeof uniqueName !== 'string') {
        throw new Error('Client.getChannelByUniqueName requires a <String>uniqueName parameter');
      }

      // Currently it's not cached on client, fix?
      return this._publicChannels.getChannelByUniqueName(uniqueName).then(function (x) {
        return _this6._channels.pushChannel(x);
      });
    }

    /**
     * Get the current list of all Channels the Client knows about.
     * @returns {Promise<Paginator<Channel>>}
     */

  }, {
    key: 'getUserChannels',
    value: function getUserChannels(args) {
      return this._channelsPromise.then(function (channels) {
        return channels.getChannels(args);
      });
    }

    /**
     * Get the public channels directory content
     * @returns {Promise<Paginator<ChannelDescriptor>>}
     */

  }, {
    key: 'getPublicChannels',
    value: function getPublicChannels() {
      return this._publicChannels.getChannels();
    }

    /**
     * Create a channel on the server.
     * @param {Client#CreateChannelOptions} [options] - Options for the Channel
     * @returns {Promise<Channel>}
     */

  }, {
    key: 'createChannel',
    value: function createChannel(options) {
      options = options || {};
      return this._channelsPromise.then(function (channelsEntity) {
        return channelsEntity.addChannel(options);
      });
    }

    /**
     * Registers for push notifications
     * @param {string} registrationId - Push notification id provided by platform
     * @param {string} channelType - 'gcm' or 'apn' for now
     * @private
     */

  }, {
    key: 'setPushRegistrationId',
    value: function setPushRegistrationId(registrationId, type) {
      this._notifications.setPushRegistrationId(registrationId, type || 'gcm');
    }

    /**
     * Push notification payload handler
     * @private
     */

  }, {
    key: 'putPushNotificationPayload',
    value: function putPushNotificationPayload(notification) {
      var data = notification.additionalData;
      switch (data.type) {
        case 'twilio.channel.new_message':
          {
            var channelId = data.data.channel_id;
            var messageSid = data.data.message_id;
            this.getChannelBySid(channelId).then(function (channel) {
              return channel.getMessages(10, messageSid);
            });
          }
      }
    }
  }]);
  return Client;
}(EventEmitter);

/**
 * Current version of Chat client.
 * @name Client#version
 * @type String
 * @readonly
 */

(0, _defineProperties2.default)(Client, {
  version: {
    enumerable: true,
    value: SDK_VERSION
  }
});

/**
 * Service connection state
 * @alias Client#connectionState
 * @readonly
 * @enum {String}
 */
Client.connectionState = {
  /** Client is offline and no connection attempt in process. */
  DISCONNECTED: 'disconnected',
  /** Client is offline and connection attempt is in process. */
  CONNECTING: 'connecting',
  /** Client is online and ready. */
  CONNECTED: 'connected',
  /** Client connection is in the erroneous state. */
  ERROR: 'error',
  /** Client connection is denied because of invalid token */
  DENIED: 'denied'
};
(0, _freeze2.default)(Client.connectionState);

/**
 * These options can be passed to Client.createChannel
 * @typedef {Object} Client#CreateChannelOptions
 * @property {Object} [attributes] - Any custom attributes to attach to the Channel.
 * @property {Boolean} [isPrivate] - Whether or not this Channel should be visible
 *  to uninvited Clients.
 * @property {String} [friendlyName] - The non-unique display name of the Channel.
 * @property {String} [uniqueName] - The unique identity name of the Channel.
 */

/**
 * These options can be passed to Client constructor
 * @typedef {Object} Client#ClientOptions
 * @property {String} [logLevel='error'] - The level of logging to enable. Valid options
 *   (from strictest to broadest): ['silent', 'error', 'warn', 'info', 'debug', 'trace']
 */

/**
 * Fired when a Channel becomes visible to the Client.
 * Only fired for private channels
 * @param {Channel} channel
 * @event Client#channelAdded
 */
/**
 * Fired when the Client is invited to a Channel.
 * @param {Channel} channel
 * @event Client#channelInvited
 */
/**
 * Fired when the Client joins a Channel.
 * @param {Channel} channel
 * @event Client#channelJoined
 */
/**
 * Fired when the Client leaves a Channel.
 * @param {Channel} channel
 * @event Client#channelLeft
 */
/**
 * Fired when a Channel is no longer visible to the Client.
 * Only fired for private channels
 * @param {Channel} channel
 * @event Client#channelRemoved
 */
/**
 * Fired when a Channel's attributes or metadata have been updated.
 * @param {Channel} channel
 * @event Client#channelUpdated
 */
/**
 * Fired when a Member has joined the Channel.
 * @param {Member} member
 * @event Client#memberJoined
 */
/**
 * Fired when a Member has left the Channel.
 * @param {Member} member
 * @event Client#memberLeft
 */
/**
 * Fired when a Member's fields has been updated.
 * @param {Member} member
 * @event Client#memberUpdated
 */
/**
 * Fired when a new Message has been added to the Channel on the server.
 * @param {Message} message
 * @event Client#messageAdded
 */
/**
 * Fired when Message is removed from Channel's message list.
 * @param {Message} message
 * @event Client#messageRemoved
 */
/**
 * Fired when an existing Message's fields are updated with new values.
 * @param {Message} message
 * @event Client#messageUpdated
 */
/**
 * Fired when a member has stopped typing.
 * @param {Member} member
 * @event Client#typingEnded
 */
/**
 * Fired when a member has begun typing.
 * @param {Member} member
 * @event Client#typingStarted
 */
/**
 * Fired when a userInfo has been updated.
 * @param {UserInfo} UserInfo
 * @event Client#userInfoUpdated
 */
/**
 * Fired when connection state has been changed.
 * @param {Client#connectionState} ConnectionState
 * @event Client#connectionStateChanged
 */

module.exports = Client;

},{"./../package.json":239,"./configuration":4,"./data/channels":5,"./data/publicchannels":8,"./data/userinfos":9,"./logger":10,"./services/consumptionhorizon":14,"./services/network":15,"./services/typingindicator":16,"./session":17,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186,"twilio-notifications":197,"twilio-sync":208,"twilio-transport":224,"twilsock":227}],4:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _isInteger = _dereq_('babel-runtime/core-js/number/is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var BASE_CHAT_URI = 'https://aim.twilio.com';
var TYPING_PATH = '/v1/typing';
var TYPING_TIMEOUT = 5;
var CONSUMPTION_HORIZON_SENDING_INTERVAL = 'PT5S';

var ChatConfig = function () {
  function ChatConfig(token, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, ChatConfig);

    options = options || {};
    var _options = options.Chat || options.IPMessaging || {};
    var baseUri = _options.apiUri || _options.typingUri || BASE_CHAT_URI;

    var httpCacheLifetime = (0, _isInteger2.default)(options.httpCacheLifetime) ? options.httpCacheLifetime : 10000;
    (0, _defineProperties2.default)(this, {
      _token: { value: token, writable: true },

      token: { get: function get() {
          return _this._token;
        }, enumerable: true },
      baseUri: { value: baseUri },
      baseUrl: { value: baseUri },

      typingIndicatorUri: { enumerable: true,
        value: baseUri + TYPING_PATH },
      typingIndicatorTimeout: { enumerable: true,
        value: TYPING_TIMEOUT * 1000 },
      consumptionReportInterval: { enumerable: true,
        value: CONSUMPTION_HORIZON_SENDING_INTERVAL },
      httpCacheLifetime: { enumberable: true, value: httpCacheLifetime }
    });
  }

  (0, _createClass3.default)(ChatConfig, [{
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
    }
  }]);
  return ChatConfig;
}();

module.exports = ChatConfig;

},{"babel-runtime/core-js/number/is-integer":29,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],5:[function(_dereq_,module,exports){
'use strict';

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;

var Channel = _dereq_('../channel');
var log = _dereq_('../logger');

/**
 * Represents channels collection
 * {@see Channel}
 */

var Channels = function (_EventEmitter) {
  (0, _inherits3.default)(Channels, _EventEmitter);

  function Channels(services) {
    (0, _classCallCheck3.default)(this, Channels);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Channels.__proto__ || (0, _getPrototypeOf2.default)(Channels)).call(this));

    (0, _defineProperties2.default)(_this, {
      _services: { value: services },
      _userInfos: { value: services.userInfos },
      _typingIndicator: { value: services.typingIndicator },
      _session: { value: services.session },
      channels: {
        enumerable: true,
        value: new _map2.default()
      }
    });
    return _this;
  }

  (0, _createClass3.default)(Channels, [{
    key: '_getMap',
    value: function _getMap() {
      var _this2 = this;

      return this._session.getMyChannelsId().then(function (name) {
        return _this2._session.datasync.map({ uniqueName: name, mode: 'open' });
      });
    }

    /**
     * Add channel to server
     * @private
     * @returns {Promise<Channel|SessionError>} Channel
     */

  }, {
    key: 'addChannel',
    value: function addChannel(options) {
      var _this3 = this;

      return this._session.addCommand('createChannel', {
        friendlyName: options.friendlyName,
        uniqueName: options.uniqueName,
        type: options.isPrivate ? 'private' : 'public',
        attributes: (0, _stringify2.default)(options.attributes)
      }).then(function (response) {
        var existingChannel = _this3.channels.get(response.channelSid);
        if (existingChannel) {
          return existingChannel._subscribe().then(function () {
            return existingChannel;
          });
        }

        var channel = new Channel(_this3._services, { channel: response.channel, channelSid: response.channelSid }, response.channelSid);
        _this3.channels.set(channel.sid, channel);
        _this3._registerForEvents(channel);

        return channel._subscribe().then(function () {
          _this3.emit('channelAdded', channel);
          return channel;
        });
      });
    }

    /**
     * Fetch channels list and instantiate all necessary objects
     */

  }, {
    key: 'fetchChannels',
    value: function fetchChannels() {
      var _this4 = this;

      this._session.getMyChannelsId().then(function (name) {
        return _this4._session.datasync.map({ uniqueName: name, mode: 'open' });
      }).then(function (map) {
        map.on('itemAdded', function (item) {
          _this4._upsertChannel(item.key, item.value);
        });

        map.on('itemRemoved', function (sid) {
          var channel = _this4.channels.get(sid);
          if (channel) {
            if (channel.status === 'joined' || channel.status === 'invited') {
              channel._setStatus('known');
              _this4.emit('channelLeft', channel);
            }
            if (channel.isPrivate) {
              _this4.channels.delete(sid);
              _this4.emit('channelRemoved', channel);
            }
          }
        });

        map.on('itemUpdated', function (item) {
          _this4._upsertChannel(item.key, item.value);
        });

        var upserts = [];
        return map.forEach(function (item) {
          upserts.push(_this4._upsertChannel(item.key, item.value));
        }).then(function () {
          return _promise2.default.all(upserts);
        });
      }).then(function () {
        log.debug('Channels list fetched');
      }).then(function () {
        return _this4;
      }).catch(function (e) {
        log.error('Failed to get channels list', e);
        throw e;
      });
    }
  }, {
    key: '_wrapPaginator',
    value: function _wrapPaginator(page, op) {
      var _this5 = this;

      return op(page.items).then(function (items) {
        return {
          items: items,
          hasNextPage: page.hasNextPage,
          hasPrevPage: page.hasPrevPage,
          nextPage: function nextPage() {
            return page.nextPage().then(function (x) {
              return _this5._wrapPaginator(x, op);
            });
          },
          prevPage: function prevPage() {
            return page.prevPage().then(function (x) {
              return _this5._wrapPaginator(x, op);
            });
          }
        };
      });
    }
  }, {
    key: 'getChannels',
    value: function getChannels(args) {
      var _this6 = this;

      return this._getMap().then(function (channelsMap) {
        return channelsMap.getItems(args);
      }).then(function (page) {
        return _this6._wrapPaginator(page, function (items) {
          return _promise2.default.all(items.map(function (item) {
            return _this6._upsertChannel(item.key, item.value);
          }));
        });
      });
    }
  }, {
    key: 'getChannel',
    value: function getChannel(sid) {
      var _this7 = this;

      return this._getMap().then(function (channelsMap) {
        return channelsMap.getItems({ key: sid });
      }).then(function (page) {
        return page.items.map(function (item) {
          return _this7._upsertChannel(item.key, item.value);
        });
      }).then(function (items) {
        return items.length > 0 ? items[0] : null;
      });
    }
  }, {
    key: 'pushChannel',
    value: function pushChannel(descriptor) {
      var sid = descriptor.sid;
      var data = {
        status: 'known',
        type: descriptor.type,
        friendlyName: descriptor.friendlyName,
        dateUpdated: descriptor.dateUpdated,
        dateCreated: descriptor.dateCreated,
        uniqueName: descriptor.uniqueName,
        createdBy: descriptor.createdBy,
        attributes: descriptor.attributes,
        channel: descriptor.channel,
        sid: sid
      };

      var channel = this.channels.get(descriptor.sid);
      if (!channel) {
        channel = new Channel(this._services, data, sid);
        this.channels.set(sid, channel);
      }
      return channel;
    }
  }, {
    key: '_upsertChannel',
    value: function _upsertChannel(sid, data) {
      var _this8 = this;

      var channel = this.channels.get(sid);

      // Update the Channel's status if we know about it
      if (channel) {
        if (data.status === 'joined' && channel.status !== 'joined') {
          channel._setStatus('joined');

          if (typeof data.lastConsumedMessageIndex !== 'undefined') {
            channel._lastConsumedMessageIndex = data.lastConsumedMessageIndex;
          }

          channel._subscribe().then(function () {
            _this8.emit('channelJoined', channel);
          });
        } else if (data.status === 'invited' && channel.status !== 'invited') {
          channel._setStatus('invited');
          channel._subscribe().then(function () {
            _this8.emit('channelInvited', channel);
          });
        } else if (data.status === 'known' && (channel.status === 'invited' || channel.status === 'joined')) {
          channel._setStatus('known');
          channel._update(data);
          channel._subscribe().then(function () {
            _this8.emit('channelLeft', channel);
          });
        } else if (data.status === 'notParticipating' && data.type === 'private') {
          channel._subscribe();
        } else {
          channel._update(data);
        }

        return channel._subscribe().then(function () {
          return channel;
        });
      }

      // Fetch the Channel if we don't know about it
      channel = new Channel(this._services, data, sid);
      this._registerForEvents(channel);

      this.channels.set(sid, channel);
      return channel._subscribe().then(function () {
        if (data.status === 'joined') {
          channel._setStatus('joined');
          _this8.emit('channelJoined', channel);
        } else if (data.status === 'invited') {
          channel._setStatus('invited');
          _this8.emit('channelInvited', channel);
        }

        if (channel.isPrivate) {
          _this8.emit('channelAdded', channel);
        }
        return channel;
      });
    }
  }, {
    key: '_registerForEvents',
    value: function _registerForEvents(channel) {
      var _this9 = this;

      channel.on('updated', function () {
        return _this9.emit('channelUpdated', channel);
      });
      channel.on('memberJoined', this.emit.bind(this, 'memberJoined'));
      channel.on('memberLeft', this.emit.bind(this, 'memberLeft'));
      channel.on('memberUpdated', this.emit.bind(this, 'memberUpdated'));
      channel.on('messageAdded', this.emit.bind(this, 'messageAdded'));
      channel.on('messageUpdated', this.emit.bind(this, 'messageUpdated'));
      channel.on('messageRemoved', this.emit.bind(this, 'messageRemoved'));
      channel.on('typingStarted', this.emit.bind(this, 'typingStarted'));
      channel.on('typingEnded', this.emit.bind(this, 'typingEnded'));
    }
  }]);
  return Channels;
}(EventEmitter);

module.exports = Channels;

},{"../channel":1,"../logger":10,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],6:[function(_dereq_,module,exports){
'use strict';

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var log = _dereq_('../logger').scope('Members');

var Member = _dereq_('../member');

/**
 * @classdesc Represents the collection of members for the channel
 * @fires Members#memberJoined
 * @fires Members#memberLeft
 * @fires Members#memberUpdated
 * @fires Members#memberInfoUpdated
 */

var Members = function (_EventEmitter) {
  (0, _inherits3.default)(Members, _EventEmitter);

  function Members(channel, session, userInfos, members) {
    (0, _classCallCheck3.default)(this, Members);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Members.__proto__ || (0, _getPrototypeOf2.default)(Members)).call(this));

    (0, _defineProperties2.default)(_this, {
      _datasync: { value: session.datasync },
      _userInfos: { value: userInfos },
      _session: { value: session },
      _rosterStreamPromise: {
        writable: true,
        value: null
      },
      channel: {
        enumerable: true,
        value: channel
      },
      members: {
        enumerable: true,
        value: members
      }
    });
    return _this;
  }

  (0, _createClass3.default)(Members, [{
    key: 'unsubscribe',
    value: function unsubscribe() {
      return this._rosterStreamPromise ? this._rosterStreamPromise.then(function (entity) {
        return entity.close();
      }) : _promise2.default.resolve();
    }
  }, {
    key: 'subscribe',
    value: function subscribe(rosterObjectName) {
      var _this2 = this;

      return this._rosterStreamPromise = this._rosterStreamPromise || this._datasync.map({ uniqueName: rosterObjectName, mode: 'open' }).then(function (rosterMap) {
        rosterMap.on('itemAdded', function (item) {
          _this2.upsertMember(item.key, item.value).then(function (member) {
            _this2.emit('memberJoined', member);
          });
        });

        rosterMap.on('itemRemoved', function (memberSid) {
          if (!_this2.members.has(memberSid)) {
            return;
          }
          var leftMember = _this2.members.get(memberSid);
          _this2.members.delete(memberSid);
          _this2.emit('memberLeft', leftMember);
        });

        rosterMap.on('itemUpdated', function (item) {
          _this2.upsertMember(item.key, item.value);
        });

        var membersPromises = [];
        return rosterMap.forEach(function (item) {
          membersPromises.push(_this2.upsertMember(item.key, item.value));
        }).then(function () {
          return _promise2.default.all(membersPromises);
        }).then(function () {
          return rosterMap;
        });
      }).catch(function (err) {
        _this2._rosterStreamPromise = null;
        log.error('Failed to get roster object for channel', _this2.channel.sid, err);
        throw err;
      });
    }
  }, {
    key: 'upsertMember',
    value: function upsertMember(memberSid, data) {
      var _this3 = this;

      var member = this.members.get(memberSid);
      if (member) {
        member._update(data);
        return _promise2.default.resolve(member);
      }

      return this._userInfos.getUserInfo(data.identity, data.userInfo).then(function (userInfo) {
        member = new Member(_this3.channel, data, memberSid, userInfo);
        _this3.members.set(memberSid, member);
        member.on('updated', function () {
          return _this3.emit('memberUpdated', member);
        });
        member.on('userInfoUpdated', function () {
          return _this3.emit('memberInfoUpdated', member);
        });
        return member;
      });
    }

    /**
     * @returns {Promise<Array<Member>>} returns list of members {@see Member}
     */

  }, {
    key: 'getMembers',
    value: function getMembers() {
      var _this4 = this;

      return this._rosterStreamPromise.then(function () {
        var members = [];
        _this4.members.forEach(function (member) {
          return members.push(member);
        });
        return members;
      });
    }

    /**
     * Add user to the channel
     * @returns {Promise<|SessionError>}
     */

  }, {
    key: 'add',
    value: function add(username) {
      return this._session.addCommand('addMember', {
        channelSid: this.channel.sid,
        username: username
      });
    }

    /**
     * Invites user to the channel
     * User can choose either to join or not
     * @returns {Promise<|SessionError>}
     */

  }, {
    key: 'invite',
    value: function invite(username) {
      return this._session.addCommand('inviteMember', {
        channelSid: this.channel.sid,
        username: username
      });
    }

    /**
     * Remove user from channel
     * @returns {Promise<|SessionError>}
     */

  }, {
    key: 'remove',
    value: function remove(username) {
      return this._session.addCommand('removeMember', {
        channelSid: this.channel.sid,
        username: username
      });
    }
  }]);
  return Members;
}(EventEmitter);

module.exports = Members;

/**
 * Fired when member joined channel
 * @event Members#memberJoined
 * @type {Member}
 */

/**
 * Fired when member left channel
 * @event Members#memberLeft
 * @type {string}
 */

/**
 * Fired when member info updated
 * Note that event won't be fired if user haven't requested any member data
 *
 * @event Members#memberUpdated
 * @type {Member}
 */

/**
 * Fired when userInfo for member is updated
 * @event Members#memberInfoUpdated
 * @type {Member}
 */

},{"../logger":10,"../member":11,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],7:[function(_dereq_,module,exports){
'use strict';

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var log = _dereq_('loglevel');

var Message = _dereq_('../message');

function isForward(direction) {
  return direction.toLowerCase() === 'forward';
}

/**
 * Represents the collection of messages in a channel
 */

var Messages = function (_EventEmitter) {
  (0, _inherits3.default)(Messages, _EventEmitter);

  function Messages(channel, session, messages) {
    (0, _classCallCheck3.default)(this, Messages);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Messages.__proto__ || (0, _getPrototypeOf2.default)(Messages)).call(this));

    (0, _defineProperties2.default)(_this, {
      _datasync: { value: session.datasync },
      _eventStreamPromise: { value: null, writable: true },
      _sortedMessages: { value: messages },
      _messagesByIndex: { value: new _map2.default() },
      _session: { value: session },
      channel: {
        enumerable: true,
        value: channel
      }
    });
    return _this;
  }

  /**
   * Subscribe to the Messages Event Stream
   * @param {String} uri - The URI of the Messages resource.
   * @returns {Promise}
   */

  (0, _createClass3.default)(Messages, [{
    key: 'subscribe',
    value: function subscribe(name) {
      var _this2 = this;

      return this._eventStreamPromise = this._eventStreamPromise || this._datasync.list({ uniqueName: name, mode: 'open' }).then(function (list) {

        list.on('itemAdded', function (item) {
          var message = new Message(_this2.channel, item.index, item.value);
          if (_this2._messagesByIndex.has(message.index)) {
            log.debug('Message arrived, but already known and ignored', _this2.channel.sid, message.index);
            return;
          }

          _this2._sortedMessages.push(message);
          _this2._messagesByIndex.set(message.index, message);
          message.on('updated', function () {
            return _this2.emit('messageUpdated', message);
          });

          _this2.emit('messageAdded', message);
        });

        list.on('itemRemoved', function (index) {
          var message = _this2._removeMessageById(index);
          if (message) {
            _this2._messagesByIndex.delete(message.index);
            message.removeAllListeners('updated');
            _this2.emit('messageRemoved', message);
          }
        });

        list.on('itemUpdated', function (item) {
          var message = _this2._messagesByIndex.get(item.index);
          if (message) {
            message._update(item.value);
          }
        });

        return list;
      }).catch(function (err) {
        _this2._eventStreamPromise = null;
        log.error('Failed to get messages object for channel', _this2.channel.sid, err);
        throw err;
      });
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe() {
      return this._eventStreamPromise ? this._eventStreamPromise.then(function (entity) {
        return entity.close();
      }) : _promise2.default.resolve();
    }

    /**
     * @param {Number} entityId Entity ID of Message to remove.
     * @returns {Message} removedMessage The message that was removed (or undefined).
     * @private
     */

  }, {
    key: '_removeMessageById',
    value: function _removeMessageById(entityId) {
      var removedMessage = void 0;

      for (var i = 0; i < this._sortedMessages.length; i++) {
        var message = this._sortedMessages[i];

        if (message.index === entityId) {
          removedMessage = this._sortedMessages.splice(i, 1)[0];
          break;
        }
      }

      return removedMessage;
    }

    /**
     * Send Message to the channel
     * @param {String} message - Message to post
     * @param {Object} attributes Message attributes
     * @returns Returns promise which can fail
     */

  }, {
    key: 'send',
    value: function send(message, attributes) {
      if (typeof attributes === 'undefined') {
        attributes = {};
      } else if (attributes.constructor !== Object) {
        return _promise2.default.reject(new Error('Attributes must be a valid JSON object'));
      }

      return this._session.addCommand('sendMessage', {
        channelSid: this.channel.sid,
        text: message,
        attributes: (0, _stringify2.default)(attributes)
      });
    }

    /**
     * Returns messages from channel using paginator interface
     * @param {Number} [pageSize] Number of messages to return in single chunk. By default it's 100.
     * @param {String} [anchor] Most early message id which is already known, or 'end' by default
     * @returns {Promise<Paginator<Message>>} last page of messages by default
     */

  }, {
    key: 'getMessages',
    value: function getMessages(pageSize, anchor, direction) {
      anchor = typeof anchor !== 'undefined' ? anchor : 'end';
      direction = direction || 'backwards';
      return this._getMessages(pageSize, anchor, direction);
    }
  }, {
    key: '_wrapPaginator',
    value: function _wrapPaginator(page, op) {
      var _this3 = this;

      // We should swap next and prev page here, because of misfit of Sync and Chat paging conceptions
      return op(page.items).then(function (items) {
        return {
          items: items.sort(function (x, y) {
            return x.index - y.index;
          }),
          hasPrevPage: page.hasNextPage,
          hasNextPage: page.hasPrevPage,
          prevPage: function prevPage() {
            return page.nextPage().then(function (x) {
              return _this3._wrapPaginator(x, op);
            });
          },
          nextPage: function nextPage() {
            return page.prevPage().then(function (x) {
              return _this3._wrapPaginator(x, op);
            });
          }
        };
      });
    }
  }, {
    key: '_upsertMessage',
    value: function _upsertMessage(index, value) {
      var _this4 = this;

      var cachedMessage = this._messagesByIndex.get(index);
      if (cachedMessage) {
        return cachedMessage;
      }

      var message = new Message(this.channel, index, value);
      this._messagesByIndex.set(message.index, message);
      message.on('updated', function () {
        return _this4.emit('messageUpdated', message);
      });
      return message;
    }

    /**
     * Returns last messages from channel
     * @param {Number} [pageSize] Number of messages to return in single chunk. By default it's 100.
     * @param {String} [anchor] Most early message id which is already known, or 'end' by default
     * @returns {Promise<Paginator<Message>>} last page of messages by default
     * @private
     */

  }, {
    key: '_getMessages',
    value: function _getMessages(pageSize, anchor, direction) {
      var _this5 = this;

      anchor = typeof anchor !== 'undefined' ? anchor : 'end';
      pageSize = pageSize || 30;
      var order = direction === 'backwards' ? 'desc' : 'asc';

      if (anchor !== 'end') {
        pageSize++;
      }

      return this.subscribe().then(function (messagesList) {
        return messagesList.getItems({ from: anchor !== 'end' ? anchor : void 0, pageSize: pageSize, order: order });
      }).then(function (page) {
        if (anchor !== 'end') {
          if (isForward(direction)) {
            page.items.shift();
          } else {
            page.items.pop();
          }
        }
        return page;
      }).then(function (page) {
        return _this5._wrapPaginator(page, function (items) {
          return _promise2.default.all(items.map(function (item) {
            return _this5._upsertMessage(item.index, item.value);
          }));
        });
      });
    }
  }]);
  return Messages;
}(EventEmitter);

module.exports = Messages;

},{"../message":12,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186,"loglevel":188}],8:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var UriBuilder = _dereq_('../util').UriBuilder;
var Paginator = _dereq_('../restpaginator');
var ChannelDescriptor = _dereq_('../channeldescriptor');

/**
 * Public channels collection
 * It's a cassandra-backed pull-based collection
 */

var PublicChannels = function () {
  function PublicChannels(config, client, transport, url) {
    (0, _classCallCheck3.default)(this, PublicChannels);

    (0, _defineProperties2.default)(this, {
      _config: { value: config },
      _client: { value: client },
      _transport: { value: transport },
      _url: { value: url }
    });
  }

  (0, _createClass3.default)(PublicChannels, [{
    key: 'getChannels',
    value: function getChannels(args) {
      var _this = this;

      args = args || {};
      var url = new UriBuilder(this._url).arg('PageToken', args.pageToken).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new Paginator(body.channels.map(function (x) {
          return new ChannelDescriptor(_this._client, x);
        }), function (pageToken) {
          return _this.getChannels({ pageToken: pageToken });
        }, body.meta.prev_token, body.meta.next_token);
      });
    }
  }, {
    key: 'getChannelBySid',
    value: function getChannelBySid(sid) {
      var _this2 = this;

      var url = new UriBuilder(this._url).path(sid).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new ChannelDescriptor(_this2._client, body);
      });
    }
  }, {
    key: 'getChannelByUniqueName',
    value: function getChannelByUniqueName(sid) {
      var _this3 = this;

      var url = new UriBuilder(this._url).path(encodeURIComponent(sid)).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new ChannelDescriptor(_this3._client, body);
      });
    }
  }]);
  return PublicChannels;
}();

module.exports = PublicChannels;

},{"../channeldescriptor":2,"../restpaginator":13,"../util":21,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],9:[function(_dereq_,module,exports){
'use strict';

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var UserInfo = _dereq_('../userinfo');

/**
 * @classdesc Container for known user infos
 * @fires UserInfos#userInfoUpdated
 */

var UserInfos = function (_EventEmitter) {
  (0, _inherits3.default)(UserInfos, _EventEmitter);

  function UserInfos(session, datasync) {
    (0, _classCallCheck3.default)(this, UserInfos);

    var _this = (0, _possibleConstructorReturn3.default)(this, (UserInfos.__proto__ || (0, _getPrototypeOf2.default)(UserInfos)).call(this));

    var myUserInfo = new UserInfo(null, null, datasync, session);
    myUserInfo.on('updated', function () {
      return _this.emit('userInfoUpdated', myUserInfo);
    });

    (0, _defineProperties2.default)(_this, {
      _session: { value: session },
      _datasync: { value: datasync },
      _infos: { value: new _map2.default() },
      _identity: { value: null, writable: true },

      myUserInfo: { enumerable: true, get: function get() {
          return myUserInfo;
        } }
    });

    _this._session.getUserInfosData().then(function (data) {
      _this._identity = data.identity;

      myUserInfo._identity = data.identity;
      myUserInfo._entityName = data.userInfo;
      _this._infos.set(data.identity, myUserInfo);

      return myUserInfo._ensureFetched();
    });
    return _this;
  }

  /**
   * @returns {Promise<UserInfo>} Fully initialized user info for logged in user
   */

  (0, _createClass3.default)(UserInfos, [{
    key: 'getMyUserInfo',
    value: function getMyUserInfo() {
      var _this2 = this;

      return this._session.getUserInfosData().then(function (data) {
        return _this2.getUserInfo(data.identity, data.userInfo);
      });
    }

    /**
     * @returns {Promise<UserInfo>} Fully initialized user info
     */

  }, {
    key: 'getUserInfo',
    value: function getUserInfo(identity, id) {
      var _this3 = this;

      var userInfo = this._infos.get(identity);
      if (!userInfo) {
        userInfo = new UserInfo(identity, id || null, this._datasync, this._session);
        this._infos.set(identity, userInfo);
        userInfo.on('updated', function () {
          return _this3.emit('userInfoUpdated', userInfo);
        });
      }
      return userInfo._ensureFetched();
    }
  }]);
  return UserInfos;
}(EventEmitter);

module.exports = UserInfos;

},{"../userinfo":19,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],10:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _from = _dereq_('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var log = _dereq_('loglevel');

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

},{"babel-runtime/core-js/array/from":24,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"loglevel":188}],11:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;

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

var Member = function (_EventEmitter) {
  (0, _inherits3.default)(Member, _EventEmitter);

  function Member(channel, data, sid, userInfo) {
    (0, _classCallCheck3.default)(this, Member);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Member.__proto__ || (0, _getPrototypeOf2.default)(Member)).call(this));

    var isTyping = false;
    var typingTimeout = null;

    var identity = data.identity;
    var roleSid = data.roleSid || null;
    var lastConsumedMessageIndex = typeof data.lastConsumedMessageIndex !== 'undefined' ? data.lastConsumedMessageIndex : null;
    var lastConsumptionTimestamp = data.lastConsumptionTimestamp ? new Date(data.lastConsumptionTimestamp) : null;

    if (!data.identity) {
      throw new Error('Received invalid Member object from server: Missing identity.');
    }

    (0, _defineProperties2.default)(_this, {
      _identity: {
        get: function get() {
          return identity;
        },
        set: function set(_identity) {
          return identity = _identity;
        }
      },
      _isTyping: {
        get: function get() {
          return isTyping;
        },
        set: function set(_isTyping) {
          return isTyping = _isTyping;
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
      _lastConsumptionTimestamp: {
        get: function get() {
          return lastConsumptionTimestamp;
        },
        set: function set(_lastConsumptionTimestamp) {
          return lastConsumptionTimestamp = _lastConsumptionTimestamp;
        }
      },
      _roleSid: {
        get: function get() {
          return roleSid;
        },
        set: function set(_roleSid) {
          return roleSid = _roleSid;
        }
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
        get: function get() {
          return identity;
        }
      },
      isTyping: {
        enumerable: true,
        get: function get() {
          return isTyping;
        }
      },
      lastConsumedMessageIndex: {
        enumerable: true,
        get: function get() {
          return lastConsumedMessageIndex;
        }
      },
      lastConsumptionTimestamp: {
        enumerable: true,
        get: function get() {
          return lastConsumptionTimestamp;
        }
      },
      roleSid: {
        enumerable: true,
        get: function get() {
          return roleSid;
        }
      },
      sid: {
        enumerable: true,
        value: sid
      },
      userInfo: {
        enumerable: true,
        get: function get() {
          return userInfo;
        }
      }
    });

    userInfo.on('updated', function () {
      return _this.emit('userInfoUpdated', _this);
    });
    return _this;
  }

  /**
   * Private method used to start or reset the typing indicator timeout (with event emitting)
   * @private
   */

  (0, _createClass3.default)(Member, [{
    key: '_startTyping',
    value: function _startTyping(timeout) {
      var _this2 = this;

      clearTimeout(this._typingTimeout);

      this._isTyping = true;
      this.emit('typingStarted', this);
      this.channel.emit('typingStarted', this);

      this._typingTimeout = setTimeout(function () {
        return _this2._endTyping();
      }, timeout);
      return this;
    }

    /**
     * Private method function used to stop typing indicator (with event emitting)
     * @private
     */

  }, {
    key: '_endTyping',
    value: function _endTyping() {
      if (!this._typingTimeout) {
        return;
      }

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

  }, {
    key: '_update',
    value: function _update(data) {
      var updated = false;

      if (data.roleSid && this._roleSid !== data.roleSid) {
        this._roleSid = data.roleSid;
        updated = true;
      }

      if (typeof data.lastConsumedMessageIndex !== 'undefined' && this._lastConsumedMessageIndex !== data.lastConsumedMessageIndex) {
        this._lastConsumedMessageIndex = data.lastConsumedMessageIndex;
        updated = true;
      }

      if (data.lastConsumptionTimestamp) {
        var lastConsumptionTimestamp = new Date(data.lastConsumptionTimestamp);
        if (!this._lastConsumptionTimestamp || this._lastConsumptionTimestamp.getTime() !== lastConsumptionTimestamp.getTime()) {
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

  }, {
    key: 'remove',
    value: function remove() {
      return this.channel.removeMember(this);
    }
  }]);
  return Member;
}(EventEmitter);

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

},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],12:[function(_dereq_,module,exports){
'use strict';

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var log = _dereq_('./logger');
var JsonDiff = _dereq_('./util/jsondiff');

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

var Message = function (_EventEmitter) {
  (0, _inherits3.default)(Message, _EventEmitter);

  function Message(channel, entityId, data) {
    (0, _classCallCheck3.default)(this, Message);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Message.__proto__ || (0, _getPrototypeOf2.default)(Message)).call(this));

    var body = data.text;
    var dateUpdated = data.dateUpdated ? new Date(data.dateUpdated) : null;
    var lastUpdatedBy = data.lastUpdatedBy ? data.lastUpdatedBy : null;

    (0, _defineProperties2.default)(_this, {
      _body: {
        get: function get() {
          return body;
        },
        set: function set(_body) {
          return body = _body;
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
      _lastUpdatedBy: {
        get: function get() {
          return lastUpdatedBy;
        },
        set: function set(_lastUpdatedBy) {
          return lastUpdatedBy = _lastUpdatedBy;
        }
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
        get: function get() {
          return body;
        }
      },
      channel: {
        enumerable: true,
        value: channel
      },
      dateUpdated: {
        enumerable: true,
        get: function get() {
          return dateUpdated;
        }
      },
      index: {
        enumerable: true,
        value: parseInt(entityId)
      },
      lastUpdatedBy: {
        enumerable: true,
        get: function get() {
          return lastUpdatedBy;
        }
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
        get: function get() {
          return _this._attributes;
        }
      }
    });
    return _this;
  }

  (0, _createClass3.default)(Message, [{
    key: '_update',
    value: function _update(data) {
      var updated = false;

      if ((data.text || typeof data.text === 'string') && data.text !== this._body) {
        this._body = data.text;
        updated = true;
      }

      if (data.lastUpdatedBy && data.lastUpdatedBy !== this._lastUpdatedBy) {
        this._lastUpdatedBy = data.lastUpdatedBy;
        updated = true;
      }

      if (data.dateUpdated && new Date(data.dateUpdated).getTime() !== (this._dateUpdated && this._dateUpdated.getTime())) {
        this._dateUpdated = new Date(data.dateUpdated);
        updated = true;
      }

      var updatedAttributes = parseAttributes(this.sid, data.attributes);
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

  }, {
    key: 'remove',
    value: function remove() {
      var _this2 = this;

      return this.channel._session.addCommand('deleteMessage', {
        channelSid: this.channel.sid,
        messageIdx: this.index.toString()
      }).then(function () {
        return _this2;
      });
    }

    /**
     * Edit message body.
     * @param {String} body - new body of Message.
     * @returns {Promise<Message|SessionError>}
     */

  }, {
    key: 'updateBody',
    value: function updateBody(body) {
      var _this3 = this;

      if (typeof body !== 'string') {
        throw new Error('Body <String> is a required parameter for updateBody');
      }

      return this.channel._session.addCommand('editMessage', {
        channelSid: this.channel.sid,
        messageIdx: this.index.toString(),
        text: body
      }).then(function () {
        return _this3;
      });
    }

    /**
     * Edit message attributes.
     * @param {Object} attributes new attributes for Message.
     * @returns {Promise<Message|SessionError|Error>}
     */

  }, {
    key: 'updateAttributes',
    value: function updateAttributes(attributes) {
      var _this4 = this;

      if (typeof attributes === 'undefined') {
        return _promise2.default.reject(new Error('Attributes is a required parameter for updateAttributes'));
      } else if (attributes.constructor !== Object) {
        return _promise2.default.reject(new Error('Attributes must be a valid JSON object'));
      }

      return this.channel._session.addCommand('editMessageAttributes', {
        channelSid: this.channel.sid,
        messageIdx: this.index,
        attributes: (0, _stringify2.default)(attributes)
      }).then(function () {
        return _this4;
      });
    }
  }]);
  return Message;
}(EventEmitter);

/**
 * Fired when the Message's fields have been updated.
 * @param {Message} message
 * @event Message#updated
 */

module.exports = Message;

},{"./logger":10,"./util/jsondiff":22,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],13:[function(_dereq_,module,exports){
'use strict';

/**
 * @class Paginator
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage Indicates the existence of next page
 * @property {boolean} hasPrevPage Indicates the existence of previous page
 */

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var Paginator = function () {
  /*
  * @constructor
  * @param {Array} items Array of element for current page
  * @param {Object} params
  * @private
  */
  function Paginator(items, source, prevToken, nextToken) {
    (0, _classCallCheck3.default)(this, Paginator);

    (0, _defineProperties2.default)(this, {
      prevToken: { value: prevToken },
      nextToken: { value: nextToken },
      source: { value: source },
      hasNextPage: { value: !!nextToken, enumerable: true },
      hasPrevPage: { value: !!prevToken, enumerable: true },
      items: { get: function get() {
          return items;
        }, enumerable: true }
    });
  }

  /**
   * Request next page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */

  (0, _createClass3.default)(Paginator, [{
    key: 'nextPage',
    value: function nextPage() {
      return this.hasNextPage ? this.source(this.nextToken) : _promise2.default.reject(new Error('No next page'));
    }

    /**
     * Request previous page.
     * Does not modify existing object
     * @return {Promise<Paginator>}
     */

  }, {
    key: 'prevPage',
    value: function prevPage() {
      return this.hasPrevPage ? this.source(this.prevToken) : _promise2.default.reject(new Error('No previous page'));
    }
  }]);
  return Paginator;
}();

module.exports = Paginator;

},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],14:[function(_dereq_,module,exports){
'use strict';

/**
 * @classdesc Provides consumption horizon management functionality
 */

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

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

},{"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],15:[function(_dereq_,module,exports){
'use strict';

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = _dereq_('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getIterator2 = _dereq_('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

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

},{"babel-runtime/core-js/get-iterator":25,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/slicedToArray":47}],16:[function(_dereq_,module,exports){
'use strict';

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var log = _dereq_('../logger').scope('TypingIndicator');

var TYPING_INDICATOR_MESSAGE_TYPE = 'twilio.ipmsg.typing_indicator';

/**
 * @class TypingIndicator
 *
 * @constructor
 * @private
 */

var TypingIndicator = function () {
  function TypingIndicator(config, transport, notifications, getChannel) {
    var _this = this;

    (0, _classCallCheck3.default)(this, TypingIndicator);

    (0, _defineProperties2.default)(this, {
      _transport: { value: transport },
      _notifications: { value: notifications },
      _config: { value: config },
      _typingTimeout: { value: null, writable: true },
      _sentUpdates: { value: new _map2.default() },
      _getChannel: { value: getChannel },
      token: { get: function get() {
          return config.token;
        } },
      typingTimeout: { get: function get() {
          return _this._typingTimeout || config.typingIndicatorTimeout;
        } }
    });
  }

  /**
   * Initialize TypingIndicator controller
   * Registers for needed message types and sets listeners
   * @private
   */

  (0, _createClass3.default)(TypingIndicator, [{
    key: 'initialize',
    value: function initialize() {
      var _this2 = this;

      this._notifications.subscribe(TYPING_INDICATOR_MESSAGE_TYPE, 'twilsock');
      this._notifications.on('message', function (type, message) {
        if (type === TYPING_INDICATOR_MESSAGE_TYPE) {
          _this2._handleRemoteTyping(message);
        }
      });
    }

    /**
     * Remote members typing events handler
     * @private
     */

  }, {
    key: '_handleRemoteTyping',
    value: function _handleRemoteTyping(message) {
      var _this3 = this;

      log.trace('Got new typing indicator ', message);
      this._getChannel(message.channel_sid).then(function (channel) {
        if (channel) {
          channel._members.forEach(function (member) {
            if (member.identity === message.identity) {
              member._startTyping(_this3.typingTimeout);
            }
          });
        }
      }).catch(function (err) {
        log.error(err);
        throw err;
      });
    }

    /**
     * Send typing event for the given channel sid
     * @param {String} channelSid
     */

  }, {
    key: 'send',
    value: function send(channelSid) {
      var lastUpdate = this._sentUpdates.get(channelSid);
      if (lastUpdate && lastUpdate > Date.now() - this.typingTimeout) {
        return _promise2.default.resolve();
      }

      this._sentUpdates.set(channelSid, Date.now());
      return this._send(channelSid);
    }
  }, {
    key: '_send',
    value: function _send(channelSid) {
      var _this4 = this;

      log.trace('Sending typing indicator');

      var url = this._config.typingIndicatorUri;
      var headers = {
        'X-Twilio-Token': this.token,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      var body = 'ChannelSid=' + channelSid;

      this._transport.post(url, headers, body).then(function (response) {
        if (response.body.hasOwnProperty('typing_timeout')) {
          _this4._typingTimeout = response.body.typing_timeout * 1000;
        }
      }).catch(function (err) {
        log.error('Failed to send typing indicator: ', err);
        throw err;
      });
    }
  }]);
  return TypingIndicator;
}();

module.exports = TypingIndicator;

},{"../logger":10,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],17:[function(_dereq_,module,exports){
'use strict';

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var uuid = _dereq_('uuid');
var platform = _dereq_('platform');

var log = _dereq_('./logger').scope('Session');
var ChangeTracker = _dereq_('./util/changetracker');
var SessionError = _dereq_('./sessionerror');

var Durational = _dereq_('durational');

var SDK_VERSION = _dereq_('./../package.json').version;
var SESSION_PURPOSE = 'com.twilio.rtd.ipmsg';

/**
*  Constructs the instance of Session
*
*  @classdesc Provides the interface to send the command to the server
*  It is reliable, which means that it tracks the command object state
*  and waits the answer from the server.
*/

var Session = function () {
  function Session(sync, transport, config) {
    var _this = this;

    (0, _classCallCheck3.default)(this, Session);

    console.log('navigator ----> ', navigator);

    var platformInfo = typeof navigator !== 'undefined' ? platform.parse(navigator.userAgent) : platform;
    // let platformInfo = {
    //   os: 'iOS',
    //   name: 'ReactNative',
    //   version: '0.41.2'
    // }

    (0, _defineProperties2.default)(this, {
      _endpointPlatform: {
        value: ['js', SDK_VERSION, platformInfo.os, platformInfo.name, platformInfo.version].join('|')
      },
      _pendingCommands: { value: new _map2.default() },
      _sessionContextChangeTracker: { value: new ChangeTracker() },
      _sessionStreamPromise: { value: null, writable: true },
      _config: { value: config },
      _token: { value: null, writable: true },
      _tokenSynced: { value: true, writable: true },
      identity: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.identity;
        } },
      userInfo: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.userInfo;
        } },
      reachabilityEnabled: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.reachabilityEnabled;
        } },
      datasync: { enumerable: true, value: sync },
      transport: { value: transport }
    });
  }

  (0, _createClass3.default)(Session, [{
    key: 'initialize',
    value: function initialize(token) {
      var _this2 = this;

      this._token = token;
      this._tokenSynced = false;
      var context = {
        type: 'IpMsgSession',
        apiVersion: '3',
        endpointPlatform: this._endpointPlatform,
        token: token
      };

      this._sessionStreamPromise = this.datasync.list({ purpose: SESSION_PURPOSE, context: context }).then(function (list) {
        log.info('Session created', list.sid);
        _this2._tokenSynced = true;

        list.on('itemAdded', function (item) {
          return _this2._processCommandResponse(item);
        });
        list.on('itemUpdated', function (item) {
          return _this2._processCommandResponse(item);
        });
        list.on('contextUpdated', function (updatedContext) {
          log.info('Session context updated');
          log.debug('new session context:', updatedContext);
          _this2._sessionContextChangeTracker.update(updatedContext);
        });

        return list;
      }).catch(function (err) {
        log.error('Failed to create session', err);
        throw err;
      });
      return this._sessionStreamPromise;
    }

    /**
     * Sends the command to the server
     * @returns Promise the promise, which is being fulfilled only when service will reply
     */

  }, {
    key: 'addCommand',
    value: function addCommand(action, params) {
      return this._processCommand(action, params);
    }

    /**
     * @private
     */

  }, {
    key: '_processCommand',
    value: function _processCommand(action, params) {
      var _this3 = this;

      var command = { request: params };
      command.request.action = action;
      command.commandId = uuid.v4();

      log.info('Adding command: ', action, command.commandId);
      log.debug('command arguments:', params);

      return new _promise2.default(function (resolve, reject) {
        _this3._sessionStreamPromise.then(function (list) {
          _this3._pendingCommands.set(command.commandId, { resolve: resolve, reject: reject });
          return list.push(command);
        }).then(function () {
          return log.debug('Command accepted by server', command.commandId);
        }).catch(function (err) {
          _this3._pendingCommands.delete(command.commandId);
          log.error('Failed to add a command to the session', err);
          reject(new Error('Can\'t add command: ' + err.description));
        });
      });
    }

    /**
     * @private
     */

  }, {
    key: '_processCommandResponse',
    value: function _processCommandResponse(entity) {
      if (entity.value.hasOwnProperty('response') && entity.value.hasOwnProperty('commandId') && this._pendingCommands.has(entity.value.commandId)) {
        var value = entity.value;
        var commandId = entity.value.commandId;
        if (value.response.status === 200) {
          log.debug('Command succeeded: ', value);
          var resolve = this._pendingCommands.get(commandId).resolve;
          this._pendingCommands.delete(commandId);
          resolve(value.response);
        } else {
          log.error('Command failed: ', value);
          var reject = this._pendingCommands.get(commandId).reject;
          this._pendingCommands.delete(commandId);
          reject(new SessionError(value.response.statusText, value.response.status));
        }
      }
    }
  }, {
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
      this._tokenSynced = false;
      return this.syncToken();
    }
  }, {
    key: 'syncToken',
    value: function syncToken() {
      var _this4 = this;

      if (this._tokenSynced) {
        return _promise2.default.resolve();
      }

      return this._sessionStreamPromise.then(function (list) {
        return list.getContext().then(function (context) {
          context.token = _this4._token;
          return list.updateContext(context);
        }).then(function () {
          _this4._tokenSynced = true;
        });
      }).catch(function (err) {
        log.error('Couldn\'t update the token in session context', err);
        throw new Error(err);
      });
    }
  }, {
    key: 'onKeyUpdated',
    value: function onKeyUpdated(path, handler) {
      this._sessionContextChangeTracker.addEventHandler('keyAdded', path, handler);
      this._sessionContextChangeTracker.addEventHandler('keyUpdated', path, handler);
    }
  }, {
    key: 'getSessionLinks',
    value: function getSessionLinks() {
      var _this5 = this;

      return new _promise2.default(function (resolve) {
        _this5._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('links')) {
            resolve(context.links);
          } else {
            _this5.onKeyUpdated('/links', function () {
              _this5._sessionStreamPromise.then(function (list) {
                return list.getContext();
              }).then(function (ctx) {
                return resolve(ctx.links);
              });
            });
          }
        });
      }).then(function (links) {
        return {
          publicChannelsUrl: _this5._config.baseUrl + links.publicChannelsUrl,
          myChannelsUrl: _this5._config.baseUrl + links.myChannelsUrl,
          typingUrl: _this5._config.baseUrl + links.typingUrl
        };
      });
    }
  }, {
    key: 'getChannelsId',
    value: function getChannelsId() {
      var _this6 = this;

      return new _promise2.default(function (resolve) {
        _this6._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('channelsUrl')) {
            resolve(context.channels);
          } else {
            _this6.onKeyUpdated('/channels', resolve);
          }
        });
      });
    }
  }, {
    key: 'getMyChannelsId',
    value: function getMyChannelsId() {
      var _this7 = this;

      return new _promise2.default(function (resolve) {
        _this7._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('myChannels')) {
            resolve(context.myChannels);
          } else {
            _this7.onKeyUpdated('/myChannels', resolve);
          }
        });
      });
    }
  }, {
    key: 'getUserInfosData',
    value: function getUserInfosData() {
      var _this8 = this;

      return new _promise2.default(function (resolve) {
        function resolveWithData(context) {
          resolve({
            userInfo: context.userInfo,
            identity: context.identity
          });
        }

        _this8._sessionStreamPromise.then(function (stream) {
          return stream.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('userInfo')) {
            resolveWithData(context);
          } else {
            _this8.onKeyUpdated('/userInfo', function () {
              _this8._sessionStreamPromise.then(function (stream) {
                return stream.getContext();
              }).then(function (updatedContext) {
                return resolveWithData(updatedContext);
              });
            });
          }
        });
      });
    }
  }, {
    key: 'getConsumptionReportInterval',
    value: function getConsumptionReportInterval() {
      var _this9 = this;

      return this._sessionStreamPromise.then(function (stream) {
        return stream.getContext();
      }).then(function (context) {
        return Durational.fromString(context.consumptionReportInterval || _this9._config.consumptionReportInterval);
      });
    }
  }]);
  return Session;
}();

module.exports = Session;

},{"./../package.json":239,"./logger":10,"./sessionerror":18,"./util/changetracker":20,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"durational":184,"platform":189,"uuid":234}],18:[function(_dereq_,module,exports){
'use strict';

/**
 * @class
 * @classdesc Exception type for service-side issues
 *
 * @property {Number} code - Error code
 * @property {String} message - Error description
 */

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var SessionError = function (_Error) {
  (0, _inherits3.default)(SessionError, _Error);

  function SessionError(message, code) {
    (0, _classCallCheck3.default)(this, SessionError);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SessionError.__proto__ || (0, _getPrototypeOf2.default)(SessionError)).call(this));

    _this.name = _this.constructor.name;
    _this.message = message;
    _this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(_this, _this.constructor);
    } else {
      _this.stack = new Error().stack;
    }
    return _this;
  }

  return SessionError;
}(Error);

module.exports = SessionError;

},{"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46}],19:[function(_dereq_,module,exports){
'use strict';

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var log = _dereq_('./logger').scope('UserInfo');

/**
 * @classdesc Extended user information
 * Note that {@link UserInfo#online} and {@link UserInfo#notifiable} properties are eligible to use only
 * if reachability function enabled.
 * You may check if it is enabled by reading value of {@link Client~reachabilityEnabled}
 *
 * @property {String} identity - User identity
 * @property {String} friendlyName - User friendly name. Null if not set
 * @property {Object} attributes - Object with custom attributes for user
 * @property {Boolean} online - User realtime channel connection status
 * @property {Boolean} notifiable - User push notification registration status
 * @fires UserInfo#updated
 *
 * @constructor
 * @param {String} identity - Identity of user
 * @param {String} entityId - id of user's info object
 * @param {Object} datasync - datasync service
 * @param {Object} session - session service
 */

var UserInfo = function (_EventEmitter) {
  (0, _inherits3.default)(UserInfo, _EventEmitter);

  function UserInfo(identity, entityName, datasync, session) {
    (0, _classCallCheck3.default)(this, UserInfo);

    var _this = (0, _possibleConstructorReturn3.default)(this, (UserInfo.__proto__ || (0, _getPrototypeOf2.default)(UserInfo)).call(this));

    _this.setMaxListeners(0);

    (0, _defineProperties2.default)(_this, {
      _datasync: { value: datasync },
      _session: { value: session },
      _identity: { value: identity, writable: true },
      _entityName: { value: entityName, writable: true },
      _attributes: { value: {}, writable: true },
      _friendlyName: { value: null, writable: true },
      _online: { value: null, writable: true },
      _notifiable: { value: null, writable: true },
      _promiseToFetch: { writable: true },

      identity: { enumerable: true, get: function get() {
          return _this._identity;
        } },
      attributes: { enumerable: true, get: function get() {
          return _this._attributes;
        } },
      friendlyName: { enumerable: true, get: function get() {
          return _this._friendlyName;
        } },
      online: { enumerable: true, get: function get() {
          return _this._online;
        } },
      notifiable: { enumerable: true, get: function get() {
          return _this._notifiable;
        } }
    });
    return _this;
  }

  // Handles service updates


  (0, _createClass3.default)(UserInfo, [{
    key: '_update',
    value: function _update(key, value) {
      log.debug('UserInfo for', this._identity, 'updated:', key, value);
      switch (key) {
        case 'friendlyName':
          this._friendlyName = value.value;
          break;
        case 'attributes':
          try {
            this._attributes = JSON.parse(value.value);
          } catch (e) {
            this._attributes = {};
          }
          break;
        case 'reachability':
          this._online = value.online;
          this._notifiable = value.notifiable;
          break;
        default:
          return;
      }
      this.emit('updated', key);
    }

    // Fetch reachability info

  }, {
    key: '_updateReachabilityInfo',
    value: function _updateReachabilityInfo(map, update) {
      var _this2 = this;

      if (!this._session.reachabilityEnabled) {
        return _promise2.default.resolve();
      }

      return map.get('reachability').then(update).catch(function (err) {
        log.warn('Failed to get reachability info for ', _this2._identity, err);
      });
    }

    // Fetch user info

  }, {
    key: '_fetch',
    value: function _fetch() {
      var _this3 = this;

      if (!this._entityName) {
        return _promise2.default.resolve(this);
      }

      var update = function update(item) {
        return _this3._update(item.key, item.value);
      };
      this._promiseToFetch = this._datasync.map({ uniqueName: this._entityName, mode: 'open' }).then(function (map) {
        map.on('itemUpdated', update);
        return _promise2.default.all([map.get('friendlyName').then(update), map.get('attributes').then(update), _this3._updateReachabilityInfo(map, update)]);
      }).then(function () {
        log.debug('Fetched for', _this3.identity);
        return _this3;
      }).catch(function (err) {
        _this3._promiseToFetch = null;
        throw err;
      });
      return this._promiseToFetch;
    }
  }, {
    key: '_ensureFetched',
    value: function _ensureFetched() {
      return this._promiseToFetch || this._fetch();
    }

    /**
     * Update the UserInfo's attributes.
     * @param {Object} attributes - The new attributes object.
     * @returns {Promise<UserInfo|SessionError>} A Promise for the UserInfo
     */

  }, {
    key: 'updateAttributes',
    value: function updateAttributes(attributes) {
      var _this4 = this;

      if (attributes.constructor !== Object) {
        throw new Error('Attributes must be an object.');
      }

      return this._session.addCommand('editUserAttributes', {
        username: this._identity,
        attributes: (0, _stringify2.default)(attributes)
      }).then(function () {
        return _this4;
      });
    }

    /**
     * Update the Users's friendlyName.
     * @param {String} name - The new friendlyName.
     * @returns {Promise<UserInfo|SessionError>} A Promise for the UserInfo
     */

  }, {
    key: 'updateFriendlyName',
    value: function updateFriendlyName(friendlyName) {
      var _this5 = this;

      return this._session.addCommand('editUserFriendlyName', {
        username: this._identity,
        friendlyName: friendlyName
      }).then(function () {
        return _this5;
      });
    }
  }]);
  return UserInfo;
}(EventEmitter);

/**
 * Fired when the UserInfo's fields have been updated.
 * @param {String} reason - Name of the property which has changed
 * @event UserInfo#updated
 */

module.exports = UserInfo;

},{"./logger":10,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],20:[function(_dereq_,module,exports){
'use strict';

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var EventEmitter = _dereq_('events').EventEmitter;
var inherits = _dereq_('util').inherits;
var JsonDiff = _dereq_('./jsondiff');

/**
 * Tracks changes for JS objects and emits appropriate callbacks
 */
function ChangeTracker(data) {
  var _this = this;

  (0, _defineProperties2.default)(this, {
    _pendingListeners: { value: {} },
    _data: { value: data || {}, writable: true }
  });
  EventEmitter.call(this);

  ['keyAdded', 'keyRemoved', 'keyUpdated'].forEach(function (eventName) {
    _this._pendingListeners[eventName] = {};
    _this.on(eventName, function (path, value) {
      var handlers = _this._pendingListeners[eventName][path] || [];
      handlers.forEach(function (handler) {
        return handler(value);
      });
      _this._pendingListeners[eventName][path] = [];
    });
  });
}
inherits(ChangeTracker, EventEmitter);

/**
 * Compare old and new data and fire events if difference found
 * @private
 */
ChangeTracker.prototype._traverse = function (originalData, updatedData) {
  var _this2 = this;

  var diff = JsonDiff.diff(originalData, updatedData);
  diff.forEach(function (row) {
    if (row.op === 'add') {
      _this2.emit('keyAdded', row.path, row.value);
    } else if (row.op === 'replace') {
      _this2.emit('keyUpdated', row.path, row.value);
    } else if (row.op === 'remove') {
      _this2.emit('keyRemoved', row.path);
    }
  });
};

/**
 * Set new data to process
 * @param Object updatedData new data set
 * @public
 */
ChangeTracker.prototype.update = function (updatedData) {
  var originalData = this._data;
  this._data = updatedData;
  this._traverse(originalData, updatedData);
};

ChangeTracker.prototype.addEventHandler = function (eventName, path, handler) {
  var handlers = this._pendingListeners[eventName][path] || [];
  handlers.push(handler);
  this._pendingListeners[eventName][path] = handlers;
};

module.exports = ChangeTracker;

},{"./jsondiff":22,"babel-runtime/core-js/object/define-properties":32,"events":186,"util":233}],21:[function(_dereq_,module,exports){
'use strict';

/**
 * Memoize a function. Be careful with this.
 * @param {function} fn - the function to memoize
 * @returns {function}
 */

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function memoize(fn) {
  var memo = {};
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    return memo[args] ? memo[args] : memo[args] = fn.apply(null, args);
  };
}

/**
 * Deep-clone an object. Note that this does not work on object containing
 * functions.
 * @param {object} obj - the object to deep-clone
 * @returns {object}
 */
function deepClone(obj) {
  return JSON.parse((0, _stringify2.default)(obj));
}

function faultTolerantWait(promises) {
  return new _promise2.default(function (resolve) {
    var totalCount = promises.length;
    var failuresCount = 0;

    if (totalCount === 0) {
      resolve();
    }

    function handle() {
      if (--totalCount <= 0) {
        resolve(failuresCount);
      }
    }

    promises.forEach(function (promise) {
      promise.then(handle).catch(function () {
        failuresCount++;handle();
      });
    });
  });
}

function emitNext() {
  var args = [].slice.call(arguments);
  var eventEmitter = args[0];
  args = args.slice(1);
  setTimeout(function () {
    eventEmitter.emit.call(eventEmitter, args);
  });
  return eventEmitter;
}

/**
 * Traverse down multiple nodes on an object and return null if
 * any link in the path is unavailable.
 * @param {Object} obj - Object to traverse
 * @param {String} path - Path to traverse. Period-separated.
 * @returns {Any|null}
 */
function getOrNull(obj, path) {
  return path.split('.').reduce(function (output, step) {
    if (!output) {
      return null;
    }
    return output[step];
  }, obj);
}

/**
 * Overwrite an existing Array with a new one. This is useful when the existing
 * Array is an immutable property of another object.
 * @param {Array} oldArray - the existing Array to overwrite
 * @param {Array} newArray - the new Array to overwrite with
 */
function overwriteArray(oldArray, newArray) {
  oldArray.splice(0, oldArray.length);
  newArray.forEach(function (item) {
    oldArray.push(item);
  });
}

/**
 * Construct URI with query parameters
 */
function UriBuilder(base) {
  (0, _defineProperties2.default)(this, {
    base: { value: base.replace(/\/$/, '') },
    paths: { value: [] },
    args: { value: [] }
  });

  this.arg = function (name, value) {
    if (typeof value !== 'undefined') {
      this.args.push(name + '=' + value);
    }
    return this;
  };

  this.path = function (name) {
    this.paths.push(name);
    return this;
  };

  this.build = function () {
    var result = this.base;
    if (this.paths.length) {
      result += '/' + this.paths.join('/');
    }

    if (this.args.length) {
      result += '?' + this.args.join('&');
    }
    return result;
  };
}

module.exports.deepClone = deepClone;
module.exports.emitNext = emitNext;
module.exports.getOrNull = getOrNull;
module.exports.overwriteArray = overwriteArray;
module.exports.faultTolerantWait = faultTolerantWait;
module.exports.UriBuilder = UriBuilder;

},{"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38}],22:[function(_dereq_,module,exports){
'use strict';

/**
 * We're using that wersion of JSONdiff instead of vanilla one
 * since vanilla has the bug in path calculation and maintaner doesn't accept the patch.
 * 
 * Should return to the using of original module when situation will change
 */

var _typeof2 = _dereq_('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function JsonDiff() {}

JsonDiff.prototype.toString = Object.prototype.toString;

JsonDiff.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;

JsonDiff.prototype.isArray = function (obj) {
  return this.toString.call(obj) === '[object Array]';
};

JsonDiff.prototype.isObject = function (obj) {
  return this.toString.call(obj) === '[object Object]';
};

JsonDiff.prototype.isString = function (obj) {
  return this.toString.call(obj) === '[object String]';
};

JsonDiff.prototype.isFunction = function (obj) {
  return this.toString.call(obj) === '[object Function]';
};

JsonDiff.prototype.has = function (obj, key) {
  return hasOwnProperty.call(obj, key);
};

JsonDiff.prototype.isEqual = function (a, b) {
  return this.eq(a, b, [], []);
};

JsonDiff.prototype.isContainer = function (obj) {
  return this.isArray(obj) || isObject(obj);
};

JsonDiff.prototype.isSameContainer = function (obj1, obj2) {
  return this.isArray(obj1) && this.isArray(obj2) || this.isObject(obj1) && this.isObject(obj2);
};

JsonDiff.prototype.eq = function (a, b, aStack, bStack) {
  var aCtor, bCtor, className, key, length, result, size;
  if (a === b) {
    return a !== 0 || 1 / a === 1 / b;
  }
  if (!(a != null) || !(b != null)) {
    return a === b;
  }
  className = this.toString.call(a);
  if (className !== this.toString.call(b)) {
    return false;
  }
  switch (className) {
    case '[object String]':
      return a === String(b);
    case '[object Number]':
      return a !== +a ? b !== +b : a === 0 ? 1 / a === 1 / b : a === +b;
    case '[object Date]':
    case '[object Boolean]':
      return +a === +b;
    case '[object RegExp]':
      return a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase;
  }
  if ((typeof a === 'undefined' ? 'undefined' : (0, _typeof3.default)(a)) !== 'object' || (typeof b === 'undefined' ? 'undefined' : (0, _typeof3.default)(b)) !== 'object') {
    return false;
  }
  length = aStack.length;
  if (function () {
    var _results;
    _results = [];
    while (length--) {
      _results.push(aStack[length] === a);
    }
    return _results;
  }()) {
    return bStack[length] === b;
  }
  aStack.push(a);
  bStack.push(b);
  size = 0;
  result = true;
  if (className === '[object Array]') {
    size = a.length;
    result = size === b.length;
    if (result) {
      while (size--) {
        if (!(result = this.eq(a[size], b[size], aStack, bStack))) {
          break;
        }
      }
    }
  } else {
    aCtor = a.constructor;
    bCtor = b.constructor;
    if (aCtor !== bCtor && !(this.isFunction(aCtor) && aCtor instanceof aCtor && this.isFunction(bCtor) && bCtor instanceof bCtor)) {
      return false;
    }
    for (key in a) {
      if (this.has(a, key)) {
        size++;
        if (!(result = this.has(b, key) && this.eq(a[key], b[key], aStack, bStack))) {
          break;
        }
      }
    }
    if (result) {
      for (key in b) {
        if (this.has(b, key) && !size--) {
          break;
        }
      }
      result = !size;
    }
  }
  aStack.pop();
  bStack.pop();
  return result;
};

JsonDiff.prototype.getParent = function (paths, path) {
  var parsedPath = path.replace(/\/[^\/]*$/, '');
  if (!parsedPath) {
    parsedPath = '/';
  }
  return paths[parsedPath];
};

JsonDiff.prototype.flattenObject = function (obj, prefix, paths) {
  var i, key, o, _i, _len;
  if (prefix == null) {
    prefix = '/';
  }
  if (paths == null) {
    paths = {};
  }
  paths[prefix] = {
    path: prefix,
    value: obj
  };
  if (prefix !== '/') {
    prefix = prefix + '/';
  }
  if (this.isArray(obj)) {
    for (i = _i = 0, _len = obj.length; _i < _len; i = ++_i) {
      o = obj[i];
      this.flattenObject(o, prefix + i, paths);
    }
  } else if (this.isObject(obj)) {
    for (key in obj) {
      o = obj[key];
      this.flattenObject(o, prefix + key, paths);
    }
  }
  return paths;
};

JsonDiff.prototype.diff = function (obj1, obj2) {
  var add, doc, doc1, doc2, key, key1, key2, keyfrom, keyto, move, patch, paths1, paths2, remove, replace;
  if (!this.isSameContainer(obj1, obj2)) {
    throw new Error('Patches can only be derived from objects or arrays');
  }
  paths1 = this.flattenObject(obj1);
  paths2 = this.flattenObject(obj2);
  add = {};
  remove = {};
  replace = {};
  move = {};
  for (key in paths1) {
    doc1 = paths1[key];
    doc2 = paths2[key];
    if (!this.getParent(paths2, key)) {
      continue;
    } else if (!doc2) {
      remove[key] = doc1;
    } else if (this.isSameContainer(doc1.value, doc2.value)) {
      continue;
    } else if (!this.isEqual(doc1.value, doc2.value)) {
      replace[key] = doc2;
    }
  }
  for (key in paths2) {
    doc1 = paths1[key];
    doc2 = paths2[key];
    if (!doc1 && this.isSameContainer(this.getParent(paths1, key), this.getParent(paths2, key))) {
      add[key] = doc2;
    }
  }
  for (key1 in remove) {
    doc1 = remove[key1];
    for (key2 in add) {
      doc2 = add[key2];
      if (this.isEqual(doc2.value, doc1.value)) {
        delete remove[key1];
        delete add[key2];
        move[key2] = key1;
        break;
      }
    }
  }
  patch = [];
  for (key in add) {
    doc = add[key];
    patch.push({
      op: 'add',
      path: key,
      value: doc.value
    });
  }
  for (key in remove) {
    patch.push({
      op: 'remove',
      path: key
    });
  }
  for (key in replace) {
    doc = replace[key];
    patch.push({
      op: 'replace',
      path: key,
      value: doc.value
    });
  }
  for (keyto in move) {
    keyfrom = move[keyto];
    patch.push({
      op: 'move',
      from: keyfrom,
      path: keyto
    });
  }
  return patch;
};

JsonDiff.diff = function (o1, o2) {
  var diff = new JsonDiff();
  return diff.diff(o1, o2);
};

JsonDiff.isDeepEqual = function (o1, o2) {
  return this.diff(o1, o2).length === 0;
};

module.exports = JsonDiff;

},{"babel-runtime/helpers/typeof":48}],23:[function(_dereq_,module,exports){
'use strict';

var chat = _dereq_('./client');

module.exports = chat;

},{"./client":3}],24:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/array/from"), __esModule: true };
},{"core-js/library/fn/array/from":61}],25:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":62}],26:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/is-iterable"), __esModule: true };
},{"core-js/library/fn/is-iterable":63}],27:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/json/stringify"), __esModule: true };
},{"core-js/library/fn/json/stringify":64}],28:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/map"), __esModule: true };
},{"core-js/library/fn/map":65}],29:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/number/is-integer"), __esModule: true };
},{"core-js/library/fn/number/is-integer":66}],30:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/assign"), __esModule: true };
},{"core-js/library/fn/object/assign":67}],31:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":68}],32:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/define-properties"), __esModule: true };
},{"core-js/library/fn/object/define-properties":69}],33:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":70}],34:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/freeze"), __esModule: true };
},{"core-js/library/fn/object/freeze":71}],35:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/get-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/get-prototype-of":72}],36:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/keys"), __esModule: true };
},{"core-js/library/fn/object/keys":73}],37:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":74}],38:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/promise"), __esModule: true };
},{"core-js/library/fn/promise":75}],39:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/set"), __esModule: true };
},{"core-js/library/fn/set":76}],40:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":77}],41:[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/symbol/iterator"), __esModule: true };
},{"core-js/library/fn/symbol/iterator":78}],42:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],43:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = _dereq_("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
},{"../core-js/object/define-property":33}],44:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _assign = _dereq_("../core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _assign2.default || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};
},{"../core-js/object/assign":30}],45:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _setPrototypeOf = _dereq_("../core-js/object/set-prototype-of");

var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

var _create = _dereq_("../core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _typeof2 = _dereq_("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
  }

  subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
};
},{"../core-js/object/create":31,"../core-js/object/set-prototype-of":37,"../helpers/typeof":48}],46:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _typeof2 = _dereq_("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
};
},{"../helpers/typeof":48}],47:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _isIterable2 = _dereq_("../core-js/is-iterable");

var _isIterable3 = _interopRequireDefault(_isIterable2);

var _getIterator2 = _dereq_("../core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = (0, _getIterator3.default)(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if ((0, _isIterable3.default)(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();
},{"../core-js/get-iterator":25,"../core-js/is-iterable":26}],48:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _iterator = _dereq_("../core-js/symbol/iterator");

var _iterator2 = _interopRequireDefault(_iterator);

var _symbol = _dereq_("../core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _typeof = typeof _symbol2.default === "function" && typeof _iterator2.default === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = typeof _symbol2.default === "function" && _typeof(_iterator2.default) === "symbol" ? function (obj) {
  return typeof obj === "undefined" ? "undefined" : _typeof(obj);
} : function (obj) {
  return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
};
},{"../core-js/symbol":40,"../core-js/symbol/iterator":41}],49:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var Backoff = _dereq_('./lib/backoff');
var ExponentialBackoffStrategy = _dereq_('./lib/strategy/exponential');
var FibonacciBackoffStrategy = _dereq_('./lib/strategy/fibonacci');
var FunctionCall = _dereq_('./lib/function_call.js');

module.exports.Backoff = Backoff;
module.exports.FunctionCall = FunctionCall;
module.exports.FibonacciStrategy = FibonacciBackoffStrategy;
module.exports.ExponentialStrategy = ExponentialBackoffStrategy;

// Constructs a Fibonacci backoff.
module.exports.fibonacci = function(options) {
    return new Backoff(new FibonacciBackoffStrategy(options));
};

// Constructs an exponential backoff.
module.exports.exponential = function(options) {
    return new Backoff(new ExponentialBackoffStrategy(options));
};

// Constructs a FunctionCall for the given function and arguments.
module.exports.call = function(fn, vargs, callback) {
    var args = Array.prototype.slice.call(arguments);
    fn = args[0];
    vargs = args.slice(1, args.length - 1);
    callback = args[args.length - 1];
    return new FunctionCall(fn, vargs, callback);
};

},{"./lib/backoff":50,"./lib/function_call.js":51,"./lib/strategy/exponential":52,"./lib/strategy/fibonacci":53}],50:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var events = _dereq_('events');
var precond = _dereq_('precond');
var util = _dereq_('util');

// A class to hold the state of a backoff operation. Accepts a backoff strategy
// to generate the backoff delays.
function Backoff(backoffStrategy) {
    events.EventEmitter.call(this);

    this.backoffStrategy_ = backoffStrategy;
    this.maxNumberOfRetry_ = -1;
    this.backoffNumber_ = 0;
    this.backoffDelay_ = 0;
    this.timeoutID_ = -1;

    this.handlers = {
        backoff: this.onBackoff_.bind(this)
    };
}
util.inherits(Backoff, events.EventEmitter);

// Sets a limit, greater than 0, on the maximum number of backoffs. A 'fail'
// event will be emitted when the limit is reached.
Backoff.prototype.failAfter = function(maxNumberOfRetry) {
    precond.checkArgument(maxNumberOfRetry > 0,
        'Expected a maximum number of retry greater than 0 but got %s.',
        maxNumberOfRetry);

    this.maxNumberOfRetry_ = maxNumberOfRetry;
};

// Starts a backoff operation. Accepts an optional parameter to let the
// listeners know why the backoff operation was started.
Backoff.prototype.backoff = function(err) {
    precond.checkState(this.timeoutID_ === -1, 'Backoff in progress.');

    if (this.backoffNumber_ === this.maxNumberOfRetry_) {
        this.emit('fail', err);
        this.reset();
    } else {
        this.backoffDelay_ = this.backoffStrategy_.next();
        this.timeoutID_ = setTimeout(this.handlers.backoff, this.backoffDelay_);
        this.emit('backoff', this.backoffNumber_, this.backoffDelay_, err);
    }
};

// Handles the backoff timeout completion.
Backoff.prototype.onBackoff_ = function() {
    this.timeoutID_ = -1;
    this.emit('ready', this.backoffNumber_, this.backoffDelay_);
    this.backoffNumber_++;
};

// Stops any backoff operation and resets the backoff delay to its inital value.
Backoff.prototype.reset = function() {
    this.backoffNumber_ = 0;
    this.backoffStrategy_.reset();
    clearTimeout(this.timeoutID_);
    this.timeoutID_ = -1;
};

module.exports = Backoff;

},{"events":186,"precond":190,"util":233}],51:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var events = _dereq_('events');
var precond = _dereq_('precond');
var util = _dereq_('util');

var Backoff = _dereq_('./backoff');
var FibonacciBackoffStrategy = _dereq_('./strategy/fibonacci');

// Wraps a function to be called in a backoff loop.
function FunctionCall(fn, args, callback) {
    events.EventEmitter.call(this);

    precond.checkIsFunction(fn, 'Expected fn to be a function.');
    precond.checkIsArray(args, 'Expected args to be an array.');
    precond.checkIsFunction(callback, 'Expected callback to be a function.');

    this.function_ = fn;
    this.arguments_ = args;
    this.callback_ = callback;
    this.lastResult_ = [];
    this.numRetries_ = 0;

    this.backoff_ = null;
    this.strategy_ = null;
    this.failAfter_ = -1;
    this.retryPredicate_ = FunctionCall.DEFAULT_RETRY_PREDICATE_;

    this.state_ = FunctionCall.State_.PENDING;
}
util.inherits(FunctionCall, events.EventEmitter);

// States in which the call can be.
FunctionCall.State_ = {
    // Call isn't started yet.
    PENDING: 0,
    // Call is in progress.
    RUNNING: 1,
    // Call completed successfully which means that either the wrapped function
    // returned successfully or the maximal number of backoffs was reached.
    COMPLETED: 2,
    // The call was aborted.
    ABORTED: 3
};

// The default retry predicate which considers any error as retriable.
FunctionCall.DEFAULT_RETRY_PREDICATE_ = function(err) {
  return true;
};

// Checks whether the call is pending.
FunctionCall.prototype.isPending = function() {
    return this.state_ == FunctionCall.State_.PENDING;
};

// Checks whether the call is in progress.
FunctionCall.prototype.isRunning = function() {
    return this.state_ == FunctionCall.State_.RUNNING;
};

// Checks whether the call is completed.
FunctionCall.prototype.isCompleted = function() {
    return this.state_ == FunctionCall.State_.COMPLETED;
};

// Checks whether the call is aborted.
FunctionCall.prototype.isAborted = function() {
    return this.state_ == FunctionCall.State_.ABORTED;
};

// Sets the backoff strategy to use. Can only be called before the call is
// started otherwise an exception will be thrown.
FunctionCall.prototype.setStrategy = function(strategy) {
    precond.checkState(this.isPending(), 'FunctionCall in progress.');
    this.strategy_ = strategy;
    return this; // Return this for chaining.
};

// Sets the predicate which will be used to determine whether the errors
// returned from the wrapped function should be retried or not, e.g. a
// network error would be retriable while a type error would stop the
// function call.
FunctionCall.prototype.retryIf = function(retryPredicate) {
    precond.checkState(this.isPending(), 'FunctionCall in progress.');
    this.retryPredicate_ = retryPredicate;
    return this;
};

// Returns all intermediary results returned by the wrapped function since
// the initial call.
FunctionCall.prototype.getLastResult = function() {
    return this.lastResult_.concat();
};

// Returns the number of times the wrapped function call was retried.
FunctionCall.prototype.getNumRetries = function() {
    return this.numRetries_;
};

// Sets the backoff limit.
FunctionCall.prototype.failAfter = function(maxNumberOfRetry) {
    precond.checkState(this.isPending(), 'FunctionCall in progress.');
    this.failAfter_ = maxNumberOfRetry;
    return this; // Return this for chaining.
};

// Aborts the call.
FunctionCall.prototype.abort = function() {
    if (this.isCompleted() || this.isAborted()) {
      return;
    }

    if (this.isRunning()) {
        this.backoff_.reset();
    }

    this.state_ = FunctionCall.State_.ABORTED;
    this.lastResult_ = [new Error('Backoff aborted.')];
    this.emit('abort');
    this.doCallback_();
};

// Initiates the call to the wrapped function. Accepts an optional factory
// function used to create the backoff instance; used when testing.
FunctionCall.prototype.start = function(backoffFactory) {
    precond.checkState(!this.isAborted(), 'FunctionCall is aborted.');
    precond.checkState(this.isPending(), 'FunctionCall already started.');

    var strategy = this.strategy_ || new FibonacciBackoffStrategy();

    this.backoff_ = backoffFactory ?
        backoffFactory(strategy) :
        new Backoff(strategy);

    this.backoff_.on('ready', this.doCall_.bind(this, true /* isRetry */));
    this.backoff_.on('fail', this.doCallback_.bind(this));
    this.backoff_.on('backoff', this.handleBackoff_.bind(this));

    if (this.failAfter_ > 0) {
        this.backoff_.failAfter(this.failAfter_);
    }

    this.state_ = FunctionCall.State_.RUNNING;
    this.doCall_(false /* isRetry */);
};

// Calls the wrapped function.
FunctionCall.prototype.doCall_ = function(isRetry) {
    if (isRetry) {
        this.numRetries_++;
    }
    var eventArgs = ['call'].concat(this.arguments_);
    events.EventEmitter.prototype.emit.apply(this, eventArgs);
    var callback = this.handleFunctionCallback_.bind(this);
    this.function_.apply(null, this.arguments_.concat(callback));
};

// Calls the wrapped function's callback with the last result returned by the
// wrapped function.
FunctionCall.prototype.doCallback_ = function() {
    this.callback_.apply(null, this.lastResult_);
};

// Handles wrapped function's completion. This method acts as a replacement
// for the original callback function.
FunctionCall.prototype.handleFunctionCallback_ = function() {
    if (this.isAborted()) {
        return;
    }

    var args = Array.prototype.slice.call(arguments);
    this.lastResult_ = args; // Save last callback arguments.
    events.EventEmitter.prototype.emit.apply(this, ['callback'].concat(args));

    var err = args[0];
    if (err && this.retryPredicate_(err)) {
        this.backoff_.backoff(err);
    } else {
        this.state_ = FunctionCall.State_.COMPLETED;
        this.doCallback_();
    }
};

// Handles the backoff event by reemitting it.
FunctionCall.prototype.handleBackoff_ = function(number, delay, err) {
    this.emit('backoff', number, delay, err);
};

module.exports = FunctionCall;

},{"./backoff":50,"./strategy/fibonacci":53,"events":186,"precond":190,"util":233}],52:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var util = _dereq_('util');
var precond = _dereq_('precond');

var BackoffStrategy = _dereq_('./strategy');

// Exponential backoff strategy.
function ExponentialBackoffStrategy(options) {
    BackoffStrategy.call(this, options);
    this.backoffDelay_ = 0;
    this.nextBackoffDelay_ = this.getInitialDelay();
    this.factor_ = ExponentialBackoffStrategy.DEFAULT_FACTOR;

    if (options && options.factor !== undefined) {
        precond.checkArgument(options.factor > 1,
            'Exponential factor should be greater than 1 but got %s.',
            options.factor);
        this.factor_ = options.factor;
    }
}
util.inherits(ExponentialBackoffStrategy, BackoffStrategy);

// Default multiplication factor used to compute the next backoff delay from
// the current one. The value can be overridden by passing a custom factor as
// part of the options.
ExponentialBackoffStrategy.DEFAULT_FACTOR = 2;

ExponentialBackoffStrategy.prototype.next_ = function() {
    this.backoffDelay_ = Math.min(this.nextBackoffDelay_, this.getMaxDelay());
    this.nextBackoffDelay_ = this.backoffDelay_ * this.factor_;
    return this.backoffDelay_;
};

ExponentialBackoffStrategy.prototype.reset_ = function() {
    this.backoffDelay_ = 0;
    this.nextBackoffDelay_ = this.getInitialDelay();
};

module.exports = ExponentialBackoffStrategy;

},{"./strategy":54,"precond":190,"util":233}],53:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var util = _dereq_('util');

var BackoffStrategy = _dereq_('./strategy');

// Fibonacci backoff strategy.
function FibonacciBackoffStrategy(options) {
    BackoffStrategy.call(this, options);
    this.backoffDelay_ = 0;
    this.nextBackoffDelay_ = this.getInitialDelay();
}
util.inherits(FibonacciBackoffStrategy, BackoffStrategy);

FibonacciBackoffStrategy.prototype.next_ = function() {
    var backoffDelay = Math.min(this.nextBackoffDelay_, this.getMaxDelay());
    this.nextBackoffDelay_ += this.backoffDelay_;
    this.backoffDelay_ = backoffDelay;
    return backoffDelay;
};

FibonacciBackoffStrategy.prototype.reset_ = function() {
    this.nextBackoffDelay_ = this.getInitialDelay();
    this.backoffDelay_ = 0;
};

module.exports = FibonacciBackoffStrategy;

},{"./strategy":54,"util":233}],54:[function(_dereq_,module,exports){
//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

var events = _dereq_('events');
var util = _dereq_('util');

function isDef(value) {
    return value !== undefined && value !== null;
}

// Abstract class defining the skeleton for the backoff strategies. Accepts an
// object holding the options for the backoff strategy:
//
//  * `randomisationFactor`: The randomisation factor which must be between 0
//     and 1 where 1 equates to a randomization factor of 100% and 0 to no
//     randomization.
//  * `initialDelay`: The backoff initial delay in milliseconds.
//  * `maxDelay`: The backoff maximal delay in milliseconds.
function BackoffStrategy(options) {
    options = options || {};

    if (isDef(options.initialDelay) && options.initialDelay < 1) {
        throw new Error('The initial timeout must be greater than 0.');
    } else if (isDef(options.maxDelay) && options.maxDelay < 1) {
        throw new Error('The maximal timeout must be greater than 0.');
    }

    this.initialDelay_ = options.initialDelay || 100;
    this.maxDelay_ = options.maxDelay || 10000;

    if (this.maxDelay_ <= this.initialDelay_) {
        throw new Error('The maximal backoff delay must be ' +
                        'greater than the initial backoff delay.');
    }

    if (isDef(options.randomisationFactor) &&
        (options.randomisationFactor < 0 || options.randomisationFactor > 1)) {
        throw new Error('The randomisation factor must be between 0 and 1.');
    }

    this.randomisationFactor_ = options.randomisationFactor || 0;
}

// Gets the maximal backoff delay.
BackoffStrategy.prototype.getMaxDelay = function() {
    return this.maxDelay_;
};

// Gets the initial backoff delay.
BackoffStrategy.prototype.getInitialDelay = function() {
    return this.initialDelay_;
};

// Template method that computes and returns the next backoff delay in
// milliseconds.
BackoffStrategy.prototype.next = function() {
    var backoffDelay = this.next_();
    var randomisationMultiple = 1 + Math.random() * this.randomisationFactor_;
    var randomizedDelay = Math.round(backoffDelay * randomisationMultiple);
    return randomizedDelay;
};

// Computes and returns the next backoff delay. Intended to be overridden by
// subclasses.
BackoffStrategy.prototype.next_ = function() {
    throw new Error('BackoffStrategy.next_() unimplemented.');
};

// Template method that resets the backoff delay to its initial value.
BackoffStrategy.prototype.reset = function() {
    this.reset_();
};

// Resets the backoff delay to its initial value. Intended to be overridden by
// subclasses.
BackoffStrategy.prototype.reset_ = function() {
    throw new Error('BackoffStrategy.reset_() unimplemented.');
};

module.exports = BackoffStrategy;

},{"events":186,"util":233}],55:[function(_dereq_,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2015 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.4.7
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};

Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

return PassThroughHandlerContext;
};

},{"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }
    if (self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
}

function Promise(executor) {
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    if (executor !== INTERNAL) {
        check(this, executor);
        this._resolveFromExecutor(executor);
    }
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("expecting an object but got " +
                    "A catch statement predicate " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.4.7";
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./call_get.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL, debug);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./filter.js')(Promise, INTERNAL);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
                toggleScheduled = true;
                div2.classList.toggle("foo");
            };

            return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string";
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":193}],56:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.11.0
(function() {
  var Bottleneck, MIDDLE_PRIORITY, NB_PRIORITIES,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    slice = [].slice;

  NB_PRIORITIES = 10;

  MIDDLE_PRIORITY = 5;

  Bottleneck = (function() {
    var e;

    Bottleneck.strategy = Bottleneck.prototype.strategy = {
      LEAK: 1,
      OVERFLOW: 2,
      OVERFLOW_PRIORITY: 4,
      BLOCK: 3
    };

    Bottleneck.Cluster = Bottleneck.prototype.Cluster = _dereq_("./Cluster");

    Bottleneck.DLList = Bottleneck.prototype.DLList = _dereq_("./DLList");

    Bottleneck.Promise = Bottleneck.prototype.Promise = (function() {
      try {
        return _dereq_("bluebird");
      } catch (error) {
        e = error;
        return typeof Promise !== "undefined" && Promise !== null ? Promise : function() {
          throw new Error("Bottleneck: install 'bluebird' or use Node 0.12 or higher for Promise support");
        };
      }
    })();

    function Bottleneck(maxNb, minTime, highWater, strategy, rejectOnDrop) {
      this.maxNb = maxNb != null ? maxNb : 0;
      this.minTime = minTime != null ? minTime : 0;
      this.highWater = highWater != null ? highWater : -1;
      this.strategy = strategy != null ? strategy : Bottleneck.prototype.strategy.LEAK;
      this.rejectOnDrop = rejectOnDrop != null ? rejectOnDrop : false;
      this.schedulePriority = bind(this.schedulePriority, this);
      this.submitPriority = bind(this.submitPriority, this);
      this.submit = bind(this.submit, this);
      this._nextRequest = Date.now();
      this._nbRunning = 0;
      this._queues = this._makeQueues();
      this._running = {};
      this._nextIndex = 0;
      this._unblockTime = 0;
      this.penalty = (15 * this.minTime) || 5000;
      this.interrupt = false;
      this.reservoir = null;
      this.limiter = null;
      this.events = {};
    }

    Bottleneck.prototype._trigger = function(name, args) {
      if (this.rejectOnDrop && name === "dropped") {
        args[0].cb.apply({}, [new Error("This job has been dropped by Bottleneck")]);
      }
      return setTimeout(((function(_this) {
        return function() {
          var ref;
          return (ref = _this.events[name]) != null ? ref.forEach(function(e) {
            return e.apply({}, args);
          }) : void 0;
        };
      })(this)), 0);
    };

    Bottleneck.prototype._makeQueues = function() {
      var i, j, ref, results;
      results = [];
      for (i = j = 1, ref = NB_PRIORITIES; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
        results.push(new Bottleneck.prototype.DLList());
      }
      return results;
    };

    Bottleneck.prototype.chain = function(limiter) {
      this.limiter = limiter;
      return this;
    };

    Bottleneck.prototype.isBlocked = function() {
      return this._unblockTime >= Date.now();
    };

    Bottleneck.prototype._sanitizePriority = function(priority) {
      var sProperty;
      sProperty = ~~priority !== priority ? MIDDLE_PRIORITY : priority;
      if (sProperty < 0) {
        return 0;
      } else if (sProperty > NB_PRIORITIES - 1) {
        return NB_PRIORITIES - 1;
      } else {
        return sProperty;
      }
    };

    Bottleneck.prototype._find = function(arr, fn) {
      var i, j, len, x;
      for (i = j = 0, len = arr.length; j < len; i = ++j) {
        x = arr[i];
        if (fn(x)) {
          return x;
        }
      }
      return [];
    };

    Bottleneck.prototype.nbQueued = function(priority) {
      if (priority != null) {
        return this._queues[this._sanitizePriority(priority)].length;
      } else {
        return this._queues.reduce((function(a, b) {
          return a + b.length;
        }), 0);
      }
    };

    Bottleneck.prototype.nbRunning = function() {
      return this._nbRunning;
    };

    Bottleneck.prototype._getFirst = function(arr) {
      return this._find(arr, function(x) {
        return x.length > 0;
      });
    };

    Bottleneck.prototype._conditionsCheck = function() {
      return (this.nbRunning() < this.maxNb || this.maxNb <= 0) && ((this.reservoir == null) || this.reservoir > 0);
    };

    Bottleneck.prototype.check = function() {
      return this._conditionsCheck() && (this._nextRequest - Date.now()) <= 0;
    };

    Bottleneck.prototype._tryToRun = function() {
      var done, index, next, queued, wait;
      if (this._conditionsCheck() && (queued = this.nbQueued()) > 0) {
        this._nbRunning++;
        if (this.reservoir != null) {
          this.reservoir--;
        }
        wait = Math.max(this._nextRequest - Date.now(), 0);
        this._nextRequest = Date.now() + wait + this.minTime;
        next = (this._getFirst(this._queues)).shift();
        if (queued === 1) {
          this._trigger("empty", []);
        }
        done = false;
        index = this._nextIndex++;
        this._running[index] = {
          timeout: setTimeout((function(_this) {
            return function() {
              var completed;
              completed = function() {
                var ref;
                if (!done) {
                  done = true;
                  delete _this._running[index];
                  _this._nbRunning--;
                  _this._tryToRun();
                  if (_this.nbRunning() === 0 && _this.nbQueued() === 0) {
                    _this._trigger("idle", []);
                  }
                  if (!_this.interrupt) {
                    return (ref = next.cb) != null ? ref.apply({}, Array.prototype.slice.call(arguments, 0)) : void 0;
                  }
                }
              };
              if (_this.limiter != null) {
                return _this.limiter.submit.apply(_this.limiter, Array.prototype.concat(next.task, next.args, completed));
              } else {
                return next.task.apply({}, next.args.concat(completed));
              }
            };
          })(this), wait),
          job: next
        };
        return true;
      } else {
        return false;
      }
    };

    Bottleneck.prototype.submit = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.submitPriority.apply({}, Array.prototype.concat(MIDDLE_PRIORITY, args));
    };

    Bottleneck.prototype.submitPriority = function() {
      var args, cb, j, job, priority, reachedHighWaterMark, shifted, task;
      priority = arguments[0], task = arguments[1], args = 4 <= arguments.length ? slice.call(arguments, 2, j = arguments.length - 1) : (j = 2, []), cb = arguments[j++];
      job = {
        task: task,
        args: args,
        cb: cb
      };
      priority = this._sanitizePriority(priority);
      reachedHighWaterMark = this.highWater >= 0 && this.nbQueued() === this.highWater && !this.check();
      if (this.strategy === Bottleneck.prototype.strategy.BLOCK && (reachedHighWaterMark || this.isBlocked())) {
        this._unblockTime = Date.now() + this.penalty;
        this._nextRequest = this._unblockTime + this.minTime;
        this._queues = this._makeQueues();
        this._trigger("dropped", [job]);
        return true;
      } else if (reachedHighWaterMark) {
        shifted = this.strategy === Bottleneck.prototype.strategy.LEAK ? (this._getFirst(this._queues.slice(priority).reverse())).shift() : this.strategy === Bottleneck.prototype.strategy.OVERFLOW_PRIORITY ? (this._getFirst(this._queues.slice(priority + 1).reverse())).shift() : this.strategy === Bottleneck.prototype.strategy.OVERFLOW ? job : void 0;
        if (shifted != null) {
          this._trigger("dropped", [shifted]);
        }
        if ((shifted == null) || this.strategy === Bottleneck.prototype.strategy.OVERFLOW) {
          return reachedHighWaterMark;
        }
      }
      this._queues[priority].push(job);
      this._tryToRun();
      return reachedHighWaterMark;
    };

    Bottleneck.prototype.schedule = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.schedulePriority.apply({}, Array.prototype.concat(MIDDLE_PRIORITY, args));
    };

    Bottleneck.prototype.schedulePriority = function() {
      var args, priority, task, wrapped;
      priority = arguments[0], task = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
      wrapped = function() {
        var args, cb, j;
        args = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), cb = arguments[j++];
        return (task.apply({}, args)).then(function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return cb.apply({}, Array.prototype.concat(null, args));
        })["catch"](function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return cb.apply({}, args);
        });
      };
      return new Bottleneck.prototype.Promise((function(_this) {
        return function(resolve, reject) {
          return _this.submitPriority.apply({}, Array.prototype.concat(priority, wrapped, args, function() {
            var args;
            args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
            return (args[0] != null ? reject : (args.shift(), resolve)).apply({}, args);
          }));
        };
      })(this));
    };

    Bottleneck.prototype.changeSettings = function(maxNb, minTime, highWater, strategy, rejectOnDrop) {
      this.maxNb = maxNb != null ? maxNb : this.maxNb;
      this.minTime = minTime != null ? minTime : this.minTime;
      this.highWater = highWater != null ? highWater : this.highWater;
      this.strategy = strategy != null ? strategy : this.strategy;
      this.rejectOnDrop = rejectOnDrop != null ? rejectOnDrop : this.rejectOnDrop;
      while (this._tryToRun()) {}
      return this;
    };

    Bottleneck.prototype.changePenalty = function(penalty) {
      this.penalty = penalty != null ? penalty : this.penalty;
      return this;
    };

    Bottleneck.prototype.changeReservoir = function(reservoir) {
      this.reservoir = reservoir;
      while (this._tryToRun()) {}
      return this;
    };

    Bottleneck.prototype.incrementReservoir = function(incr) {
      if (incr == null) {
        incr = 0;
      }
      this.changeReservoir(this.reservoir + incr);
      return this;
    };

    Bottleneck.prototype.on = function(name, cb) {
      if (this.events[name] != null) {
        this.events[name].push(cb);
      } else {
        this.events[name] = [cb];
      }
      return this;
    };

    Bottleneck.prototype.removeAllListeners = function(name) {
      if (name == null) {
        name = null;
      }
      if (name != null) {
        delete this.events[name];
      } else {
        this.events = {};
      }
      return this;
    };

    Bottleneck.prototype.stopAll = function(interrupt) {
      var j, job, k, keys, l, len, len1;
      this.interrupt = interrupt != null ? interrupt : this.interrupt;
      keys = Object.keys(this._running);
      for (j = 0, len = keys.length; j < len; j++) {
        k = keys[j];
        clearTimeout(this._running[k].timeout);
      }
      this._tryToRun = function() {};
      this.check = function() {
        return false;
      };
      this.submit = this.submitPriority = function() {
        var args, cb, l;
        args = 2 <= arguments.length ? slice.call(arguments, 0, l = arguments.length - 1) : (l = 0, []), cb = arguments[l++];
        return cb(new Error("This limiter is stopped"));
      };
      this.schedule = this.schedulePriority = function() {
        return Promise.reject(new Error("This limiter is stopped"));
      };
      if (this.interrupt) {
        for (l = 0, len1 = keys.length; l < len1; l++) {
          k = keys[l];
          this._trigger("dropped", [this._running[k].job]);
        }
      }
      while (job = (this._getFirst(this._queues)).shift()) {
        this._trigger("dropped", [job]);
      }
      this._trigger("empty", []);
      if (this.nbRunning() === 0) {
        this._trigger("idle", []);
      }
      return this;
    };

    return Bottleneck;

  })();

  module.exports = Bottleneck;

}).call(this);

},{"./Cluster":57,"./DLList":58,"bluebird":55}],57:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.11.0
(function() {
  var Cluster,
    hasProp = {}.hasOwnProperty;

  Cluster = (function() {
    function Cluster(maxNb, minTime, highWater, strategy, rejectOnDrop) {
      this.maxNb = maxNb;
      this.minTime = minTime;
      this.highWater = highWater;
      this.strategy = strategy;
      this.rejectOnDrop = rejectOnDrop;
      this.limiters = {};
      this.Bottleneck = _dereq_("./Bottleneck");
      this.startAutoCleanup();
    }

    Cluster.prototype.key = function(key) {
      var ref;
      if (key == null) {
        key = "";
      }
      return (ref = this.limiters[key]) != null ? ref : (this.limiters[key] = new this.Bottleneck(this.maxNb, this.minTime, this.highWater, this.strategy, this.rejectOnDrop));
    };

    Cluster.prototype.deleteKey = function(key) {
      if (key == null) {
        key = "";
      }
      return delete this.limiters[key];
    };

    Cluster.prototype.all = function(cb) {
      var k, ref, results, v;
      ref = this.limiters;
      results = [];
      for (k in ref) {
        if (!hasProp.call(ref, k)) continue;
        v = ref[k];
        results.push(cb(v));
      }
      return results;
    };

    Cluster.prototype.keys = function() {
      return Object.keys(this.limiters);
    };

    Cluster.prototype.startAutoCleanup = function() {
      var base;
      this.stopAutoCleanup();
      return typeof (base = (this.interval = setInterval((function(_this) {
        return function() {
          var k, ref, results, time, v;
          time = Date.now();
          ref = _this.limiters;
          results = [];
          for (k in ref) {
            v = ref[k];
            if ((v._nextRequest + (1000 * 60 * 5)) < time) {
              results.push(_this.deleteKey(k));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this), 1000 * 30))).unref === "function" ? base.unref() : void 0;
    };

    Cluster.prototype.stopAutoCleanup = function() {
      return clearInterval(this.interval);
    };

    return Cluster;

  })();

  module.exports = Cluster;

}).call(this);

},{"./Bottleneck":56}],58:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.11.0
(function() {
  var DLList;

  DLList = (function() {
    function DLList() {
      this._first = null;
      this._last = null;
      this.length = 0;
    }

    DLList.prototype.push = function(value) {
      var node;
      this.length++;
      node = {
        value: value,
        next: null
      };
      if (this._last != null) {
        this._last.next = node;
        this._last = node;
      } else {
        this._first = this._last = node;
      }
      return void 0;
    };

    DLList.prototype.shift = function() {
      var ref1, value;
      if (this._first == null) {
        return void 0;
      } else {
        this.length--;
      }
      value = this._first.value;
      this._first = (ref1 = this._first.next) != null ? ref1 : (this._last = null);
      return value;
    };

    DLList.prototype.getArray = function() {
      var node, ref, results;
      node = this._first;
      results = [];
      while (node != null) {
        results.push((ref = node, node = node.next, ref.value));
      }
      return results;
    };

    return DLList;

  })();

  module.exports = DLList;

}).call(this);

},{}],59:[function(_dereq_,module,exports){
(function (global){
// Generated by CoffeeScript 1.11.0
(function() {
  module.exports = _dereq_("./Bottleneck");

  if (global.window != null) {
    global.window.Bottleneck = module.exports;
  }

}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Bottleneck":56}],60:[function(_dereq_,module,exports){

},{}],61:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.string.iterator');
_dereq_('../../modules/es6.array.from');
module.exports = _dereq_('../../modules/_core').Array.from;
},{"../../modules/_core":93,"../../modules/es6.array.from":162,"../../modules/es6.string.iterator":177}],62:[function(_dereq_,module,exports){
_dereq_('../modules/web.dom.iterable');
_dereq_('../modules/es6.string.iterator');
module.exports = _dereq_('../modules/core.get-iterator');
},{"../modules/core.get-iterator":160,"../modules/es6.string.iterator":177,"../modules/web.dom.iterable":183}],63:[function(_dereq_,module,exports){
_dereq_('../modules/web.dom.iterable');
_dereq_('../modules/es6.string.iterator');
module.exports = _dereq_('../modules/core.is-iterable');
},{"../modules/core.is-iterable":161,"../modules/es6.string.iterator":177,"../modules/web.dom.iterable":183}],64:[function(_dereq_,module,exports){
var core  = _dereq_('../../modules/_core')
  , $JSON = core.JSON || (core.JSON = {stringify: JSON.stringify});
module.exports = function stringify(it){ // eslint-disable-line no-unused-vars
  return $JSON.stringify.apply($JSON, arguments);
};
},{"../../modules/_core":93}],65:[function(_dereq_,module,exports){
_dereq_('../modules/es6.object.to-string');
_dereq_('../modules/es6.string.iterator');
_dereq_('../modules/web.dom.iterable');
_dereq_('../modules/es6.map');
_dereq_('../modules/es7.map.to-json');
module.exports = _dereq_('../modules/_core').Map;
},{"../modules/_core":93,"../modules/es6.map":164,"../modules/es6.object.to-string":174,"../modules/es6.string.iterator":177,"../modules/es7.map.to-json":179,"../modules/web.dom.iterable":183}],66:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.number.is-integer');
module.exports = _dereq_('../../modules/_core').Number.isInteger;
},{"../../modules/_core":93,"../../modules/es6.number.is-integer":165}],67:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.assign');
module.exports = _dereq_('../../modules/_core').Object.assign;
},{"../../modules/_core":93,"../../modules/es6.object.assign":166}],68:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.create');
var $Object = _dereq_('../../modules/_core').Object;
module.exports = function create(P, D){
  return $Object.create(P, D);
};
},{"../../modules/_core":93,"../../modules/es6.object.create":167}],69:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.define-properties');
var $Object = _dereq_('../../modules/_core').Object;
module.exports = function defineProperties(T, D){
  return $Object.defineProperties(T, D);
};
},{"../../modules/_core":93,"../../modules/es6.object.define-properties":168}],70:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.define-property');
var $Object = _dereq_('../../modules/_core').Object;
module.exports = function defineProperty(it, key, desc){
  return $Object.defineProperty(it, key, desc);
};
},{"../../modules/_core":93,"../../modules/es6.object.define-property":169}],71:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.freeze');
module.exports = _dereq_('../../modules/_core').Object.freeze;
},{"../../modules/_core":93,"../../modules/es6.object.freeze":170}],72:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.get-prototype-of');
module.exports = _dereq_('../../modules/_core').Object.getPrototypeOf;
},{"../../modules/_core":93,"../../modules/es6.object.get-prototype-of":171}],73:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.keys');
module.exports = _dereq_('../../modules/_core').Object.keys;
},{"../../modules/_core":93,"../../modules/es6.object.keys":172}],74:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.set-prototype-of');
module.exports = _dereq_('../../modules/_core').Object.setPrototypeOf;
},{"../../modules/_core":93,"../../modules/es6.object.set-prototype-of":173}],75:[function(_dereq_,module,exports){
_dereq_('../modules/es6.object.to-string');
_dereq_('../modules/es6.string.iterator');
_dereq_('../modules/web.dom.iterable');
_dereq_('../modules/es6.promise');
module.exports = _dereq_('../modules/_core').Promise;
},{"../modules/_core":93,"../modules/es6.object.to-string":174,"../modules/es6.promise":175,"../modules/es6.string.iterator":177,"../modules/web.dom.iterable":183}],76:[function(_dereq_,module,exports){
_dereq_('../modules/es6.object.to-string');
_dereq_('../modules/es6.string.iterator');
_dereq_('../modules/web.dom.iterable');
_dereq_('../modules/es6.set');
_dereq_('../modules/es7.set.to-json');
module.exports = _dereq_('../modules/_core').Set;
},{"../modules/_core":93,"../modules/es6.object.to-string":174,"../modules/es6.set":176,"../modules/es6.string.iterator":177,"../modules/es7.set.to-json":180,"../modules/web.dom.iterable":183}],77:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.symbol');
_dereq_('../../modules/es6.object.to-string');
_dereq_('../../modules/es7.symbol.async-iterator');
_dereq_('../../modules/es7.symbol.observable');
module.exports = _dereq_('../../modules/_core').Symbol;
},{"../../modules/_core":93,"../../modules/es6.object.to-string":174,"../../modules/es6.symbol":178,"../../modules/es7.symbol.async-iterator":181,"../../modules/es7.symbol.observable":182}],78:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.string.iterator');
_dereq_('../../modules/web.dom.iterable');
module.exports = _dereq_('../../modules/_wks-ext').f('iterator');
},{"../../modules/_wks-ext":157,"../../modules/es6.string.iterator":177,"../../modules/web.dom.iterable":183}],79:[function(_dereq_,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],80:[function(_dereq_,module,exports){
module.exports = function(){ /* empty */ };
},{}],81:[function(_dereq_,module,exports){
module.exports = function(it, Constructor, name, forbiddenField){
  if(!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)){
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};
},{}],82:[function(_dereq_,module,exports){
var isObject = _dereq_('./_is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./_is-object":114}],83:[function(_dereq_,module,exports){
var forOf = _dereq_('./_for-of');

module.exports = function(iter, ITERATOR){
  var result = [];
  forOf(iter, false, result.push, result, ITERATOR);
  return result;
};

},{"./_for-of":103}],84:[function(_dereq_,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = _dereq_('./_to-iobject')
  , toLength  = _dereq_('./_to-length')
  , toIndex   = _dereq_('./_to-index');
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};
},{"./_to-index":149,"./_to-iobject":151,"./_to-length":152}],85:[function(_dereq_,module,exports){
// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx      = _dereq_('./_ctx')
  , IObject  = _dereq_('./_iobject')
  , toObject = _dereq_('./_to-object')
  , toLength = _dereq_('./_to-length')
  , asc      = _dereq_('./_array-species-create');
module.exports = function(TYPE, $create){
  var IS_MAP        = TYPE == 1
    , IS_FILTER     = TYPE == 2
    , IS_SOME       = TYPE == 3
    , IS_EVERY      = TYPE == 4
    , IS_FIND_INDEX = TYPE == 6
    , NO_HOLES      = TYPE == 5 || IS_FIND_INDEX
    , create        = $create || asc;
  return function($this, callbackfn, that){
    var O      = toObject($this)
      , self   = IObject(O)
      , f      = ctx(callbackfn, that, 3)
      , length = toLength(self.length)
      , index  = 0
      , result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined
      , val, res;
    for(;length > index; index++)if(NO_HOLES || index in self){
      val = self[index];
      res = f(val, index, O);
      if(TYPE){
        if(IS_MAP)result[index] = res;            // map
        else if(res)switch(TYPE){
          case 3: return true;                    // some
          case 5: return val;                     // find
          case 6: return index;                   // findIndex
          case 2: result.push(val);               // filter
        } else if(IS_EVERY)return false;          // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};
},{"./_array-species-create":87,"./_ctx":95,"./_iobject":110,"./_to-length":152,"./_to-object":153}],86:[function(_dereq_,module,exports){
var isObject = _dereq_('./_is-object')
  , isArray  = _dereq_('./_is-array')
  , SPECIES  = _dereq_('./_wks')('species');

module.exports = function(original){
  var C;
  if(isArray(original)){
    C = original.constructor;
    // cross-realm fallback
    if(typeof C == 'function' && (C === Array || isArray(C.prototype)))C = undefined;
    if(isObject(C)){
      C = C[SPECIES];
      if(C === null)C = undefined;
    }
  } return C === undefined ? Array : C;
};
},{"./_is-array":112,"./_is-object":114,"./_wks":158}],87:[function(_dereq_,module,exports){
// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var speciesConstructor = _dereq_('./_array-species-constructor');

module.exports = function(original, length){
  return new (speciesConstructor(original))(length);
};
},{"./_array-species-constructor":86}],88:[function(_dereq_,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = _dereq_('./_cof')
  , TAG = _dereq_('./_wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function(it, key){
  try {
    return it[key];
  } catch(e){ /* empty */ }
};

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./_cof":89,"./_wks":158}],89:[function(_dereq_,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],90:[function(_dereq_,module,exports){
'use strict';
var dP          = _dereq_('./_object-dp').f
  , create      = _dereq_('./_object-create')
  , redefineAll = _dereq_('./_redefine-all')
  , ctx         = _dereq_('./_ctx')
  , anInstance  = _dereq_('./_an-instance')
  , defined     = _dereq_('./_defined')
  , forOf       = _dereq_('./_for-of')
  , $iterDefine = _dereq_('./_iter-define')
  , step        = _dereq_('./_iter-step')
  , setSpecies  = _dereq_('./_set-species')
  , DESCRIPTORS = _dereq_('./_descriptors')
  , fastKey     = _dereq_('./_meta').fastKey
  , SIZE        = DESCRIPTORS ? '_s' : 'size';

var getEntry = function(that, key){
  // fast case
  var index = fastKey(key), entry;
  if(index !== 'F')return that._i[index];
  // frozen object case
  for(entry = that._f; entry; entry = entry.n){
    if(entry.k == key)return entry;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      anInstance(that, C, NAME, '_i');
      that._i = create(null); // index
      that._f = undefined;    // first entry
      that._l = undefined;    // last entry
      that[SIZE] = 0;         // size
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear(){
        for(var that = this, data = that._i, entry = that._f; entry; entry = entry.n){
          entry.r = true;
          if(entry.p)entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function(key){
        var that  = this
          , entry = getEntry(that, key);
        if(entry){
          var next = entry.n
            , prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if(prev)prev.n = next;
          if(next)next.p = prev;
          if(that._f == entry)that._f = next;
          if(that._l == entry)that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /*, that = undefined */){
        anInstance(this, C, 'forEach');
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3)
          , entry;
        while(entry = entry ? entry.n : this._f){
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while(entry && entry.r)entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key){
        return !!getEntry(this, key);
      }
    });
    if(DESCRIPTORS)dP(C.prototype, 'size', {
      get: function(){
        return defined(this[SIZE]);
      }
    });
    return C;
  },
  def: function(that, key, value){
    var entry = getEntry(that, key)
      , prev, index;
    // change existing entry
    if(entry){
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if(!that._f)that._f = entry;
      if(prev)prev.n = entry;
      that[SIZE]++;
      // add to index
      if(index !== 'F')that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function(C, NAME, IS_MAP){
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function(iterated, kind){
      this._t = iterated;  // target
      this._k = kind;      // kind
      this._l = undefined; // previous
    }, function(){
      var that  = this
        , kind  = that._k
        , entry = that._l;
      // revert to the last existing entry
      while(entry && entry.r)entry = entry.p;
      // get next entry
      if(!that._t || !(that._l = entry = entry ? entry.n : that._t._f)){
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if(kind == 'keys'  )return step(0, entry.k);
      if(kind == 'values')return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values' , !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};
},{"./_an-instance":81,"./_ctx":95,"./_defined":96,"./_descriptors":97,"./_for-of":103,"./_iter-define":117,"./_iter-step":119,"./_meta":123,"./_object-create":126,"./_object-dp":127,"./_redefine-all":139,"./_set-species":142}],91:[function(_dereq_,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var classof = _dereq_('./_classof')
  , from    = _dereq_('./_array-from-iterable');
module.exports = function(NAME){
  return function toJSON(){
    if(classof(this) != NAME)throw TypeError(NAME + "#toJSON isn't generic");
    return from(this);
  };
};
},{"./_array-from-iterable":83,"./_classof":88}],92:[function(_dereq_,module,exports){
'use strict';
var global         = _dereq_('./_global')
  , $export        = _dereq_('./_export')
  , meta           = _dereq_('./_meta')
  , fails          = _dereq_('./_fails')
  , hide           = _dereq_('./_hide')
  , redefineAll    = _dereq_('./_redefine-all')
  , forOf          = _dereq_('./_for-of')
  , anInstance     = _dereq_('./_an-instance')
  , isObject       = _dereq_('./_is-object')
  , setToStringTag = _dereq_('./_set-to-string-tag')
  , dP             = _dereq_('./_object-dp').f
  , each           = _dereq_('./_array-methods')(0)
  , DESCRIPTORS    = _dereq_('./_descriptors');

module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK){
  var Base  = global[NAME]
    , C     = Base
    , ADDER = IS_MAP ? 'set' : 'add'
    , proto = C && C.prototype
    , O     = {};
  if(!DESCRIPTORS || typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function(){
    new C().entries().next();
  }))){
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    C = wrapper(function(target, iterable){
      anInstance(target, C, NAME, '_c');
      target._c = new Base;
      if(iterable != undefined)forOf(iterable, IS_MAP, target[ADDER], target);
    });
    each('add,clear,delete,forEach,get,has,set,keys,values,entries,toJSON'.split(','),function(KEY){
      var IS_ADDER = KEY == 'add' || KEY == 'set';
      if(KEY in proto && !(IS_WEAK && KEY == 'clear'))hide(C.prototype, KEY, function(a, b){
        anInstance(this, C, KEY);
        if(!IS_ADDER && IS_WEAK && !isObject(a))return KEY == 'get' ? undefined : false;
        var result = this._c[KEY](a === 0 ? 0 : a, b);
        return IS_ADDER ? this : result;
      });
    });
    if('size' in proto)dP(C.prototype, 'size', {
      get: function(){
        return this._c.size;
      }
    });
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F, O);

  if(!IS_WEAK)common.setStrong(C, NAME, IS_MAP);

  return C;
};
},{"./_an-instance":81,"./_array-methods":85,"./_descriptors":97,"./_export":101,"./_fails":102,"./_for-of":103,"./_global":104,"./_hide":106,"./_is-object":114,"./_meta":123,"./_object-dp":127,"./_redefine-all":139,"./_set-to-string-tag":143}],93:[function(_dereq_,module,exports){
var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],94:[function(_dereq_,module,exports){
'use strict';
var $defineProperty = _dereq_('./_object-dp')
  , createDesc      = _dereq_('./_property-desc');

module.exports = function(object, index, value){
  if(index in object)$defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};
},{"./_object-dp":127,"./_property-desc":138}],95:[function(_dereq_,module,exports){
// optional / simple context binding
var aFunction = _dereq_('./_a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./_a-function":79}],96:[function(_dereq_,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],97:[function(_dereq_,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !_dereq_('./_fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_fails":102}],98:[function(_dereq_,module,exports){
var isObject = _dereq_('./_is-object')
  , document = _dereq_('./_global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./_global":104,"./_is-object":114}],99:[function(_dereq_,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');
},{}],100:[function(_dereq_,module,exports){
// all enumerable object keys, includes symbols
var getKeys = _dereq_('./_object-keys')
  , gOPS    = _dereq_('./_object-gops')
  , pIE     = _dereq_('./_object-pie');
module.exports = function(it){
  var result     = getKeys(it)
    , getSymbols = gOPS.f;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = pIE.f
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))result.push(key);
  } return result;
};
},{"./_object-gops":132,"./_object-keys":135,"./_object-pie":136}],101:[function(_dereq_,module,exports){
var global    = _dereq_('./_global')
  , core      = _dereq_('./_core')
  , ctx       = _dereq_('./_ctx')
  , hide      = _dereq_('./_hide')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;
},{"./_core":93,"./_ctx":95,"./_global":104,"./_hide":106}],102:[function(_dereq_,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],103:[function(_dereq_,module,exports){
var ctx         = _dereq_('./_ctx')
  , call        = _dereq_('./_iter-call')
  , isArrayIter = _dereq_('./_is-array-iter')
  , anObject    = _dereq_('./_an-object')
  , toLength    = _dereq_('./_to-length')
  , getIterFn   = _dereq_('./core.get-iterator-method')
  , BREAK       = {}
  , RETURN      = {};
var exports = module.exports = function(iterable, entries, fn, that, ITERATOR){
  var iterFn = ITERATOR ? function(){ return iterable; } : getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator, result;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if(result === BREAK || result === RETURN)return result;
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    result = call(iterator, f, step.value, entries);
    if(result === BREAK || result === RETURN)return result;
  }
};
exports.BREAK  = BREAK;
exports.RETURN = RETURN;
},{"./_an-object":82,"./_ctx":95,"./_is-array-iter":111,"./_iter-call":115,"./_to-length":152,"./core.get-iterator-method":159}],104:[function(_dereq_,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],105:[function(_dereq_,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],106:[function(_dereq_,module,exports){
var dP         = _dereq_('./_object-dp')
  , createDesc = _dereq_('./_property-desc');
module.exports = _dereq_('./_descriptors') ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./_descriptors":97,"./_object-dp":127,"./_property-desc":138}],107:[function(_dereq_,module,exports){
module.exports = _dereq_('./_global').document && document.documentElement;
},{"./_global":104}],108:[function(_dereq_,module,exports){
module.exports = !_dereq_('./_descriptors') && !_dereq_('./_fails')(function(){
  return Object.defineProperty(_dereq_('./_dom-create')('div'), 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_descriptors":97,"./_dom-create":98,"./_fails":102}],109:[function(_dereq_,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};
},{}],110:[function(_dereq_,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = _dereq_('./_cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./_cof":89}],111:[function(_dereq_,module,exports){
// check on default Array iterator
var Iterators  = _dereq_('./_iterators')
  , ITERATOR   = _dereq_('./_wks')('iterator')
  , ArrayProto = Array.prototype;

module.exports = function(it){
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};
},{"./_iterators":120,"./_wks":158}],112:[function(_dereq_,module,exports){
// 7.2.2 IsArray(argument)
var cof = _dereq_('./_cof');
module.exports = Array.isArray || function isArray(arg){
  return cof(arg) == 'Array';
};
},{"./_cof":89}],113:[function(_dereq_,module,exports){
// 20.1.2.3 Number.isInteger(number)
var isObject = _dereq_('./_is-object')
  , floor    = Math.floor;
module.exports = function isInteger(it){
  return !isObject(it) && isFinite(it) && floor(it) === it;
};
},{"./_is-object":114}],114:[function(_dereq_,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],115:[function(_dereq_,module,exports){
// call something on iterator step with safe closing on error
var anObject = _dereq_('./_an-object');
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};
},{"./_an-object":82}],116:[function(_dereq_,module,exports){
'use strict';
var create         = _dereq_('./_object-create')
  , descriptor     = _dereq_('./_property-desc')
  , setToStringTag = _dereq_('./_set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
_dereq_('./_hide')(IteratorPrototype, _dereq_('./_wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./_hide":106,"./_object-create":126,"./_property-desc":138,"./_set-to-string-tag":143,"./_wks":158}],117:[function(_dereq_,module,exports){
'use strict';
var LIBRARY        = _dereq_('./_library')
  , $export        = _dereq_('./_export')
  , redefine       = _dereq_('./_redefine')
  , hide           = _dereq_('./_hide')
  , has            = _dereq_('./_has')
  , Iterators      = _dereq_('./_iterators')
  , $iterCreate    = _dereq_('./_iter-create')
  , setToStringTag = _dereq_('./_set-to-string-tag')
  , getPrototypeOf = _dereq_('./_object-gpo')
  , ITERATOR       = _dereq_('./_wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./_export":101,"./_has":105,"./_hide":106,"./_iter-create":116,"./_iterators":120,"./_library":122,"./_object-gpo":133,"./_redefine":140,"./_set-to-string-tag":143,"./_wks":158}],118:[function(_dereq_,module,exports){
var ITERATOR     = _dereq_('./_wks')('iterator')
  , SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }

module.exports = function(exec, skipClosing){
  if(!skipClosing && !SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[ITERATOR]();
    iter.next = function(){ return {done: safe = true}; };
    arr[ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};
},{"./_wks":158}],119:[function(_dereq_,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],120:[function(_dereq_,module,exports){
module.exports = {};
},{}],121:[function(_dereq_,module,exports){
var getKeys   = _dereq_('./_object-keys')
  , toIObject = _dereq_('./_to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./_object-keys":135,"./_to-iobject":151}],122:[function(_dereq_,module,exports){
module.exports = true;
},{}],123:[function(_dereq_,module,exports){
var META     = _dereq_('./_uid')('meta')
  , isObject = _dereq_('./_is-object')
  , has      = _dereq_('./_has')
  , setDesc  = _dereq_('./_object-dp').f
  , id       = 0;
var isExtensible = Object.isExtensible || function(){
  return true;
};
var FREEZE = !_dereq_('./_fails')(function(){
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function(it){
  setDesc(it, META, {value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  }});
};
var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add metadata
    if(!create)return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function(it, create){
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return true;
    // not necessary to add metadata
    if(!create)return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function(it){
  if(FREEZE && meta.NEED && isExtensible(it) && !has(it, META))setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY:      META,
  NEED:     false,
  fastKey:  fastKey,
  getWeak:  getWeak,
  onFreeze: onFreeze
};
},{"./_fails":102,"./_has":105,"./_is-object":114,"./_object-dp":127,"./_uid":155}],124:[function(_dereq_,module,exports){
var global    = _dereq_('./_global')
  , macrotask = _dereq_('./_task').set
  , Observer  = global.MutationObserver || global.WebKitMutationObserver
  , process   = global.process
  , Promise   = global.Promise
  , isNode    = _dereq_('./_cof')(process) == 'process';

module.exports = function(){
  var head, last, notify;

  var flush = function(){
    var parent, fn;
    if(isNode && (parent = process.domain))parent.exit();
    while(head){
      fn   = head.fn;
      head = head.next;
      try {
        fn();
      } catch(e){
        if(head)notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if(parent)parent.enter();
  };

  // Node.js
  if(isNode){
    notify = function(){
      process.nextTick(flush);
    };
  // browsers with MutationObserver
  } else if(Observer){
    var toggle = true
      , node   = document.createTextNode('');
    new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
    notify = function(){
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if(Promise && Promise.resolve){
    var promise = Promise.resolve();
    notify = function(){
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function(){
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function(fn){
    var task = {fn: fn, next: undefined};
    if(last)last.next = task;
    if(!head){
      head = task;
      notify();
    } last = task;
  };
};
},{"./_cof":89,"./_global":104,"./_task":148}],125:[function(_dereq_,module,exports){
'use strict';
// 19.1.2.1 Object.assign(target, source, ...)
var getKeys  = _dereq_('./_object-keys')
  , gOPS     = _dereq_('./_object-gops')
  , pIE      = _dereq_('./_object-pie')
  , toObject = _dereq_('./_to-object')
  , IObject  = _dereq_('./_iobject')
  , $assign  = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || _dereq_('./_fails')(function(){
  var A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , aLen  = arguments.length
    , index = 1
    , getSymbols = gOPS.f
    , isEnum     = pIE.f;
  while(aLen > index){
    var S      = IObject(arguments[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  } return T;
} : $assign;
},{"./_fails":102,"./_iobject":110,"./_object-gops":132,"./_object-keys":135,"./_object-pie":136,"./_to-object":153}],126:[function(_dereq_,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = _dereq_('./_an-object')
  , dPs         = _dereq_('./_object-dps')
  , enumBugKeys = _dereq_('./_enum-bug-keys')
  , IE_PROTO    = _dereq_('./_shared-key')('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = _dereq_('./_dom-create')('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  _dereq_('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":82,"./_dom-create":98,"./_enum-bug-keys":99,"./_html":107,"./_object-dps":128,"./_shared-key":144}],127:[function(_dereq_,module,exports){
var anObject       = _dereq_('./_an-object')
  , IE8_DOM_DEFINE = _dereq_('./_ie8-dom-define')
  , toPrimitive    = _dereq_('./_to-primitive')
  , dP             = Object.defineProperty;

exports.f = _dereq_('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};
},{"./_an-object":82,"./_descriptors":97,"./_ie8-dom-define":108,"./_to-primitive":154}],128:[function(_dereq_,module,exports){
var dP       = _dereq_('./_object-dp')
  , anObject = _dereq_('./_an-object')
  , getKeys  = _dereq_('./_object-keys');

module.exports = _dereq_('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};
},{"./_an-object":82,"./_descriptors":97,"./_object-dp":127,"./_object-keys":135}],129:[function(_dereq_,module,exports){
var pIE            = _dereq_('./_object-pie')
  , createDesc     = _dereq_('./_property-desc')
  , toIObject      = _dereq_('./_to-iobject')
  , toPrimitive    = _dereq_('./_to-primitive')
  , has            = _dereq_('./_has')
  , IE8_DOM_DEFINE = _dereq_('./_ie8-dom-define')
  , gOPD           = Object.getOwnPropertyDescriptor;

exports.f = _dereq_('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P){
  O = toIObject(O);
  P = toPrimitive(P, true);
  if(IE8_DOM_DEFINE)try {
    return gOPD(O, P);
  } catch(e){ /* empty */ }
  if(has(O, P))return createDesc(!pIE.f.call(O, P), O[P]);
};
},{"./_descriptors":97,"./_has":105,"./_ie8-dom-define":108,"./_object-pie":136,"./_property-desc":138,"./_to-iobject":151,"./_to-primitive":154}],130:[function(_dereq_,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = _dereq_('./_to-iobject')
  , gOPN      = _dereq_('./_object-gopn').f
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return gOPN(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it){
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":131,"./_to-iobject":151}],131:[function(_dereq_,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys      = _dereq_('./_object-keys-internal')
  , hiddenKeys = _dereq_('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O){
  return $keys(O, hiddenKeys);
};
},{"./_enum-bug-keys":99,"./_object-keys-internal":134}],132:[function(_dereq_,module,exports){
exports.f = Object.getOwnPropertySymbols;
},{}],133:[function(_dereq_,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = _dereq_('./_has')
  , toObject    = _dereq_('./_to-object')
  , IE_PROTO    = _dereq_('./_shared-key')('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};
},{"./_has":105,"./_shared-key":144,"./_to-object":153}],134:[function(_dereq_,module,exports){
var has          = _dereq_('./_has')
  , toIObject    = _dereq_('./_to-iobject')
  , arrayIndexOf = _dereq_('./_array-includes')(false)
  , IE_PROTO     = _dereq_('./_shared-key')('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};
},{"./_array-includes":84,"./_has":105,"./_shared-key":144,"./_to-iobject":151}],135:[function(_dereq_,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = _dereq_('./_object-keys-internal')
  , enumBugKeys = _dereq_('./_enum-bug-keys');

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};
},{"./_enum-bug-keys":99,"./_object-keys-internal":134}],136:[function(_dereq_,module,exports){
exports.f = {}.propertyIsEnumerable;
},{}],137:[function(_dereq_,module,exports){
// most Object methods by ES6 should accept primitives
var $export = _dereq_('./_export')
  , core    = _dereq_('./_core')
  , fails   = _dereq_('./_fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./_core":93,"./_export":101,"./_fails":102}],138:[function(_dereq_,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],139:[function(_dereq_,module,exports){
var hide = _dereq_('./_hide');
module.exports = function(target, src, safe){
  for(var key in src){
    if(safe && target[key])target[key] = src[key];
    else hide(target, key, src[key]);
  } return target;
};
},{"./_hide":106}],140:[function(_dereq_,module,exports){
module.exports = _dereq_('./_hide');
},{"./_hide":106}],141:[function(_dereq_,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = _dereq_('./_is-object')
  , anObject = _dereq_('./_an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function(test, buggy, set){
      try {
        set = _dereq_('./_ctx')(Function.call, _dereq_('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch(e){ buggy = true; }
      return function setPrototypeOf(O, proto){
        check(O, proto);
        if(buggy)O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};
},{"./_an-object":82,"./_ctx":95,"./_is-object":114,"./_object-gopd":129}],142:[function(_dereq_,module,exports){
'use strict';
var global      = _dereq_('./_global')
  , core        = _dereq_('./_core')
  , dP          = _dereq_('./_object-dp')
  , DESCRIPTORS = _dereq_('./_descriptors')
  , SPECIES     = _dereq_('./_wks')('species');

module.exports = function(KEY){
  var C = typeof core[KEY] == 'function' ? core[KEY] : global[KEY];
  if(DESCRIPTORS && C && !C[SPECIES])dP.f(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./_core":93,"./_descriptors":97,"./_global":104,"./_object-dp":127,"./_wks":158}],143:[function(_dereq_,module,exports){
var def = _dereq_('./_object-dp').f
  , has = _dereq_('./_has')
  , TAG = _dereq_('./_wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./_has":105,"./_object-dp":127,"./_wks":158}],144:[function(_dereq_,module,exports){
var shared = _dereq_('./_shared')('keys')
  , uid    = _dereq_('./_uid');
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};
},{"./_shared":145,"./_uid":155}],145:[function(_dereq_,module,exports){
var global = _dereq_('./_global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./_global":104}],146:[function(_dereq_,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject  = _dereq_('./_an-object')
  , aFunction = _dereq_('./_a-function')
  , SPECIES   = _dereq_('./_wks')('species');
module.exports = function(O, D){
  var C = anObject(O).constructor, S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};
},{"./_a-function":79,"./_an-object":82,"./_wks":158}],147:[function(_dereq_,module,exports){
var toInteger = _dereq_('./_to-integer')
  , defined   = _dereq_('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./_defined":96,"./_to-integer":150}],148:[function(_dereq_,module,exports){
var ctx                = _dereq_('./_ctx')
  , invoke             = _dereq_('./_invoke')
  , html               = _dereq_('./_html')
  , cel                = _dereq_('./_dom-create')
  , global             = _dereq_('./_global')
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(_dereq_('./_cof')(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};
},{"./_cof":89,"./_ctx":95,"./_dom-create":98,"./_global":104,"./_html":107,"./_invoke":109}],149:[function(_dereq_,module,exports){
var toInteger = _dereq_('./_to-integer')
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};
},{"./_to-integer":150}],150:[function(_dereq_,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],151:[function(_dereq_,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = _dereq_('./_iobject')
  , defined = _dereq_('./_defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./_defined":96,"./_iobject":110}],152:[function(_dereq_,module,exports){
// 7.1.15 ToLength
var toInteger = _dereq_('./_to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./_to-integer":150}],153:[function(_dereq_,module,exports){
// 7.1.13 ToObject(argument)
var defined = _dereq_('./_defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./_defined":96}],154:[function(_dereq_,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = _dereq_('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./_is-object":114}],155:[function(_dereq_,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],156:[function(_dereq_,module,exports){
var global         = _dereq_('./_global')
  , core           = _dereq_('./_core')
  , LIBRARY        = _dereq_('./_library')
  , wksExt         = _dereq_('./_wks-ext')
  , defineProperty = _dereq_('./_object-dp').f;
module.exports = function(name){
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if(name.charAt(0) != '_' && !(name in $Symbol))defineProperty($Symbol, name, {value: wksExt.f(name)});
};
},{"./_core":93,"./_global":104,"./_library":122,"./_object-dp":127,"./_wks-ext":157}],157:[function(_dereq_,module,exports){
exports.f = _dereq_('./_wks');
},{"./_wks":158}],158:[function(_dereq_,module,exports){
var store      = _dereq_('./_shared')('wks')
  , uid        = _dereq_('./_uid')
  , Symbol     = _dereq_('./_global').Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;
},{"./_global":104,"./_shared":145,"./_uid":155}],159:[function(_dereq_,module,exports){
var classof   = _dereq_('./_classof')
  , ITERATOR  = _dereq_('./_wks')('iterator')
  , Iterators = _dereq_('./_iterators');
module.exports = _dereq_('./_core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};
},{"./_classof":88,"./_core":93,"./_iterators":120,"./_wks":158}],160:[function(_dereq_,module,exports){
var anObject = _dereq_('./_an-object')
  , get      = _dereq_('./core.get-iterator-method');
module.exports = _dereq_('./_core').getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};
},{"./_an-object":82,"./_core":93,"./core.get-iterator-method":159}],161:[function(_dereq_,module,exports){
var classof   = _dereq_('./_classof')
  , ITERATOR  = _dereq_('./_wks')('iterator')
  , Iterators = _dereq_('./_iterators');
module.exports = _dereq_('./_core').isIterable = function(it){
  var O = Object(it);
  return O[ITERATOR] !== undefined
    || '@@iterator' in O
    || Iterators.hasOwnProperty(classof(O));
};
},{"./_classof":88,"./_core":93,"./_iterators":120,"./_wks":158}],162:[function(_dereq_,module,exports){
'use strict';
var ctx            = _dereq_('./_ctx')
  , $export        = _dereq_('./_export')
  , toObject       = _dereq_('./_to-object')
  , call           = _dereq_('./_iter-call')
  , isArrayIter    = _dereq_('./_is-array-iter')
  , toLength       = _dereq_('./_to-length')
  , createProperty = _dereq_('./_create-property')
  , getIterFn      = _dereq_('./core.get-iterator-method');

$export($export.S + $export.F * !_dereq_('./_iter-detect')(function(iter){ Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
    var O       = toObject(arrayLike)
      , C       = typeof this == 'function' ? this : Array
      , aLen    = arguments.length
      , mapfn   = aLen > 1 ? arguments[1] : undefined
      , mapping = mapfn !== undefined
      , index   = 0
      , iterFn  = getIterFn(O)
      , length, result, step, iterator;
    if(mapping)mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if(iterFn != undefined && !(C == Array && isArrayIter(iterFn))){
      for(iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++){
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for(result = new C(length); length > index; index++){
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});

},{"./_create-property":94,"./_ctx":95,"./_export":101,"./_is-array-iter":111,"./_iter-call":115,"./_iter-detect":118,"./_to-length":152,"./_to-object":153,"./core.get-iterator-method":159}],163:[function(_dereq_,module,exports){
'use strict';
var addToUnscopables = _dereq_('./_add-to-unscopables')
  , step             = _dereq_('./_iter-step')
  , Iterators        = _dereq_('./_iterators')
  , toIObject        = _dereq_('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = _dereq_('./_iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./_add-to-unscopables":80,"./_iter-define":117,"./_iter-step":119,"./_iterators":120,"./_to-iobject":151}],164:[function(_dereq_,module,exports){
'use strict';
var strong = _dereq_('./_collection-strong');

// 23.1 Map Objects
module.exports = _dereq_('./_collection')('Map', function(get){
  return function Map(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key){
    var entry = strong.getEntry(this, key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value){
    return strong.def(this, key === 0 ? 0 : key, value);
  }
}, strong, true);
},{"./_collection":92,"./_collection-strong":90}],165:[function(_dereq_,module,exports){
// 20.1.2.3 Number.isInteger(number)
var $export = _dereq_('./_export');

$export($export.S, 'Number', {isInteger: _dereq_('./_is-integer')});
},{"./_export":101,"./_is-integer":113}],166:[function(_dereq_,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = _dereq_('./_export');

$export($export.S + $export.F, 'Object', {assign: _dereq_('./_object-assign')});
},{"./_export":101,"./_object-assign":125}],167:[function(_dereq_,module,exports){
var $export = _dereq_('./_export')
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', {create: _dereq_('./_object-create')});
},{"./_export":101,"./_object-create":126}],168:[function(_dereq_,module,exports){
var $export = _dereq_('./_export');
// 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
$export($export.S + $export.F * !_dereq_('./_descriptors'), 'Object', {defineProperties: _dereq_('./_object-dps')});
},{"./_descriptors":97,"./_export":101,"./_object-dps":128}],169:[function(_dereq_,module,exports){
var $export = _dereq_('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !_dereq_('./_descriptors'), 'Object', {defineProperty: _dereq_('./_object-dp').f});
},{"./_descriptors":97,"./_export":101,"./_object-dp":127}],170:[function(_dereq_,module,exports){
// 19.1.2.5 Object.freeze(O)
var isObject = _dereq_('./_is-object')
  , meta     = _dereq_('./_meta').onFreeze;

_dereq_('./_object-sap')('freeze', function($freeze){
  return function freeze(it){
    return $freeze && isObject(it) ? $freeze(meta(it)) : it;
  };
});
},{"./_is-object":114,"./_meta":123,"./_object-sap":137}],171:[function(_dereq_,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject        = _dereq_('./_to-object')
  , $getPrototypeOf = _dereq_('./_object-gpo');

_dereq_('./_object-sap')('getPrototypeOf', function(){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});
},{"./_object-gpo":133,"./_object-sap":137,"./_to-object":153}],172:[function(_dereq_,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = _dereq_('./_to-object')
  , $keys    = _dereq_('./_object-keys');

_dereq_('./_object-sap')('keys', function(){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./_object-keys":135,"./_object-sap":137,"./_to-object":153}],173:[function(_dereq_,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = _dereq_('./_export');
$export($export.S, 'Object', {setPrototypeOf: _dereq_('./_set-proto').set});
},{"./_export":101,"./_set-proto":141}],174:[function(_dereq_,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"dup":60}],175:[function(_dereq_,module,exports){
'use strict';
var LIBRARY            = _dereq_('./_library')
  , global             = _dereq_('./_global')
  , ctx                = _dereq_('./_ctx')
  , classof            = _dereq_('./_classof')
  , $export            = _dereq_('./_export')
  , isObject           = _dereq_('./_is-object')
  , aFunction          = _dereq_('./_a-function')
  , anInstance         = _dereq_('./_an-instance')
  , forOf              = _dereq_('./_for-of')
  , speciesConstructor = _dereq_('./_species-constructor')
  , task               = _dereq_('./_task').set
  , microtask          = _dereq_('./_microtask')()
  , PROMISE            = 'Promise'
  , TypeError          = global.TypeError
  , process            = global.process
  , $Promise           = global[PROMISE]
  , process            = global.process
  , isNode             = classof(process) == 'process'
  , empty              = function(){ /* empty */ }
  , Internal, GenericPromiseCapability, Wrapper;

var USE_NATIVE = !!function(){
  try {
    // correct subclassing with @@species support
    var promise     = $Promise.resolve(1)
      , FakePromise = (promise.constructor = {})[_dereq_('./_wks')('species')] = function(exec){ exec(empty, empty); };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch(e){ /* empty */ }
}();

// helpers
var sameConstructor = function(a, b){
  // with library wrapper special case
  return a === b || a === $Promise && b === Wrapper;
};
var isThenable = function(it){
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var newPromiseCapability = function(C){
  return sameConstructor($Promise, C)
    ? new PromiseCapability(C)
    : new GenericPromiseCapability(C);
};
var PromiseCapability = GenericPromiseCapability = function(C){
  var resolve, reject;
  this.promise = new C(function($$resolve, $$reject){
    if(resolve !== undefined || reject !== undefined)throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject  = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject  = aFunction(reject);
};
var perform = function(exec){
  try {
    exec();
  } catch(e){
    return {error: e};
  }
};
var notify = function(promise, isReject){
  if(promise._n)return;
  promise._n = true;
  var chain = promise._c;
  microtask(function(){
    var value = promise._v
      , ok    = promise._s == 1
      , i     = 0;
    var run = function(reaction){
      var handler = ok ? reaction.ok : reaction.fail
        , resolve = reaction.resolve
        , reject  = reaction.reject
        , domain  = reaction.domain
        , result, then;
      try {
        if(handler){
          if(!ok){
            if(promise._h == 2)onHandleUnhandled(promise);
            promise._h = 1;
          }
          if(handler === true)result = value;
          else {
            if(domain)domain.enter();
            result = handler(value);
            if(domain)domain.exit();
          }
          if(result === reaction.promise){
            reject(TypeError('Promise-chain cycle'));
          } else if(then = isThenable(result)){
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch(e){
        reject(e);
      }
    };
    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if(isReject && !promise._h)onUnhandled(promise);
  });
};
var onUnhandled = function(promise){
  task.call(global, function(){
    var value = promise._v
      , abrupt, handler, console;
    if(isUnhandled(promise)){
      abrupt = perform(function(){
        if(isNode){
          process.emit('unhandledRejection', value, promise);
        } else if(handler = global.onunhandledrejection){
          handler({promise: promise, reason: value});
        } else if((console = global.console) && console.error){
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if(abrupt)throw abrupt.error;
  });
};
var isUnhandled = function(promise){
  if(promise._h == 1)return false;
  var chain = promise._a || promise._c
    , i     = 0
    , reaction;
  while(chain.length > i){
    reaction = chain[i++];
    if(reaction.fail || !isUnhandled(reaction.promise))return false;
  } return true;
};
var onHandleUnhandled = function(promise){
  task.call(global, function(){
    var handler;
    if(isNode){
      process.emit('rejectionHandled', promise);
    } else if(handler = global.onrejectionhandled){
      handler({promise: promise, reason: promise._v});
    }
  });
};
var $reject = function(value){
  var promise = this;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if(!promise._a)promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function(value){
  var promise = this
    , then;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if(promise === value)throw TypeError("Promise can't be resolved itself");
    if(then = isThenable(value)){
      microtask(function(){
        var wrapper = {_w: promise, _d: false}; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch(e){
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch(e){
    $reject.call({_w: promise, _d: false}, e); // wrap
  }
};

// constructor polyfill
if(!USE_NATIVE){
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor){
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch(err){
      $reject.call(this, err);
    }
  };
  Internal = function Promise(executor){
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = _dereq_('./_redefine-all')($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected){
      var reaction    = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok     = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail   = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if(this._a)this._a.push(reaction);
      if(this._s)notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function(onRejected){
      return this.then(undefined, onRejected);
    }
  });
  PromiseCapability = function(){
    var promise  = new Internal;
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject  = ctx($reject, promise, 1);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: $Promise});
_dereq_('./_set-to-string-tag')($Promise, PROMISE);
_dereq_('./_set-species')(PROMISE);
Wrapper = _dereq_('./_core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r){
    var capability = newPromiseCapability(this)
      , $$reject   = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x){
    // instanceof instead of internal slot check because we should fix it without replacement native Promise core
    if(x instanceof $Promise && sameConstructor(x.constructor, this))return x;
    var capability = newPromiseCapability(this)
      , $$resolve  = capability.resolve;
    $$resolve(x);
    return capability.promise;
  }
});
$export($export.S + $export.F * !(USE_NATIVE && _dereq_('./_iter-detect')(function(iter){
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , resolve    = capability.resolve
      , reject     = capability.reject;
    var abrupt = perform(function(){
      var values    = []
        , index     = 0
        , remaining = 1;
      forOf(iterable, false, function(promise){
        var $index        = index++
          , alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function(value){
          if(alreadyCalled)return;
          alreadyCalled  = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , reject     = capability.reject;
    var abrupt = perform(function(){
      forOf(iterable, false, function(promise){
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  }
});
},{"./_a-function":79,"./_an-instance":81,"./_classof":88,"./_core":93,"./_ctx":95,"./_export":101,"./_for-of":103,"./_global":104,"./_is-object":114,"./_iter-detect":118,"./_library":122,"./_microtask":124,"./_redefine-all":139,"./_set-species":142,"./_set-to-string-tag":143,"./_species-constructor":146,"./_task":148,"./_wks":158}],176:[function(_dereq_,module,exports){
'use strict';
var strong = _dereq_('./_collection-strong');

// 23.2 Set Objects
module.exports = _dereq_('./_collection')('Set', function(get){
  return function Set(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value){
    return strong.def(this, value = value === 0 ? 0 : value, value);
  }
}, strong);
},{"./_collection":92,"./_collection-strong":90}],177:[function(_dereq_,module,exports){
'use strict';
var $at  = _dereq_('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
_dereq_('./_iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./_iter-define":117,"./_string-at":147}],178:[function(_dereq_,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global         = _dereq_('./_global')
  , has            = _dereq_('./_has')
  , DESCRIPTORS    = _dereq_('./_descriptors')
  , $export        = _dereq_('./_export')
  , redefine       = _dereq_('./_redefine')
  , META           = _dereq_('./_meta').KEY
  , $fails         = _dereq_('./_fails')
  , shared         = _dereq_('./_shared')
  , setToStringTag = _dereq_('./_set-to-string-tag')
  , uid            = _dereq_('./_uid')
  , wks            = _dereq_('./_wks')
  , wksExt         = _dereq_('./_wks-ext')
  , wksDefine      = _dereq_('./_wks-define')
  , keyOf          = _dereq_('./_keyof')
  , enumKeys       = _dereq_('./_enum-keys')
  , isArray        = _dereq_('./_is-array')
  , anObject       = _dereq_('./_an-object')
  , toIObject      = _dereq_('./_to-iobject')
  , toPrimitive    = _dereq_('./_to-primitive')
  , createDesc     = _dereq_('./_property-desc')
  , _create        = _dereq_('./_object-create')
  , gOPNExt        = _dereq_('./_object-gopn-ext')
  , $GOPD          = _dereq_('./_object-gopd')
  , $DP            = _dereq_('./_object-dp')
  , $keys          = _dereq_('./_object-keys')
  , gOPD           = $GOPD.f
  , dP             = $DP.f
  , gOPN           = gOPNExt.f
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , PROTOTYPE      = 'prototype'
  , HIDDEN         = wks('_hidden')
  , TO_PRIMITIVE   = wks('toPrimitive')
  , isEnum         = {}.propertyIsEnumerable
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , OPSymbols      = shared('op-symbols')
  , ObjectProto    = Object[PROTOTYPE]
  , USE_NATIVE     = typeof $Symbol == 'function'
  , QObject        = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(dP({}, 'a', {
    get: function(){ return dP(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = gOPD(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  dP(it, key, D);
  if(protoDesc && it !== ObjectProto)dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it){
  return typeof it == 'symbol';
} : function(it){
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D){
  if(it === ObjectProto)$defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if(has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if(this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  it  = toIObject(it);
  key = toPrimitive(key, true);
  if(it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return;
  var D = gOPD(it, key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = gOPN(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var IS_OP  = it === ObjectProto
    , names  = gOPN(IS_OP ? OPSymbols : toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if(!USE_NATIVE){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function(value){
      if(this === ObjectProto)$set.call(OPSymbols, value);
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if(DESCRIPTORS && setter)setSymbolDesc(ObjectProto, tag, {configurable: true, set: $set});
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString(){
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f   = $defineProperty;
  _dereq_('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  _dereq_('./_object-pie').f  = $propertyIsEnumerable;
  _dereq_('./_object-gops').f = $getOwnPropertySymbols;

  if(DESCRIPTORS && !_dereq_('./_library')){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function(name){
    return wrap(wks(name));
  }
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});

for(var symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), i = 0; symbols.length > i; )wks(symbols[i++]);

for(var symbols = $keys(wks.store), i = 0; symbols.length > i; )wksDefine(symbols[i++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    if(isSymbol(key))return keyOf(SymbolRegistry, key);
    throw TypeError(key + ' is not a symbol!');
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it){
    if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
    var args = [it]
      , i    = 1
      , replacer, $replacer;
    while(arguments.length > i)args.push(arguments[i++]);
    replacer = args[1];
    if(typeof replacer == 'function')$replacer = replacer;
    if($replacer || !isArray(replacer))replacer = function(key, value){
      if($replacer)value = $replacer.call(this, key, value);
      if(!isSymbol(value))return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || _dereq_('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);
},{"./_an-object":82,"./_descriptors":97,"./_enum-keys":100,"./_export":101,"./_fails":102,"./_global":104,"./_has":105,"./_hide":106,"./_is-array":112,"./_keyof":121,"./_library":122,"./_meta":123,"./_object-create":126,"./_object-dp":127,"./_object-gopd":129,"./_object-gopn":131,"./_object-gopn-ext":130,"./_object-gops":132,"./_object-keys":135,"./_object-pie":136,"./_property-desc":138,"./_redefine":140,"./_set-to-string-tag":143,"./_shared":145,"./_to-iobject":151,"./_to-primitive":154,"./_uid":155,"./_wks":158,"./_wks-define":156,"./_wks-ext":157}],179:[function(_dereq_,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = _dereq_('./_export');

$export($export.P + $export.R, 'Map', {toJSON: _dereq_('./_collection-to-json')('Map')});
},{"./_collection-to-json":91,"./_export":101}],180:[function(_dereq_,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = _dereq_('./_export');

$export($export.P + $export.R, 'Set', {toJSON: _dereq_('./_collection-to-json')('Set')});
},{"./_collection-to-json":91,"./_export":101}],181:[function(_dereq_,module,exports){
_dereq_('./_wks-define')('asyncIterator');
},{"./_wks-define":156}],182:[function(_dereq_,module,exports){
_dereq_('./_wks-define')('observable');
},{"./_wks-define":156}],183:[function(_dereq_,module,exports){
_dereq_('./es6.array.iterator');
var global        = _dereq_('./_global')
  , hide          = _dereq_('./_hide')
  , Iterators     = _dereq_('./_iterators')
  , TO_STRING_TAG = _dereq_('./_wks')('toStringTag');

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype;
  if(proto && !proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}
},{"./_global":104,"./_hide":106,"./_iterators":120,"./_wks":158,"./es6.array.iterator":163}],184:[function(_dereq_,module,exports){
module.exports = _dereq_('./lib');

},{"./lib":185}],185:[function(_dereq_,module,exports){
var FORMAT_REGEXP = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

function matchToInteger(match){
  return match === undefined ? 0 : parseInt(match, 10);
}

exports.fromSeconds = function(seconds){
  if(typeof seconds !== 'number'){
    throw new TypeError('Argument `seconds` must be a number');
  }

  var fullSeconds = seconds % 60;
  var fullMinutesInSeconds = (seconds - fullSeconds) % 3600;

  return {
    hours: (seconds - fullSeconds - fullMinutesInSeconds) / 3600,
    minutes: fullMinutesInSeconds / 60,
    seconds: fullSeconds
  };
};

exports.fromString = function(string){
  if(typeof string !== 'string'){
    throw new TypeError('Argument `string` must be a string');
  }

  var matches = string.match(FORMAT_REGEXP);
  if(matches === null || (matches[1] === undefined && matches[2] === undefined && matches[3] === undefined)){
    throw new Error('Could not parse "' + string + '" as a duration.');
  }

  return {
    hours:   matchToInteger(matches[1]),
    minutes: matchToInteger(matches[2]),
    seconds: matchToInteger(matches[3])
  };
};

exports.toString = function(duration) {
  if(typeof duration === 'number'){
    duration = exports.fromSeconds(duration);
  }

  var result = 'PT';

  if(duration.hours > 0){
    result += duration.hours + 'H';
  }
  if(duration.minutes > 0){
    result += duration.minutes + 'M';
  }
  if(duration.seconds > 0){
    result += duration.seconds + 'S';
  }

  if(result === 'PT'){
    result += '0S';
  }

  return result;
};

exports.toSeconds = function(stringOrDuration) {
  var duration = stringOrDuration;

  if(typeof stringOrDuration === 'string') {
    duration = exports.fromString(stringOrDuration);
  }

  return duration.hours * 3600 + duration.minutes * 60 + duration.seconds;
};

},{}],186:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],187:[function(_dereq_,module,exports){
/*

  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine

  Copyright (c) 2012, 2013, 2014, 2015, Jake Gordon and contributors
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE

*/

(function () {

  var StateMachine = {

    //---------------------------------------------------------------------------

    VERSION: "2.4.0",

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED:    1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
      PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function(cfg, target) {

      var initial      = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal     = cfg.terminal || cfg['final'];
      var fsm          = target || cfg.target  || {};
      var events       = cfg.events || [];
      var callbacks    = cfg.callbacks || {};
      var map          = {}; // track state transitions allowed for an event { event: { from: [ to ] } }
      var transitions  = {}; // track events allowed from a state            { state: [ event ] }

      var add = function(e) {
        var from = Array.isArray(e.from) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0 ; n < from.length ; n++) {
          transitions[from[n]] = transitions[from[n]] || [];
          transitions[from[n]].push(e.name);

          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
        }
        if (e.to)
          transitions[e.to] = transitions[e.to] || [];
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for(var n = 0 ; n < events.length ; n++)
        add(events[n]);

      for(var name in map) {
        if (map.hasOwnProperty(name))
          fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for(var name in callbacks) {
        if (callbacks.hasOwnProperty(name))
          fsm[name] = callbacks[name]
      }

      fsm.current     = 'none';
      fsm.is          = function(state) { return Array.isArray(state) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
      fsm.can         = function(event) { return !this.transition && (map[event] !== undefined) && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot      = function(event) { return !this.can(event); };
      fsm.transitions = function()      { return (transitions[this.current] || []).concat(transitions[StateMachine.WILDCARD] || []); };
      fsm.isFinished  = function()      { return this.is(terminal); };
      fsm.error       = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)
      fsm.states      = function() { return Object.keys(transitions).sort() };

      if (initial && !initial.defer)
        fsm[initial.event]();

      return fsm;

    },

    //===========================================================================

    doCallback: function(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        }
        catch(e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }
      }
    },

    beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbeforeevent'],                       name, from, to, args); },
    afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'],      name, from, to, args); },
    leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleavestate'],                        name, from, to, args); },
    enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'],      name, from, to, args); },
    changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },

    beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },

    beforeEvent: function(fsm, name, from, to, args) {
      if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||
          (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))
        return false;
    },

    afterEvent: function(fsm, name, from, to, args) {
      StateMachine.afterThisEvent(fsm, name, from, to, args);
      StateMachine.afterAnyEvent( fsm, name, from, to, args);
    },

    leaveState: function(fsm, name, from, to, args) {
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
          general  = StateMachine.leaveAnyState( fsm, name, from, to, args);
      if ((false === specific) || (false === general))
        return false;
      else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))
        return StateMachine.ASYNC;
    },

    enterState: function(fsm, name, from, to, args) {
      StateMachine.enterThisState(fsm, name, from, to, args);
      StateMachine.enterAnyState( fsm, name, from, to, args);
    },

    //===========================================================================

    buildEvent: function(name, map) {
      return function() {

        var from  = this.current;
        var to    = map[from] || (map[StateMachine.WILDCARD] != StateMachine.WILDCARD ? map[StateMachine.WILDCARD] : from) || from;
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition)
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

        if (this.cannot(name))
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args))
          return StateMachine.Result.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.Result.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function() {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState( fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent( fsm, name, from, to, args);
          return StateMachine.Result.SUCCEEDED;
        };
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        }

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.Result.CANCELLED;
        }
        else if (StateMachine.ASYNC === leave) {
          return StateMachine.Result.PENDING;
        }
        else {
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();
        }

      };
    }

  }; // StateMachine

  //===========================================================================

  //======
  // NODE
  //======
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = StateMachine;
    }
    exports.StateMachine = StateMachine;
  }
  //============
  // AMD/REQUIRE
  //============
  else if (typeof define === 'function' && define.amd) {
    define(function(_dereq_) { return StateMachine; });
  }
  //========
  // BROWSER
  //========
  else if (typeof window !== 'undefined') {
    window.StateMachine = StateMachine;
  }
  //===========
  // WEB WORKER
  //===========
  else if (typeof self !== 'undefined') {
    self.StateMachine = StateMachine;
  }

}());

},{}],188:[function(_dereq_,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";
    var noop = function() {};
    var undefinedType = "undefined";

    function realMethod(methodName) {
        if (typeof console === undefinedType) {
            return false; // We can't build a real method without a console to log to
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // these private functions always need `this` to be set properly

    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }
    }

    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public API
       *
       */

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Package-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    return defaultLogger;
}));

},{}],189:[function(_dereq_,module,exports){
(function (global){
/*!
 * Platform.js <https://mths.be/platform>
 * Copyright 2014-2016 Benjamin Tan <https://demoneaux.github.io/>
 * Copyright 2011-2013 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object. */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object. */
  var oldRoot = root;

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Regular expression to detect Opera. */
  var reOpera = /\bOpera/;

  /** Possible global object. */
  var thisBinding = this;

  /** Used for native method references. */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values. */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // Platform tokens are defined at:
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '10.0': '10',
      '6.4':  '10 Technical Preview',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // Detect Windows version from platform tokens.
    if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) &&
        (data = data[/[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // Correct character case and cleanup string.
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object. */
    var context = root;

    /** Used to flag when a custom context is provided. */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // Juggle arguments.
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object. */
    var nav = context.navigator || {};

    /** Browser user agent string. */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope]. */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome. */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts. */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environments. */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino. */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha. */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta. */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object. */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based).
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]`. */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime. */
    var data;

    /** The CPU architecture. */
    var arch = ua;

    /** Platform description array. */
    var description = [];

    /** Platform alpha/beta indicator. */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform. */
    var useFeatures = ua == userAgent;

    /** The browser/environment version. */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important). */
    var layout = getLayout([
      { 'label': 'EdgeHTML', 'pattern': 'Edge' },
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important). */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Electron',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      { 'label': 'Microsoft Edge', 'pattern': 'Edge' },
      'Midori',
      'Nook Browser',
      'PaleMoon',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      { 'label': 'Samsung Internet', 'pattern': 'SamsungBrowser' },
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'Sunrise',
      'Swiftfox',
      'Waterfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'Firefox for iOS', 'pattern': 'FxiOS' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important). */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      { 'label': 'Galaxy S5', 'pattern': 'SM-G900' },
      { 'label': 'Galaxy S6', 'pattern': 'SM-G920' },
      { 'label': 'Galaxy S6 Edge', 'pattern': 'SM-G925' },
      { 'label': 'Galaxy S7', 'pattern': 'SM-G930' },
      { 'label': 'Galaxy S7 Edge', 'pattern': 'SM-G935' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nexus',
      'Nook',
      'PlayBook',
      'PlayStation Vita',
      'PlayStation',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers. */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Archos': {},
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1, 'Nexus': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable operating systems (order is important). */
    var os = getOS([
      'Windows Phone',
      'Android',
      'CentOS',
      { 'label': 'Chrome OS', 'pattern': 'CrOS' },
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'OpenBSD',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Tizen',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // Lookup the manufacturer by product or scan the UA for the manufacturer.
        return result || (
          value[product] ||
          value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + ' *\\w+-[\\w]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // Split by forward slash and append product version if needed.
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // Correct character case and cleanup string.
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // Convert layout to an array so we can add extra details.
    layout && (layout = [layout]);

    // Detect product names that contain their manufacturer's name.
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // Clean up Google TV.
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // Detect simulators.
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // Detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS.
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // Detect IE Mobile 11.
    if (name == 'IE' && /\blike iPhone OS\b/.test(ua)) {
      data = parse(ua.replace(/like iPhone OS/, ''));
      manufacturer = data.manufacturer;
      product = data.product;
    }
    // Detect iOS.
    else if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // Detect Kubuntu.
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // Detect Android browsers.
    else if ((manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) ||
        (/\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // Detect Silk desktop/accelerated modes.
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // Detect PaleMoon identifying as Firefox.
    else if (name == 'PaleMoon' && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) {
      description.push('identifying as Firefox ' + data[1]);
    }
    // Detect Firefox OS and products running Firefox.
    else if (name == 'Firefox' && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
      os || (os = 'Firefox OS');
      product || (product = data[1]);
    }
    // Detect false positives for Firefox/Safari.
    else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // Escape the `/` for Firefox 1.
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // Clear name of false positives.
        name = null;
      }
      // Reassign a generic name.
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // Add Chrome version to description for Electron.
    else if (name == 'Electron' && (data = (/\bChrome\/([\d.]+)\b/.exec(ua) || 0)[1])) {
      description.push('Chromium ' + data);
    }
    // Detect non-Opera (Presto-based) versions (order is important).
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|Edge|FxiOS|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // Detect stubborn layout engines.
    if ((data =
          layout == 'iCab' && parseFloat(version) > 3 && 'WebKit' ||
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident') ||
          layout == 'WebKit' && /\bPlayStation\b(?! Vita\b)/i.test(name) && 'NetFront'
        )) {
      layout = [data];
    }
    // Detect Windows Phone 7 desktop mode.
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // Detect Windows Phone 8.x desktop mode.
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8.x';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // Detect IE 11 identifying as other browsers.
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (name) {
        description.push('identifying as ' + name + (version ? ' ' + version : ''));
      }
      name = 'IE';
      version = data[1];
    }
    // Leverage environment features.
    if (useFeatures) {
      // Detect server-side environments.
      // Rhino has a global function while others have a global object.
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (isModuleScope && isHostType(context, 'system') && (data = [context.system])[0]) {
          os || (os = data[0].os || null);
          try {
            data[1] = context.require('ringo/engine').version;
            version = data[1].join('.');
            name = 'RingoJS';
          } catch(e) {
            if (data[0].global.system == context.system) {
              name = 'Narwhal';
            }
          }
        }
        else if (
          typeof context.process == 'object' && !context.process.browser &&
          (data = context.process)
        ) {
          if (typeof data.versions == 'object') {
            if (typeof data.versions.electron == 'string') {
              description.push('Node ' + data.versions.node);
              name = 'Electron';
              version = data.versions.electron;
            } else if (typeof data.versions.nw == 'string') {
              description.push('Chromium ' + version, 'Node ' + data.versions.node);
              name = 'NW.js';
              version = data.versions.nw;
            }
          } else {
            name = 'Node.js';
            arch = data.arch;
            os = data.platform;
            var version = /[\d.]+/.exec(data.version)
            version = (version && version.length > 0) ? version[0] : 'unknown';
          }
        }
        else if (rhino) {
          name = 'Rhino';
        }
      }
      // Detect Adobe AIR.
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // Detect PhantomJS.
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // Detect IE compatibility modes.
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // We're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode.
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      // Detect IE 11 masking as other browsers.
      else if (typeof doc.documentMode == 'number' && /^(?:Chrome|Firefox)\b/.test(name)) {
        description.push('masking as ' + name + ' ' + version);
        name = 'IE';
        version = '11.0';
        layout = ['Trident'];
        os = 'Windows';
      }
      os = os && format(os);
    }
    // Detect prerelease phases.
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // Detect Firefox Mobile.
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // Obscure Maxthon's unreliable version.
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // Detect Xbox 360 and Xbox One.
    else if (/\bXbox\b/i.test(product)) {
      if (product == 'Xbox 360') {
        os = null;
      }
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // Add mobile postfix.
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // Detect IE platform preview.
    else if (name == 'IE' && useFeatures) {
      try {
        if (context.external === null) {
          description.unshift('platform preview');
        }
      } catch(e) {
        description.unshift('embedded');
      }
    }
    // Detect BlackBerry OS version.
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // Detect Opera identifying/masking itself as another browser.
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && product != 'Wii' && (
          (useFeatures && opera) ||
          (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
          (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
          (name == 'IE' && (
            (os && !/^Win/.test(os) && version > 5.5) ||
            /\bWindows XP\b/.test(os) && version > 8 ||
            version == 8 && !/\bTrident\b/.test(ua)
          ))
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {
      // When "identifying", the UA contains both Opera and the other browser's name.
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // When "masking", the UA contains only the other browser's name.
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // Detect WebKit Nightly and approximate Chrome/Safari versions.
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // Correct build number for numeric comparison.
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // Nightly builds are postfixed with a "+".
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // Clear incorrect browser versions.
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // Use the full Chrome version when available.
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // Detect Blink layout engine.
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == 'WebKit') {
        layout = ['Blink'];
      }
      // Detect JavaScriptCore.
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // Add the postfix of ".x" or "+" for approximate versions.
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // Obscure version for some Safari 1-2 releases.
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // Detect Opera desktop modes.
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // Detect Chrome desktop mode.
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // Strip incorrect OS versions.
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // Add layout engine.
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        name != 'Safari' && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|Web)/.test(name) && layout[1])) {
      // Don't add layout details to description if they are falsey.
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // Combine contextual information.
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // Append manufacturer to description.
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // Append product to description.
    if (product) {
      description.push((/^on /.test(description[description.length - 1]) ? '' : 'on ') + product);
    }
    // Parse the OS into an object.
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // Add browser/OS architecture.
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }
    // Chrome 39 and above on OS X is always 64-bit.
    else if (
        os && /^OS X/.test(os.family) &&
        name == 'Chrome' && parseFloat(version) >= 39
    ) {
      os.architecture = 64;
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * The list of common layout engines include:
     * "Blink", "EdgeHTML", "Gecko", "Trident" and "WebKit"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * The list of manufacturers include:
     * "Apple", "Archos", "Amazon", "Asus", "Barnes & Noble", "BlackBerry",
     * "Google", "HP", "HTC", "LG", "Microsoft", "Motorola", "Nintendo",
     * "Nokia", "Samsung" and "Sony"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * The list of common browser names include:
     * "Chrome", "Electron", "Firefox", "Firefox for iOS", "IE",
     * "Microsoft Edge", "PhantomJS", "Safari", "SeaMonkey", "Silk",
     * "Opera Mini" and "Opera"
     *
     * Mobile versions of some browsers have "Mobile" appended to their name:
     * eg. "Chrome Mobile", "Firefox Mobile", "IE Mobile" and "Opera Mobile"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * The list of common products include:
     *
     * "BlackBerry", "Galaxy S4", "Lumia", "iPad", "iPod", "iPhone", "Kindle",
     * "Kindle Fire", "Nexus", "Nook", "PlayBook", "TouchPad" and "Transformer"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // Export platform.
  var platform = parse();

  // Some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose platform on the global object to prevent errors when platform is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    root.platform = platform;

    // Define as an anonymous module so platform can be aliased through path mapping.
    define(function() {
      return platform;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for CommonJS support.
    forOwn(platform, function(value, key) {
      freeExports[key] = value;
    });
  }
  else {
    // Export to the global object.
    root.platform = platform;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],190:[function(_dereq_,module,exports){
/*
 * Copyright (c) 2012 Mathieu Turcotte
 * Licensed under the MIT license.
 */

module.exports = _dereq_('./lib/checks');
},{"./lib/checks":191}],191:[function(_dereq_,module,exports){
/*
 * Copyright (c) 2012 Mathieu Turcotte
 * Licensed under the MIT license.
 */

var util = _dereq_('util');

var errors = module.exports = _dereq_('./errors');

function failCheck(ExceptionConstructor, callee, messageFormat, formatArgs) {
    messageFormat = messageFormat || '';
    var message = util.format.apply(this, [messageFormat].concat(formatArgs));
    var error = new ExceptionConstructor(message);
    Error.captureStackTrace(error, callee);
    throw error;
}

function failArgumentCheck(callee, message, formatArgs) {
    failCheck(errors.IllegalArgumentError, callee, message, formatArgs);
}

function failStateCheck(callee, message, formatArgs) {
    failCheck(errors.IllegalStateError, callee, message, formatArgs);
}

module.exports.checkArgument = function(value, message) {
    if (!value) {
        failArgumentCheck(arguments.callee, message,
            Array.prototype.slice.call(arguments, 2));
    }
};

module.exports.checkState = function(value, message) {
    if (!value) {
        failStateCheck(arguments.callee, message,
            Array.prototype.slice.call(arguments, 2));
    }
};

module.exports.checkIsDef = function(value, message) {
    if (value !== undefined) {
        return value;
    }

    failArgumentCheck(arguments.callee, message ||
        'Expected value to be defined but was undefined.',
        Array.prototype.slice.call(arguments, 2));
};

module.exports.checkIsDefAndNotNull = function(value, message) {
    // Note that undefined == null.
    if (value != null) {
        return value;
    }

    failArgumentCheck(arguments.callee, message ||
        'Expected value to be defined and not null but got "' +
        typeOf(value) + '".', Array.prototype.slice.call(arguments, 2));
};

// Fixed version of the typeOf operator which returns 'null' for null values
// and 'array' for arrays.
function typeOf(value) {
    var s = typeof value;
    if (s == 'object') {
        if (!value) {
            return 'null';
        } else if (value instanceof Array) {
            return 'array';
        }
    }
    return s;
}

function typeCheck(expect) {
    return function(value, message) {
        var type = typeOf(value);

        if (type == expect) {
            return value;
        }

        failArgumentCheck(arguments.callee, message ||
            'Expected "' + expect + '" but got "' + type + '".',
            Array.prototype.slice.call(arguments, 2));
    };
}

module.exports.checkIsString = typeCheck('string');
module.exports.checkIsArray = typeCheck('array');
module.exports.checkIsNumber = typeCheck('number');
module.exports.checkIsBoolean = typeCheck('boolean');
module.exports.checkIsFunction = typeCheck('function');
module.exports.checkIsObject = typeCheck('object');

},{"./errors":192,"util":233}],192:[function(_dereq_,module,exports){
/*
 * Copyright (c) 2012 Mathieu Turcotte
 * Licensed under the MIT license.
 */

var util = _dereq_('util');

function IllegalArgumentError(message) {
    Error.call(this, message);
    this.message = message;
}
util.inherits(IllegalArgumentError, Error);

IllegalArgumentError.prototype.name = 'IllegalArgumentError';

function IllegalStateError(message) {
    Error.call(this, message);
    this.message = message;
}
util.inherits(IllegalStateError, Error);

IllegalStateError.prototype.name = 'IllegalStateError';

module.exports.IllegalStateError = IllegalStateError;
module.exports.IllegalArgumentError = IllegalArgumentError;
},{"util":233}],193:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],194:[function(_dereq_,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rfc6902 = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

exports.isDestructive = isDestructive;

/**
subtract(a, b) returns the keys in `a` that are not in `b`.
*/
exports.subtract = subtract;

/**
intersection(objects) returns the keys that shared by all given `objects`.
*/
exports.intersection = intersection;
exports.objectType = objectType;

/**
Array-diffing smarter (levenshtein-like) diffing here

To get from the input ABC to the output AZ we could just delete all the input
and say "insert A, insert Z" and be done with it. That's what we do if the
input is empty. But we can be smarter.

          output
               A   Z
               -   -
          [0]  1   2
input A |  1  [0]  1
      B |  2  [1]  1
      C |  3   2  [2]

1) start at 0,0 (+0)
2) keep A (+0)
3) remove B (+1)
4) replace C with Z (+1)

if input (source) is empty, they'll all be in the top row, just a bunch of
additions. If the output is empty, everything will be in the left column, as a
bunch of deletions.
*/
exports.diffArrays = diffArrays;
exports.diffObjects = diffObjects;
exports.diffValues = diffValues;
exports.diffAny = diffAny;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var compare = _dereq_("./equal").compare;

function isDestructive(_ref) {
    var op = _ref.op;

    return op === "remove" || op === "replace" || op === "copy" || op === "move";
}

function subtract(a, b) {
    var obj = {};
    for (var add_key in a) {
        obj[add_key] = 1;
    }
    for (var del_key in b) {
        delete obj[del_key];
    }
    return Object.keys(obj);
}

function intersection(objects) {
    // initialize like union()
    var key_counts = {};
    objects.forEach(function (object) {
        for (var key in object) {
            key_counts[key] = (key_counts[key] || 0) + 1;
        }
    });
    // but then, extra requirement: delete less commonly-seen keys
    var threshold = objects.length;
    for (var key in key_counts) {
        if (key_counts[key] < threshold) {
            delete key_counts[key];
        }
    }
    return Object.keys(key_counts);
}

function objectType(object) {
    if (object === undefined) {
        return "undefined";
    }
    if (object === null) {
        return "null";
    }
    if (Array.isArray(object)) {
        return "array";
    }
    return typeof object;
}

function isArrayAdd(array_operation) {
    return array_operation.op === "add";
}
function isArrayRemove(array_operation) {
    return array_operation.op === "remove";
}
function isArrayReplace(array_operation) {
    return array_operation.op === "replace";
}
function diffArrays(input, output, ptr) {
    // set up cost matrix (very simple initialization: just a map)
    var memo = {
        "0,0": { operations: [], cost: 0 }
    };
    /**
    input[i's] -> output[j's]
       Given the layout above, i is the row, j is the col
       returns a list of Operations needed to get to from input.slice(0, i) to
    output.slice(0, j), the each marked with the total cost of getting there.
    `cost` is a non-negative integer.
    Recursive.
    */
    function dist(i, j) {
        // memoized
        var memoized = memo[i + "," + j];
        if (memoized === undefined) {
            if (compare(input[i - 1], output[j - 1])) {
                // equal (no operations => no cost)
                memoized = dist(i - 1, j - 1);
            } else {
                var alternatives = [];
                if (i > 0) {
                    // NOT topmost row
                    var remove_alternative = dist(i - 1, j);
                    alternatives.push({
                        // the new operation must be pushed on the end
                        operations: remove_alternative.operations.concat({
                            op: "remove",
                            index: i - 1 }),
                        cost: remove_alternative.cost + 1 });
                }
                if (j > 0) {
                    // NOT leftmost column
                    var add_alternative = dist(i, j - 1);
                    alternatives.push({
                        operations: add_alternative.operations.concat({
                            op: "add",
                            index: i - 1,
                            value: output[j - 1] }),
                        cost: add_alternative.cost + 1 });
                }
                if (i > 0 && j > 0) {
                    // TABLE MIDDLE
                    // supposing we replaced it, compute the rest of the costs:
                    var replace_alternative = dist(i - 1, j - 1);
                    // okay, the general plan is to replace it, but we can be smarter,
                    // recursing into the structure and replacing only part of it if
                    // possible, but to do so we'll need the original value
                    alternatives.push({
                        operations: replace_alternative.operations.concat({
                            op: "replace",
                            index: i - 1,
                            original: input[i - 1],
                            value: output[j - 1] }),
                        cost: replace_alternative.cost + 1 });
                }
                // the only other case, i === 0 && j === 0, has already been memoized
                // the meat of the algorithm:
                // sort by cost to find the lowest one (might be several ties for lowest)
                // [4, 6, 7, 1, 2].sort((a, b) => a - b); -> [ 1, 2, 4, 6, 7 ]
                var best = alternatives.sort(function (a, b) {
                    return a.cost - b.cost;
                })[0];
                memoized = best;
            }
            memo[i + "," + j] = memoized;
        }
        return memoized;
    }
    // handle weird objects masquerading as Arrays that don't have proper length
    // properties by using 0 for everything but positive numbers
    var input_length = isNaN(input.length) || input.length <= 0 ? 0 : input.length;
    var output_length = isNaN(output.length) || output.length <= 0 ? 0 : output.length;
    var array_operations = dist(input_length, output_length).operations;

    var _array_operations$reduce = array_operations.reduce(function (_ref, array_operation) {
        var _ref2 = _slicedToArray(_ref, 2);

        var operations = _ref2[0];
        var padding = _ref2[1];

        if (isArrayAdd(array_operation)) {
            var padded_index = array_operation.index + 1 + padding;
            var index_token = padded_index < input_length + padding ? String(padded_index) : "-";
            var operation = {
                op: array_operation.op,
                path: ptr.add(index_token).toString(),
                value: array_operation.value };
            // padding++; // maybe only if array_operation.index > -1 ?
            return [operations.concat(operation), padding + 1];
        } else if (isArrayRemove(array_operation)) {
            var operation = {
                op: array_operation.op,
                path: ptr.add(String(array_operation.index + padding)).toString() };
            // padding--;
            return [operations.concat(operation), padding - 1];
        } else {
            var replace_ptr = ptr.add(String(array_operation.index + padding));
            var replace_operations = diffAny(array_operation.original, array_operation.value, replace_ptr);
            return [operations.concat.apply(operations, _toConsumableArray(replace_operations)), padding];
        }
    }, [[], 0]);

    var _array_operations$reduce2 = _slicedToArray(_array_operations$reduce, 2);

    var operations = _array_operations$reduce2[0];
    var padding = _array_operations$reduce2[1];

    return operations;
}

function diffObjects(input, output, ptr) {
    // if a key is in input but not output -> remove it
    var operations = [];
    subtract(input, output).forEach(function (key) {
        operations.push({ op: "remove", path: ptr.add(key).toString() });
    });
    // if a key is in output but not input -> add it
    subtract(output, input).forEach(function (key) {
        operations.push({ op: "add", path: ptr.add(key).toString(), value: output[key] });
    });
    // if a key is in both, diff it recursively
    intersection([input, output]).forEach(function (key) {
        operations.push.apply(operations, _toConsumableArray(diffAny(input[key], output[key], ptr.add(key))));
    });
    return operations;
}

function diffValues(input, output, ptr) {
    if (!compare(input, output)) {
        return [{ op: "replace", path: ptr.toString(), value: output }];
    }
    return [];
}

function diffAny(input, output, ptr) {
    var input_type = objectType(input);
    var output_type = objectType(output);
    if (input_type == "array" && output_type == "array") {
        return diffArrays(input, output, ptr);
    }
    if (input_type == "object" && output_type == "object") {
        return diffObjects(input, output, ptr);
    }
    // only pairs of arrays and objects can go down a path to produce a smaller
    // diff; everything else must be wholesale replaced if inequal
    return diffValues(input, output, ptr);
}

},{"./equal":2}],2:[function(_dereq_,module,exports){

/**
`compare()` returns true if `left` and `right` are materially equal
(i.e., would produce equivalent JSON), false otherwise.

> Here, "equal" means that the value at the target location and the
> value conveyed by "value" are of the same JSON type, and that they
> are considered equal by the following rules for that type:
> o  strings: are considered equal if they contain the same number of
>    Unicode characters and their code points are byte-by-byte equal.
> o  numbers: are considered equal if their values are numerically
>    equal.
> o  arrays: are considered equal if they contain the same number of
>    values, and if each value can be considered equal to the value at
>    the corresponding position in the other array, using this list of
>    type-specific rules.
> o  objects: are considered equal if they contain the same number of
>    members, and if each member can be considered equal to a member in
>    the other object, by comparing their keys (as strings) and their
>    values (using this list of type-specific rules).
> o  literals (false, true, and null): are considered equal if they are
>    the same.
*/
"use strict";

exports.compare = compare;
Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
zip(a, b) assumes that a.length === b.length.
*/
function zip(a, b) {
    var zipped = [];
    for (var i = 0, l = a.length; i < l; i++) {
        zipped.push([a[i], b[i]]);
    }
    return zipped;
}
/**
compareArrays(left, right) assumes that `left` and `right` are both Arrays.
*/
function compareArrays(left, right) {
    if (left.length !== right.length) {
        return false;
    }return zip(left, right).every(function (pair) {
        return compare(pair[0], pair[1]);
    });
}
/**
compareObjects(left, right) assumes that `left` and `right` are both Objects.
*/
function compareObjects(left, right) {
    var left_keys = Object.keys(left);
    var right_keys = Object.keys(right);
    if (!compareArrays(left_keys, right_keys)) {
        return false;
    }return left_keys.every(function (key) {
        return compare(left[key], right[key]);
    });
}
function compare(left, right) {
    // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
    if (left === right) {
        return true;
    } // check arrays
    if (Array.isArray(left) && Array.isArray(right)) {
        return compareArrays(left, right);
    }
    // check objects
    if (Object(left) === left && Object(right) === right) {
        return compareObjects(left, right);
    }
    // mismatched arrays & objects, etc., are always inequal
    return false;
}

},{}],3:[function(_dereq_,module,exports){
"use strict";

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var MissingError = exports.MissingError = (function (_Error) {
    function MissingError(path) {
        _classCallCheck(this, MissingError);

        _get(Object.getPrototypeOf(MissingError.prototype), "constructor", this).call(this, "Value required at path: " + path);
        this.path = path;
        this.name = this.constructor.name;
    }

    _inherits(MissingError, _Error);

    return MissingError;
})(Error);

var InvalidOperationError = exports.InvalidOperationError = (function (_Error2) {
    function InvalidOperationError(op) {
        _classCallCheck(this, InvalidOperationError);

        _get(Object.getPrototypeOf(InvalidOperationError.prototype), "constructor", this).call(this, "Invalid operation: " + op);
        this.op = op;
        this.name = this.constructor.name;
    }

    _inherits(InvalidOperationError, _Error2);

    return InvalidOperationError;
})(Error);

var TestError = exports.TestError = (function (_Error3) {
    function TestError(actual, expected) {
        _classCallCheck(this, TestError);

        _get(Object.getPrototypeOf(TestError.prototype), "constructor", this).call(this, "Test failed: " + actual + " != " + expected);
        this.actual = actual;
        this.expected = expected;
        this.name = this.constructor.name;
        this.actual = actual;
        this.expected = expected;
    }

    _inherits(TestError, _Error3);

    return TestError;
})(Error);

},{}],4:[function(_dereq_,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

/**
Apply a 'application/json-patch+json'-type patch to an object.

`patch` *must* be an array of operations.

> Operation objects MUST have exactly one "op" member, whose value
> indicates the operation to perform.  Its value MUST be one of "add",
> "remove", "replace", "move", "copy", or "test"; other values are
> errors.

This method currently operates on the target object in-place.

Returns list of results, one for each operation.
  - `null` indicated success.
  - otherwise, the result will be an instance of one of the Error classe
    defined in errors.js.
*/
exports.applyPatch = applyPatch;

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/
exports.createPatch = createPatch;

/**
Produce an 'application/json-patch+json'-type list of tests, to verify that
existing values in an object are identical to the those captured at some
checkpoint (whenever this function is called).

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of test operations.
*/
exports.createTests = createTests;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var InvalidOperationError = _dereq_("./errors").InvalidOperationError;

var Pointer = _dereq_("./pointer").Pointer;

var operationFunctions = _interopRequireWildcard(_dereq_("./patch"));

var _diff = _dereq_("./diff");

var diffAny = _diff.diffAny;
var isDestructive = _diff.isDestructive;

function applyPatch(object, patch) {
    return patch.map(function (operation) {
        var operationFunction = operationFunctions[operation.op];
        // speedy exit if we don't recognize the operation name
        if (operationFunction === undefined) {
            return new InvalidOperationError(operation.op);
        }
        return operationFunction(object, operation);
    });
}

function createPatch(input, output) {
    var ptr = new Pointer();
    // a new Pointer gets a default path of [''] if not specified
    return diffAny(input, output, ptr);
}

function createTest(input, path) {
    var endpoint = Pointer.fromJSON(path).evaluate(input);
    if (endpoint !== undefined) {
        return { op: "test", path: path, value: endpoint.value };
    }
}
function createTests(input, patch) {
    var tests = new Array();
    patch.filter(isDestructive).forEach(function (operation) {
        var pathTest = createTest(input, operation.path);
        if (pathTest) tests.push(pathTest);
        if ("from" in operation) {
            var fromTest = createTest(input, operation.from);
            if (fromTest) tests.push(fromTest);
        }
    });
    return tests;
}

},{"./diff":1,"./errors":3,"./patch":5,"./pointer":6}],5:[function(_dereq_,module,exports){

/**
>  o  If the target location specifies an array index, a new value is
>     inserted into the array at the specified index.
>  o  If the target location specifies an object member that does not
>     already exist, a new member is added to the object.
>  o  If the target location specifies an object member that does exist,
>     that member's value is replaced.
*/
"use strict";

exports.add = add;

/**
> The "remove" operation removes the value at the target location.
> The target location MUST exist for the operation to be successful.
*/
exports.remove = remove;

/**
> The "replace" operation replaces the value at the target location
> with a new value.  The operation object MUST contain a "value" member
> whose content specifies the replacement value.
> The target location MUST exist for the operation to be successful.

> This operation is functionally identical to a "remove" operation for
> a value, followed immediately by an "add" operation at the same
> location with the replacement value.

Even more simply, it's like the add operation with an existence check.
*/
exports.replace = replace;

/**
> The "move" operation removes the value at a specified location and
> adds it to the target location.
> The operation object MUST contain a "from" member, which is a string
> containing a JSON Pointer value that references the location in the
> target document to move the value from.
> This operation is functionally identical to a "remove" operation on
> the "from" location, followed immediately by an "add" operation at
> the target location with the value that was just removed.

> The "from" location MUST NOT be a proper prefix of the "path"
> location; i.e., a location cannot be moved into one of its children.

TODO: throw if the check described in the previous paragraph fails.
*/
exports.move = move;

/**
> The "copy" operation copies the value at a specified location to the
> target location.
> The operation object MUST contain a "from" member, which is a string
> containing a JSON Pointer value that references the location in the
> target document to copy the value from.
> The "from" location MUST exist for the operation to be successful.

> This operation is functionally identical to an "add" operation at the
> target location using the value specified in the "from" member.

Alternatively, it's like 'move' without the 'remove'.
*/
exports.copy = copy;

/**
> The "test" operation tests that a value at the target location is
> equal to a specified value.
> The operation object MUST contain a "value" member that conveys the
> value to be compared to the target location's value.
> The target location MUST be equal to the "value" value for the
> operation to be considered successful.
*/
exports.test = test;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var Pointer = _dereq_("./pointer").Pointer;

var compare = _dereq_("./equal").compare;

var _errors = _dereq_("./errors");

var MissingError = _errors.MissingError;
var TestError = _errors.TestError;

function _add(object, key, value) {
    if (Array.isArray(object)) {
        // `key` must be an index
        if (key == "-") {
            object.push(value);
        } else {
            object.splice(key, 0, value);
        }
    } else {
        object[key] = value;
    }
}
function _remove(object, key) {
    if (Array.isArray(object)) {
        // '-' syntax doesn't make sense when removing
        object.splice(key, 1);
    } else {
        // not sure what the proper behavior is when path = ''
        delete object[key];
    }
}
function add(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    // it's not exactly a "MissingError" in the same way that `remove` is -- more like a MissingParent, or something
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }
    _add(endpoint.parent, endpoint.key, operation.value);
    return null;
}

function remove(object, operation) {
    // endpoint has parent, key, and value properties
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.value === undefined) {
        return new MissingError(operation.path);
    }
    // not sure what the proper behavior is when path = ''
    _remove(endpoint.parent, endpoint.key);
    return null;
}

function replace(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.value === undefined) {
        return new MissingError(operation.path);
    }endpoint.parent[endpoint.key] = operation.value;
    return null;
}

function move(object, operation) {
    var from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) {
        return new MissingError(operation.from);
    }var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }_remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
    return null;
}

function copy(object, operation) {
    var from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) {
        return new MissingError(operation.from);
    }var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }_remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
    return null;
}

function test(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    var result = compare(endpoint.value, operation.value);
    if (!result) {
        return new TestError(endpoint.value, operation.value);
    }return null;
}

},{"./equal":2,"./errors":3,"./pointer":6}],6:[function(_dereq_,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
Unescape token part of a JSON Pointer string

`token` should *not* contain any '/' characters.

> Evaluation of each reference token begins by decoding any escaped
> character sequence.  This is performed by first transforming any
> occurrence of the sequence '~1' to '/', and then transforming any
> occurrence of the sequence '~0' to '~'.  By performing the
> substitutions in this order, an implementation avoids the error of
> turning '~01' first into '~1' and then into '/', which would be
> incorrect (the string '~01' correctly becomes '~1' after
> transformation).

Here's my take:

~1 is unescaped with higher priority than ~0 because it is a lower-order escape character.
I say "lower order" because '/' needs escaping due to the JSON Pointer serialization technique.
Whereas, '~' is escaped because escaping '/' uses the '~' character.
*/
function unescape(token) {
    return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
/** Escape token part of a JSON Pointer string

> '~' needs to be encoded as '~0' and '/'
> needs to be encoded as '~1' when these characters appear in a
> reference token.

This is the exact inverse of `unescape()`, so the reverse replacements must take place in reverse order.
*/
function escape(token) {
    return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
/**
JSON Pointer representation
*/

var Pointer = exports.Pointer = (function () {
    function Pointer() {
        var tokens = arguments[0] === undefined ? [""] : arguments[0];

        _classCallCheck(this, Pointer);

        this.tokens = tokens;
    }

    _createClass(Pointer, {
        toString: {
            value: function toString() {
                return this.tokens.map(escape).join("/");
            }
        },
        evaluate: {
            /**
            Returns an object with 'parent', 'key', and 'value' properties.
            In the special case that pointer = "", parent and key will be null, and `value = obj`
            Otherwise, parent will be the such that `parent[key] == value`
            */

            value: function evaluate(object) {
                var parent = null;
                var token = null;
                for (var i = 1, l = this.tokens.length; i < l; i++) {
                    parent = object;
                    token = this.tokens[i];
                    // not sure if this the best way to handle non-existant paths...
                    object = (parent || {})[token];
                }
                return {
                    parent: parent,
                    key: token,
                    value: object };
            }
        },
        push: {
            value: function push(token) {
                // mutable
                this.tokens.push(token);
            }
        },
        add: {
            /**
            `token` should be a String. It'll be coerced to one anyway.
               immutable (shallowly)
            */

            value: function add(token) {
                var tokens = this.tokens.concat(String(token));
                return new Pointer(tokens);
            }
        }
    }, {
        fromJSON: {
            /**
            `path` *must* be a properly escaped string.
            */

            value: function fromJSON(path) {
                var tokens = path.split("/").map(unescape);
                if (tokens[0] !== "") throw new Error("Invalid JSON Pointer: " + path);
                return new Pointer(tokens);
            }
        }
    });

    return Pointer;
})();

},{}]},{},[4])(4)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],195:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _configuration = _dereq_('./configuration');

var _configuration2 = _interopRequireDefault(_configuration);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _bottleneck = _dereq_('bottleneck');

var _bottleneck2 = _interopRequireDefault(_bottleneck);

var _registrar = _dereq_('./registrar');

var _registrar2 = _interopRequireDefault(_registrar);

var _twilsock = _dereq_('twilsock');

var _twilsock2 = _interopRequireDefault(_twilsock);

var _twilioTransport = _dereq_('twilio-transport');

var _twilioTransport2 = _interopRequireDefault(_twilioTransport);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function limit(fn, to, per) {
  // overflow since no token is passed to arguments
  var limiter = new _bottleneck2.default(to, per, 1, _bottleneck2.default.strategy.LEAK);
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(fn);
    return limiter.schedule.apply(limiter, args);
  };
}

/**
 * @class
 * @alias Notifications
 * @classdesc The helper library for the notification service.
 * Provides high level api for creating and managing notification subscriptions and receiving messages
 * Creates the instance of Notification helper library
 *
 * @constructor
 * @param {string} token - Twilio access token
 * @param {Notifications#ClientOptions} options - Options to customize client behavior
 */

var NotificationsClient = function (_EventEmitter) {
  (0, _inherits3.default)(NotificationsClient, _EventEmitter);

  function NotificationsClient(token, options) {
    (0, _classCallCheck3.default)(this, NotificationsClient);

    var _this = (0, _possibleConstructorReturn3.default)(this, (NotificationsClient.__proto__ || (0, _getPrototypeOf2.default)(NotificationsClient)).call(this));

    if (!token) {
      throw new Error('Token is required for Notifications client');
    }

    options = options || {};

    options.logLevel = options.logLevel || 'error';
    _logger2.default.setLevel(options.logLevel);

    var minTokenRefreshInterval = options.minTokenRefreshInterval || 10000;
    var productId = options.productId || 'notifications';

    options.twilsockClient = options.twilsockClient || new _twilsock2.default(token, options);
    options.transport = options.transport || new _twilioTransport2.default(options.twilsockClient);

    var twilsock = options.twilsockClient;
    var transport = options.transport;

    var reliableTransportState = {
      overall: false,
      transport: false,
      registration: false
    };

    var config = new _configuration2.default(token, options);

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _registrar: { value: new _registrar2.default(productId, transport, twilsock, config) },
      _twilsock: { value: twilsock },
      _reliableTransportState: { value: reliableTransportState },

      updateToken: { value: limit(_this._updateToken.bind(_this), 1, minTokenRefreshInterval), enumerable: true },
      connectionState: {
        get: function get() {
          if (_this._twilsock.state === 'disconnected') {
            return 'disconnected';
          } else if (_this._twilsock.state === 'disconnecting') {
            return 'disconnecting';
          } else if (_this._twilsock.state === 'connected' && _this._reliableTransportState.registration) {
            return 'connected';
          } else if (_this._twilsock.state === 'rejected') {
            return 'denied';
          }

          return 'connecting';
        }
      }
    });

    _this._onTransportStateChange(_this._twilsock.connected);

    _this._registrar.on('transportReady', function (state) {
      _this._onRegistrationStateChange(state ? 'registered' : '');
    });
    _this._registrar.on('stateChanged', function (state) {
      _this._onRegistrationStateChange(state);
    });
    _this._registrar.on('needReliableTransport', _this._onNeedReliableTransport.bind(_this));

    _this._twilsock.on('message', function (type, message) {
      return _this._routeMessage(type, message);
    });
    _this._twilsock.on('connected', function (notificationId) {
      _this._onTransportStateChange(true);
      _this._registrar.setNotificationId('twilsock', notificationId);
    });
    _this._twilsock.on('disconnected', function () {
      _this._onTransportStateChange(false);
    });
    return _this;
  }

  /**
   * Routes messages to the external subscribers
   * @private
   */

  (0, _createClass3.default)(NotificationsClient, [{
    key: '_routeMessage',
    value: function _routeMessage(type, message) {
      _logger2.default.trace('Message arrived: ', type, message);
      this.emit('message', type, message);
    }
  }, {
    key: '_onNeedReliableTransport',
    value: function _onNeedReliableTransport(isNeeded) {
      if (isNeeded) {
        this._twilsock.connect();
      } else {
        this._twilsock.disconnect();
      }
    }
  }, {
    key: '_onRegistrationStateChange',
    value: function _onRegistrationStateChange(state) {
      this._reliableTransportState.registration = state === 'registered';
      this._updateTransportState();
    }
  }, {
    key: '_onTransportStateChange',
    value: function _onTransportStateChange(connected) {
      this._reliableTransportState.transport = connected;
      this._updateTransportState();
    }
  }, {
    key: '_updateTransportState',
    value: function _updateTransportState() {
      var overallState = this._reliableTransportState.transport && this._reliableTransportState.registration;

      if (this._reliableTransportState.overall !== overallState) {
        this._reliableTransportState.overall = overallState;

        _logger2.default.info('Transport ready ' + overallState);
        this.emit('transportReady', overallState);
        this.emit('connectionStateChanged', this.connectionState);
      }
    }

    /**
     * Adds the subscription for the given message type
     * @param {string} messageType The type of message that you want to receive
     * @param {string} channelType. Supported are 'twilsock', 'gcm' and 'fcm'
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType, channelType) {
      channelType = channelType || 'twilsock';
      _logger2.default.trace('Add subscriptions for message type: ', messageType, channelType);

      return this._registrar.subscribe(messageType, channelType);
    }

    /**
     * Remove the subscription for the particular message type
     * @param {string} messageType The type of message that you don't want to receive anymore
     * @param {string} channelType. Supported are 'twilsock', 'gcm' and 'fcm'
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType, channelType) {
      channelType = channelType || 'twilsock';
      _logger2.default.trace('Remove subscriptions for message type: ', messageType, channelType);

      return this._registrar.unsubscribe(messageType, channelType);
    }

    /**
     * Handle incoming push notification.
     * Client application should call this method when it receives push notifications and pass the received data
     * @param {Object} msg - push message object
     * @public
     */

  }, {
    key: 'handlePushNotification',
    value: function handlePushNotification(msg) {
      _logger2.default.warn('Push message passed, but no functionality implemented yet: ' + msg);
    }

    /**
     * Set GCM/FCM token to enable application register for a push messages
     * @param {string} gcmToken/fcmToken Token received from GCM/FCM system
     * @public
     */

  }, {
    key: 'setPushRegistrationId',
    value: function setPushRegistrationId(registrationId, type) {
      this._registrar.setNotificationId(type || 'gcm', registrationId);
    }

    /**
     * Updates auth token for registration
     * @param {string} token Authentication token for registrations
     * @public
     */

  }, {
    key: '_updateToken',
    value: function _updateToken(token) {
      _logger2.default.info('authTokenUpdated');
      if (this._config.token !== token) {
        this._twilsock.updateToken(token);

        this._config.updateToken(token);
        this._registrar.updateToken();
      }
      return _promise2.default.resolve();
    }
  }]);
  return NotificationsClient;
}(_events2.default);

exports.default = NotificationsClient;

(0, _freeze2.default)(NotificationsClient);

/**
 * Fired when new message arrived.
 * @param {Object} message`
 * @event NotificationsClient#message
 */

/**
 * Fired when transport state has changed
 * @param {boolean} transport state
 * @event NotificationsClient#transportReady
 */

/**
 * Fired when transport state has been changed
 * @param {string} transport state
 * @event NotificationsClient#connectionStateChanged
 */

/**
 * These options can be passed to Client constructor
 * @typedef {Object} Notifications#ClientOptions
 * @property {String} [logLevel='error'] - The level of logging to enable. Valid options
 *   (from strictest to broadest): ['silent', 'error', 'warn', 'info', 'debug', 'trace']
 */

module.exports = exports['default'];

},{"./configuration":196,"./logger":198,"./registrar":200,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"bottleneck":59,"events":186,"twilio-transport":224,"twilsock":227}],196:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var ERS_URI = 'https://ers.twilio.com';
var ERS_PATH = '/v1/registrations';

var NotificationConfig = function () {
  function NotificationConfig(token, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, NotificationConfig);

    options = (options || {}).Notification || {};
    var uri = options.ersUri || ERS_URI;

    (0, _defineProperties2.default)(this, {
      _registrarUri: { value: uri + ERS_PATH },
      _token: { value: token, writable: true },

      registrarUri: { get: function get() {
          return _this._registrarUri;
        } },
      token: { get: function get() {
          return _this._token;
        } }
    });
  }

  (0, _createClass3.default)(NotificationConfig, [{
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
    }
  }]);
  return NotificationConfig;
}();

exports.default = NotificationConfig;
module.exports = exports['default'];

},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],197:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = _dereq_('./client');

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

exports.default = _client2.default;
module.exports = exports['default'];

},{"./client":195}],198:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _from = _dereq_('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _loglevel = _dereq_('loglevel');

var _loglevel2 = _interopRequireDefault(_loglevel);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function prepareLine(prefix, args) {
  return [prefix].concat((0, _from2.default)(args));
}

exports.default = {
  setLevel: function setLevel(level) {
    _loglevel2.default.setLevel(level);
  },

  trace: function trace() {
    _loglevel2.default.trace.apply(null, prepareLine('Notify T:', arguments));
  },
  debug: function debug() {
    _loglevel2.default.debug.apply(null, prepareLine('Notify D:', arguments));
  },
  info: function info() {
    _loglevel2.default.info.apply(null, prepareLine('Notify I:', arguments));
  },
  warn: function warn() {
    _loglevel2.default.warn.apply(null, prepareLine('Notify W:', arguments));
  },
  error: function error() {
    _loglevel2.default.error.apply(null, prepareLine('Notify E:', arguments));
  }
};
module.exports = exports['default'];

},{"babel-runtime/core-js/array/from":24,"loglevel":188}],199:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _set2 = _dereq_('babel-runtime/core-js/set');

var _set3 = _interopRequireDefault(_set2);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _javascriptStateMachine = _dereq_('javascript-state-machine');

var _javascriptStateMachine2 = _interopRequireDefault(_javascriptStateMachine);

var _backoff = _dereq_('backoff');

var _backoff2 = _interopRequireDefault(_backoff);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function toArray(_set) {
  var arr = [];
  _set.forEach(function (v) {
    return arr.push(v);
  });
  return arr;
}

/**
 * Creates new instance of the ERS registrar
 *
 * @class RegistrarConnector
 * @classdesc Manages the registrations on ERS service.
 * It deduplicates registrations and manages them automatically
 *
 * @param Object configuration
 * @param string notificationId
 * @param string channelType
 * @param Array messageTypes
 */

var RegistrarConnector = function (_EventEmitter) {
  (0, _inherits3.default)(RegistrarConnector, _EventEmitter);

  function RegistrarConnector(context, transport, config, channelType) {
    (0, _classCallCheck3.default)(this, RegistrarConnector);

    var _this = (0, _possibleConstructorReturn3.default)(this, (RegistrarConnector.__proto__ || (0, _getPrototypeOf2.default)(RegistrarConnector)).call(this));

    var fsm = _javascriptStateMachine2.default.create({
      initial: { state: 'unregistered', event: 'init', defer: true },
      events: [{ name: 'userUpdate', from: ['unregistered'], to: 'registering' }, { name: 'userUpdate', from: ['registered'], to: 'unregistering' }, { name: 'registered', from: ['registering', 'retrying'], to: 'registered' }, { name: 'unregistered', from: ['unregistering'], to: 'unregistered' }, { name: 'retry', from: ['retrying'], to: 'retrying' }, { name: 'failure', from: ['registering'], to: 'retrying' }, { name: 'failure', from: ['retrying'], to: 'retrying' }, { name: 'failure', from: ['unregistering'], to: 'unregistered' }],
      callbacks: {
        onregistering: function onregistering(event, from, to, arg) {
          return _this._register(arg);
        },
        onunregistering: function onunregistering() {
          return _this._unregister();
        },
        onregistered: function onregistered() {
          return _this._onRegistered();
        },
        onunregistered: function onunregistered() {
          return _this._onUnregistered();
        },
        onretrying: function onretrying(event, from, to, arg) {
          return _this._initRetry(arg);
        },
        onfailure: function onfailure(event, from, to, arg) {
          if (from === 'retrying') {
            _this._initRetry(arg);
          }
        }
      }
    });

    var backoff = _backoff2.default.exponential({
      randomisationFactor: 0.2,
      initialDelay: 2 * 1000,
      maxDelay: 2 * 60 * 1000
    });

    backoff.on('ready', function () {
      _this._retry();
    });

    (0, _defineProperties2.default)(_this, {
      _transport: { value: transport },
      _context: { value: context },
      _url: { value: config.registrarUri, writable: false },
      _config: { value: config },
      _fsm: { value: fsm },
      _backoff: { value: backoff },
      _channelType: { value: channelType },
      _registrationId: { value: false, writable: true },
      _notificationId: { value: false, writable: true },
      _messageTypes: { value: new _set3.default(), writable: true },
      _pendingUpdate: { value: null, writable: true }
    });

    fsm.init();
    return _this;
  }

  (0, _createClass3.default)(RegistrarConnector, [{
    key: 'setNotificationId',
    value: function setNotificationId(notificationId) {
      if (this._notificationId === notificationId) {
        return;
      }

      this._notificationId = notificationId;
      this._updateRegistration();
    }
  }, {
    key: 'updateToken',
    value: function updateToken() {
      return this._updateRegistration();
    }
  }, {
    key: 'has',
    value: function has(messageType) {
      return this._messageTypes.has(messageType);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(messageType) {
      if (this._messageTypes.has(messageType)) {
        _logger2.default.debug('Message type already registered ', messageType);
        return false;
      }

      this._messageTypes.add(messageType);
      this._updateRegistration();
      return true;
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType) {
      if (!this._messageTypes.has(messageType)) {
        return false;
      }

      this._messageTypes.delete(messageType);

      if (this._messageTypes.size > 0) {
        this._updateRegistration();
      } else {
        this._removeRegistration();
      }
      return true;
    }
  }, {
    key: '_updateRegistration',
    value: function _updateRegistration() {
      if (this._notificationId) {
        this._update(this._notificationId, toArray(this._messageTypes));
      }
    }
  }, {
    key: '_removeRegistration',
    value: function _removeRegistration() {
      if (this._notificationId) {
        this._update(this._notificationId, toArray(this._messageTypes));
      }
    }

    /**
     * Update service registration
     * @param {Array} messageTypes Array of message type names
     * @private
     */

  }, {
    key: '_update',
    value: function _update(notificationId, messageTypes) {
      var regData = { notificationId: notificationId, messageTypes: messageTypes };

      if (this._fsm.is('unregistered')) {
        if (regData.notificationId && regData.messageTypes.length > 0) {
          this._fsm.userUpdate(regData);
        }
      } else if (this._fsm.is('registered')) {
        this._fsm.userUpdate(regData);
        this._setPendingUpdate(regData);
      } else {
        this._setPendingUpdate(regData);
      }
    }
  }, {
    key: '_setPendingUpdate',
    value: function _setPendingUpdate(regData) {
      this._pendingUpdate = regData;
    }
  }, {
    key: '_checkPendingUpdate',
    value: function _checkPendingUpdate() {
      if (!this._pendingUpdate) {
        return;
      }

      var pendingUpdate = this._pendingUpdate;
      this._pendingUpdate = null;

      this._updateRegistration(pendingUpdate.notificationId, pendingUpdate.messageTypes);
    }
  }, {
    key: '_initRetry',
    value: function _initRetry(regData) {
      if (!this._pendingUpdate) {
        this._setPendingUpdate(regData);
      }

      this._backoff.backoff();
    }
  }, {
    key: '_retry',
    value: function _retry() {
      if (!this._pendingUpdate) {
        return;
      }

      var pendingUpdate = this._pendingUpdate;
      this._pendingUpdate = null;

      this._register(pendingUpdate);
    }
  }, {
    key: '_onRegistered',
    value: function _onRegistered() {
      this._backoff.reset();
      this.emit('stateChanged', 'registered');
      this._checkPendingUpdate();
    }
  }, {
    key: '_onUnregistered',
    value: function _onUnregistered() {
      this._backoff.reset();
      this.emit('stateChanged', 'unregistered');
      this._checkPendingUpdate();
    }
  }, {
    key: '_register',
    value: function _register(regData) {
      var _this2 = this;

      /* eslint-disable camelcase */
      var registrarRequest = {
        endpoint_platform: this._context.platform,
        channel_type: this._channelType,
        version: '2',
        message_types: regData.messageTypes,
        data: {},
        ttl: 'PT24H'
      };

      if (this._channelType === 'twilsock') {
        registrarRequest.data.url = regData.notificationId;
      } else {
        registrarRequest.data.registration_id = regData.notificationId;
      }

      var uri = this._url + '?productId=' + this._context.productId;
      var headers = {
        'Content-Type': 'application/json',
        'X-Twilio-Token': this._config.token
      };
      /* eslint-enable camelcase */

      _logger2.default.trace('Creating registration for channel ', this._channelType);
      return this._transport.post(uri, headers, registrarRequest).then(function (response) {
        _this2._registrationId = response.body.id;
        _this2._registrationData = regData;

        _logger2.default.debug('Registration created: ', response);
        _this2._fsm.registered();
      }).catch(function (error) {
        _logger2.default.error('Registration failed: ', error);
        _this2._fsm.failure(regData);
        return error;
      });
    }
  }, {
    key: '_unregister',
    value: function _unregister() {
      var _this3 = this;

      if (!this._registrationId) {
        return _promise2.default.resolve();
      }

      var uri = this._url + '/' + this._registrationId + '?productId=' + this._context.productId;
      var headers = {
        'Content-Type': 'application/json',
        'X-Twilio-Token': this._config.token
      };

      _logger2.default.trace('Removing registration for ', this._channelType);
      return this._transport.delete(uri, headers).then(function () {
        _logger2.default.debug('Registration removed for ', _this3._channelType);
        _this3._registrationId = false;
        _this3._fsm.unregistered();
      }).catch(function (reason) {
        // failure to remove registration since being treated as "unregistered" state
        // because it is indicates that something wrong with server/connection
        _logger2.default.error('Failed to remove of registration ', _this3.channelType, reason);
        _this3._fsm.failure();
        return reason;
      });
    }
  }]);
  return RegistrarConnector;
}(_events2.default);

exports.default = RegistrarConnector;

(0, _freeze2.default)(RegistrarConnector);
module.exports = exports['default'];

},{"./logger":198,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/core-js/set":39,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"backoff":49,"events":186,"javascript-state-machine":187}],200:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

var _registrar = _dereq_('./registrar.connector');

var _registrar2 = _interopRequireDefault(_registrar);

var _twilsock = _dereq_('./twilsock.connector');

var _twilsock2 = _interopRequireDefault(_twilsock);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Creates the new instance of ERS registrar client
 *
 * @class Registrar
 * @classdesc Provides an interface to the ERS registrar
 */
var Registrar = function (_EventEmitter) {
  (0, _inherits3.default)(Registrar, _EventEmitter);

  function Registrar(productId, transport, twilsock, config) {
    (0, _classCallCheck3.default)(this, Registrar);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Registrar.__proto__ || (0, _getPrototypeOf2.default)(Registrar)).call(this));

    (0, _defineProperties2.default)(_this, {
      _conf: { value: config },
      _connectors: { value: new _map2.default() }
    });

    var platform = (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'web').substring(0, 128);

    _this._connectors.set('twilsock', new _twilsock2.default({ productId: productId, platform: platform }, twilsock, config));
    _this._connectors.set('gcm', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'gcm'));
    _this._connectors.set('fcm', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'fcm'));
    _this._connectors.set('apn', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'apn'));

    _this._connectors.get('twilsock').on('transportReady', function (state) {
      return _this.emit('transportReady', state);
    });

    return _this;
  }

  /**
   *  Sets notification ID.
   *  If new URI is different from previous, it triggers updating of registration for given channel
   *
   *  @param {string} channelType channel type (apn|gcm|fcm|twilsock)
   *  @param {string} notificationId The notification ID
   */

  (0, _createClass3.default)(Registrar, [{
    key: 'setNotificationId',
    value: function setNotificationId(channelType, notificationId) {
      this._connector(channelType).setNotificationId(notificationId);
    }

    /**
     * Checks if subscription for given message and channel already exists
     */

  }, {
    key: 'hasSubscription',
    value: function hasSubscription(messageType, channelType) {
      this._connector(channelType).has(messageType);
    }

    /**
     * Subscribe for given type of message
     *
     * @param {String} messageType Message type identifier
     * @param {String} channelType Channel type, can be 'twilsock', 'gcm' or 'fcm'
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType, channelType) {
      this._connector(channelType).subscribe(messageType);
    }

    /**
     * Remove subscription
     * @param {String} messageType Message type
     * @param {String} channelType Channel type (twilsock or gcm/fcm)
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType, channelType) {
      this._connector(channelType).unsubscribe(messageType);
    }
  }, {
    key: 'updateToken',
    value: function updateToken() {
      this._connectors.forEach(function (connector) {
        return connector.updateToken();
      });
    }

    /**
     * @param {String} type Channel type
     * @throws {Error} Error with description
     * @private
     */

  }, {
    key: '_connector',
    value: function _connector(type) {
      var connector = this._connectors.get(type);
      if (!connector) {
        throw new Error('Unknown channel type: ' + type);
      }
      return connector;
    }
  }]);
  return Registrar;
}(_events2.default);

exports.default = Registrar;

(0, _freeze2.default)(Registrar);
module.exports = exports['default'];

},{"./registrar.connector":199,"./twilsock.connector":201,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],201:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _set2 = _dereq_('babel-runtime/core-js/set');

var _set3 = _interopRequireDefault(_set2);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _uuid = _dereq_('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var DEFAULT_TTL = 60 * 60 * 48;

function toArray(_set) {
  var arr = [];
  _set.forEach(function (v) {
    return arr.push(v);
  });
  return arr;
}

/**
 * @class
 * @classdesc Registrar connector implementation for twilsock
 *
 * @constructor
 */

var TwilsockConnector = function (_EventEmitter) {
  (0, _inherits3.default)(TwilsockConnector, _EventEmitter);

  function TwilsockConnector(context, twilsock, config) {
    (0, _classCallCheck3.default)(this, TwilsockConnector);

    var _this = (0, _possibleConstructorReturn3.default)(this, (TwilsockConnector.__proto__ || (0, _getPrototypeOf2.default)(TwilsockConnector)).call(this));

    context.id = _uuid2.default.v4();

    (0, _defineProperties2.default)(_this, {
      _twilsock: { value: twilsock },
      _messageTypes: { value: new _set3.default() },

      config: { value: config },
      context: { value: context }
    });

    twilsock.on('stateChanged', function (state) {
      if (state !== 'connected') {
        _this.emit('transportReady', false);
      }
    });

    twilsock.on('registered', function (id) {
      if (context && id === context.id && twilsock.state === 'connected') {
        _this.emit('transportReady', true);
      }
    });
    return _this;
  }

  /**
   * @public
   */

  (0, _createClass3.default)(TwilsockConnector, [{
    key: 'setNotificationId',
    value: function setNotificationId() {
      return false;
    }

    /**
     * @public
     */

  }, {
    key: 'updateToken',
    value: function updateToken() {
      this._twilsock.removeNotificationsContext(this.context.id);
      this.context.id = _uuid2.default.v4();
      this._updateContext();
    }

    /**
     * @public
     */

  }, {
    key: 'has',
    value: function has(messageType) {
      return this._messageTypes.has(messageType);
    }

    /**
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType) {
      if (this._messageTypes.has(messageType)) {
        _logger2.default.trace('Message type already registered ', messageType);
        return false;
      }

      this._messageTypes.add(messageType);
      this._updateContext();
      return true;
    }

    /**
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType) {
      if (!this._messageTypes.has(messageType)) {
        return false;
      }

      this._messageTypes.delete(messageType);

      if (this._messageTypes.size > 0) {
        this._updateContext();
      } else {
        this._twilsock.removeNotificationsContext(this.context.id);
      }

      return true;
    }

    /**
     * @private
     */

  }, {
    key: '_updateContext',
    value: function _updateContext() {
      var messageTypes = toArray(this._messageTypes);

      /* eslint-disable camelcase */
      var context = {
        product_id: this.context.productId,
        notification_protocol_version: 4,
        endpoint_platform: this.context.platform,
        ttl: DEFAULT_TTL,
        token: this.config.token,
        message_types: messageTypes
      };
      /* eslint-enable camelcase */

      this.emit('transportReady', false);
      this._twilsock.setNotificationsContext(this.context.id, context);
    }
  }]);
  return TwilsockConnector;
}(_events2.default);

exports.default = TwilsockConnector;

(0, _freeze2.default)(TwilsockConnector);
module.exports = exports['default'];

},{"./logger":198,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/set":39,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186,"uuid":234}],202:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _map = _dereq_("babel-runtime/core-js/map");

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Cache = function () {
  function Cache() {
    (0, _classCallCheck3.default)(this, Cache);

    (0, _defineProperties2.default)(this, {
      _items: { value: new _map2.default() }
    });
  }

  (0, _createClass3.default)(Cache, [{
    key: "store",
    value: function store(key, value) {
      /*
      let cachedEntity = _items.get(key);
      if (!cachedEntity || cachedEntity) {
        _items.insert(key, value);
        return value;
      }
      */
      return value;
    }
  }, {
    key: "get",
    value: function get(key) {
      return this._items.get(key) || null;
    }
  }]);
  return Cache;
}();

exports.default = Cache;
module.exports = exports["default"];
},{"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],203:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = _dereq_('events');

var _twilsock = _dereq_('twilsock');

var _twilsock2 = _interopRequireDefault(_twilsock);

var _twilioTransport = _dereq_('twilio-transport');

var _twilioTransport2 = _interopRequireDefault(_twilioTransport);

var _twilioNotifications = _dereq_('twilio-notifications');

var _twilioNotifications2 = _interopRequireDefault(_twilioNotifications);

var _utils = _dereq_('./utils');

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _configuration = _dereq_('./configuration');

var _configuration2 = _interopRequireDefault(_configuration);

var _subscriptions = _dereq_('./subscriptions');

var _subscriptions2 = _interopRequireDefault(_subscriptions);

var _router = _dereq_('./router');

var _router2 = _interopRequireDefault(_router);

var _network = _dereq_('./network');

var _network2 = _interopRequireDefault(_network);

var _syncdocument = _dereq_('./syncdocument');

var _syncdocument2 = _interopRequireDefault(_syncdocument);

var _synclist = _dereq_('./synclist');

var _synclist2 = _interopRequireDefault(_synclist);

var _syncmap = _dereq_('./syncmap');

var _syncmap2 = _interopRequireDefault(_syncmap);

var _clientInfo = _dereq_('./clientInfo');

var _clientInfo2 = _interopRequireDefault(_clientInfo);

var _entitiesCache = _dereq_('./entitiesCache');

var _entitiesCache2 = _interopRequireDefault(_entitiesCache);

var _syncerror = _dereq_('./syncerror');

var _syncerror2 = _interopRequireDefault(_syncerror);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SYNC_PRODUCT_ID = 'data_sync';
var SDK_VERSION = _dereq_('../package.json').version;

function subscribe(subscribable) {
  subscribable._subscribe();
  return subscribable;
}

function prepareCreatePayload(name, purpose, context, data) {
  return {
    unique_name: name, // eslint-disable-line camelcase
    purpose: purpose,
    context: context,
    data: data };
}

function decompose(arg) {
  if (!arg) {
    return { id: null };
  }

  if (typeof arg === 'string') {
    return { id: arg };
  }
  return { id: arg.uniqueName || arg.sid || arg.id,
    purpose: arg.purpose,
    data: arg.data,
    context: arg.context,
    mode: arg.mode
  };
}

/**
 * @class Client
 * @classdesc
 * Client for the Twilio Sync service
 *
 * @property {Client#connectionState} connectionState - Connection state info
 */

var Client = function (_EventEmitter) {
  (0, _inherits3.default)(Client, _EventEmitter);

  /*
   * @constructor
   * @param {string} Token Twilio access token
   * @param {Client#ClientOptions} options - Options to customize the Client
   */
  function Client(token, options) {
    (0, _classCallCheck3.default)(this, Client);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Client.__proto__ || (0, _getPrototypeOf2.default)(Client)).call(this));

    options = options || {};

    if (!token) {
      throw new Error('Sync library needs a valid Twilio token to be passed');
    }

    if (options.hasOwnProperty('logLevel')) {
      _logger2.default.setLevel(options.logLevel);
    }

    options.productId = options.productId || SYNC_PRODUCT_ID;
    var productId = options.productId;

    options.twilsockClient = options.twilsockClient || new _twilsock2.default(token, options);
    options.transport = options.transport || new _twilioTransport2.default(options.twilsockClient);
    options.notificationsClient = options.notificationsClient || new _twilioNotifications2.default(token, options);

    var transport = options.transport;
    var notifications = options.notificationsClient;

    var config = new _configuration2.default(token, options);
    var network = new _network2.default(productId, new _clientInfo2.default(SDK_VERSION), config, transport);
    var subscriptions = new _subscriptions2.default(config, network);
    var router = new _router2.default({ config: config, subscriptions: subscriptions, notifications: notifications });

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _twilsock: { value: options.twilsockClient },
      _notifications: { value: notifications },
      _network: { value: network },
      _router: { value: router },
      _subscriptions: { value: subscriptions },
      _entities: { value: new _entitiesCache2.default() },
      _dependencies: { get: function get() {
          return {
            config: _this._config,
            datasync: _this,
            network: _this._network,
            router: _this._router
          };
        }
      },

      connectionState: { get: function get() {
          return _this._notifications.connectionState;
        }, enumerable: true }
    });

    notifications.on('connectionStateChanged', function () {
      _this.emit('connectionStateChanged', _this._notifications.connectionState);
    });
    return _this;
  }

  (0, _createClass3.default)(Client, [{
    key: '_get',
    value: function _get(baseUri, id) {
      if (!id) {
        return _promise2.default.resolve(null);
      }
      var uri = new _utils.UriBuilder(baseUri).arg('Deep', true).arg('Id', id).build();
      return this._network.get(uri).then(function (response) {
        return response.body;
      }).then(function (body) {
        return body.documents || body.lists || body.maps || [];
      }).then(function (objects) {
        return objects.length === 0 ? null : objects[0];
      });
    }
  }, {
    key: '_createDocument',
    value: function _createDocument(id, purpose, data) {
      var payload = prepareCreatePayload(id, purpose, null, data);
      return this._network.post(this._config.documentsUri, payload).then(function (response) {
        return response.body;
      });
    }
  }, {
    key: '_getDocument',
    value: function _getDocument(id) {
      return this._get(this._config.documentsUri, id);
    }
  }, {
    key: '_createList',
    value: function _createList(id, purpose, context) {
      var payload = prepareCreatePayload(id, purpose, context);
      return this._network.post(this._config.listsUri, payload).then(function (response) {
        return response.body;
      });
    }
  }, {
    key: '_getList',
    value: function _getList(id) {
      return this._get(this._config.listsUri, id);
    }
  }, {
    key: '_createMap',
    value: function _createMap(id, purpose, context) {
      var payload = prepareCreatePayload(id, purpose, context);
      return this._network.post(this._config.mapsUri, payload).then(function (response) {
        return response.body;
      });
    }
  }, {
    key: '_getMap',
    value: function _getMap(id) {
      return this._get(this._config.mapsUri, id);
    }
  }, {
    key: '_getCached',
    value: function _getCached(id, type) {
      var cached = this._entities.get(id, type);
      return cached ? _promise2.default.resolve(cached._subscribe()) : null;
    }
  }, {
    key: '_removeFromCache',
    value: function _removeFromCache(sid) {
      this._entities.remove(sid);
    }

    /**
     * Open a SyncDocument by identifier, or create one if none exists
     * @param {string} id Document identifier. Unique name or sid.
     * @return {Promise<Document>}
     * @public
     */

  }, {
    key: 'document',
    value: function document(arg) {
      var _this2 = this;

      var _decompose = decompose(arg),
          id = _decompose.id,
          purpose = _decompose.purpose,
          data = _decompose.data,
          mode = _decompose.mode;

      return this._getCached(id, 'document') || this._getDocument(id).then(function (body) {
        if (body) {
          return body;
        } else if (mode !== 'open') {
          return _this2._createDocument(id, purpose, data);
        }
        throw new _syncerror2.default('Not found', 404);
      }).then(function (body) {
        return new _syncdocument2.default(_this2._dependencies, body, function (sid) {
          return _this2._removeFromCache(sid);
        });
      }).then(function (entity) {
        return _this2._entities.store(entity);
      }).then(subscribe);
    }

    /**
     * Open a Map by identifier, or create one if none exists
     * @param {string} id Map identifier. Unique name or sid.
     * @return {Promise<Map>}
     * @public
     */

  }, {
    key: 'map',
    value: function map(arg) {
      var _this3 = this;

      var _decompose2 = decompose(arg),
          id = _decompose2.id,
          purpose = _decompose2.purpose,
          context = _decompose2.context,
          mode = _decompose2.mode;

      return this._getCached(id, 'map') || this._getMap(id).then(function (body) {
        if (body) {
          return body;
        } else if (mode !== 'open') {
          return _this3._createMap(id, purpose, context);
        }
        throw new _syncerror2.default('Not found', 404);
      }).then(function (body) {
        return new _syncmap2.default(_this3._dependencies, body, function (sid) {
          return _this3._removeFromCache(sid);
        });
      }).then(function (entity) {
        return _this3._entities.store(entity);
      }).then(subscribe);
    }

    /**
     * Open a List by identifier, or create one if none exists
     * @param {string} id List identifier. Unique name or sid.
     * @return {Promise<List>}
     * @public
     */

  }, {
    key: 'list',
    value: function list(arg) {
      var _this4 = this;

      var _decompose3 = decompose(arg),
          id = _decompose3.id,
          purpose = _decompose3.purpose,
          context = _decompose3.context,
          mode = _decompose3.mode;

      return this._getCached(id, 'list') || this._getList(id).then(function (body) {
        if (body) {
          return body;
        } else if (mode !== 'open') {
          return _this4._createList(id, purpose, context);
        }
        throw new _syncerror2.default('Not found', 404);
      }).then(function (body) {
        return new _synclist2.default(_this4._dependencies, body, function (sid) {
          return _this4._removeFromCache(sid);
        });
      }).then(function (entity) {
        return _this4._entities.store(entity);
      }).then(subscribe);
    }

    /**
     * Gracefully shutdown the libray
     * Currently it is not properly implemented and being used only in tests
     * But should be made a part of public API
     * @private
     */

  }, {
    key: 'shutdown',
    value: function shutdown() {
      var _this5 = this;

      return this._subscriptions.shutdown().then(function () {
        return _this5._twilsock.disconnect();
      }).then(function () {});
    }

    /**
     * Set new auth token
     * @param {string} token New token to set
     * @return {Promise}
     * @public
     */

  }, {
    key: 'updateToken',
    value: function updateToken(token) {
      return _promise2.default.all([this._config.updateToken(token), this._notifications.updateToken(token), this._twilsock.updateToken(token)]).then(function () {});
    }
  }]);
  return Client;
}(_events.EventEmitter);

/**
 * Current version of Sync client.
 * @name Client#version
 * @type String
 * @readonly
 */


(0, _defineProperties2.default)(Client, {
  version: {
    enumerable: true,
    value: SDK_VERSION
  }
});

/**
 * Service connection state
 * @alias Client#connectionState
 * @readonly
 * @enum {String}
 */
Client.connectionState = {
  /** Client is offline and no connection attempt in process. */
  DISCONNECTED: 'disconnected',
  /** Client is offline and connection attempt is in process. */
  CONNECTING: 'connecting',
  /** Client is online and ready. */
  CONNECTED: 'connected',
  /** Client connection is in the erroneous state. */
  ERROR: 'error',
  /** Client connection is denied because of invalid token */
  DENIED: 'denied'
};
(0, _freeze2.default)(Client.connectionState);

exports.default = Client;

/**
 * These options can be passed to Client constructor
 * @typedef {Object} Client#ClientOptions
 * @property {String} [logLevel='error'] - The level of logging to enable. Valid options
 *   (from strictest to broadest): ['silent', 'error', 'warn', 'info', 'debug', 'trace']
 */

/**
 * Fired when connection state has been changed.
 * @param {Client#connectionState} ConnectionState
 * @event Client#connectionStateChanged
 */

module.exports = exports['default'];
},{"../package.json":222,"./clientInfo":204,"./configuration":205,"./entitiesCache":206,"./logger":210,"./network":212,"./router":215,"./subscriptions":216,"./syncdocument":217,"./syncerror":218,"./synclist":219,"./syncmap":220,"./utils":221,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186,"twilio-notifications":197,"twilio-transport":224,"twilsock":227}],204:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ClientInfo;

var _platform = _dereq_('platform');

var _platform2 = _interopRequireDefault(_platform);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ClientInfo(version) {
  return {
    sdk: 'js',
    sdkVer: version,
    os: _platform2.default.os.family,
    osVer: _platform2.default.os.version,
    pl: _platform2.default.name,
    plVer: _platform2.default.version
  };
}
module.exports = exports['default'];
},{"platform":189}],205:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CDS_URI = 'https://cds.twilio.com';
var SUBSCRIPTIONS_PATH = '/v3/Subscriptions';
var MAPS_PATH = '/v3/Maps';
var LISTS_PATH = '/v3/Lists';
var DOCUMENTS_PATH = '/v3/Documents';

/**
 * @param {String} token - authentication token
 *
 * @class Configuration
 * @classdesc Settings container for the DataSync library
 */

var Configuration = function () {
  function Configuration(token, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, Configuration);

    options = (options || {}).DataSync || {};
    var baseUri = options.cdsUri || CDS_URI;

    var settings = {
      subscriptionsUri: baseUri + SUBSCRIPTIONS_PATH,
      documentsUri: baseUri + DOCUMENTS_PATH,
      listsUri: baseUri + LISTS_PATH,
      mapsUri: baseUri + MAPS_PATH
    };

    (0, _defineProperties2.default)(this, {
      _token: { value: token, writable: true },

      token: { enumerable: true, get: function get() {
          return _this._token;
        } },
      subscriptionsUri: { enumerable: true, get: function get() {
          return settings.subscriptionsUri;
        } },
      documentsUri: { enumerable: true, get: function get() {
          return settings.documentsUri;
        } },
      listsUri: { enumerable: true, get: function get() {
          return settings.listsUri;
        } },
      mapsUri: { enumerable: true, get: function get() {
          return settings.mapsUri;
        } }
    });
  }

  (0, _createClass3.default)(Configuration, [{
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
    }
  }]);
  return Configuration;
}();

exports.default = Configuration;
module.exports = exports['default'];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],206:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Container for entities which are known by the client
 * It's needed for deduplication when client obtain the same object several times
 */
var EntitiesCache = function () {
  function EntitiesCache() {
    (0, _classCallCheck3.default)(this, EntitiesCache);

    (0, _defineProperties2.default)(this, {
      _names: { value: new _map2.default() },
      _entities: { value: new _map2.default() }
    });
  }

  (0, _createClass3.default)(EntitiesCache, [{
    key: 'store',
    value: function store(entity) {
      var stored = this._entities.get(entity.sid);
      if (stored) {
        return stored;
      }

      this._entities.set(entity.sid, entity);
      if (entity.uniqueName) {
        this._names.set(entity.type + '::' + entity.uniqueName, entity.sid);
      }
      return entity;
    }
  }, {
    key: 'get',
    value: function get(id, type) {
      return this._entities.get(id) || this._getResolved(id, type) || null;
    }
  }, {
    key: 'remove',
    value: function remove(sid) {
      var cached = this._entities.get(sid);
      if (cached) {
        this._entities.delete(sid);
        if (cached.uniqueName) {
          this._names.delete(cached.type + '::' + cached.uniqueName);
        }
      }
    }
  }, {
    key: '_getResolved',
    value: function _getResolved(id, type) {
      var resolvedSid = this._names.get(type + '::' + id);
      return resolvedSid ? this._entities.get(resolvedSid) : null;
    }
  }]);
  return EntitiesCache;
}();

exports.default = EntitiesCache;
module.exports = exports['default'];
},{"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],207:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Entity = function (_EventEmitter) {
  (0, _inherits3.default)(Entity, _EventEmitter);

  function Entity(deps) {
    (0, _classCallCheck3.default)(this, Entity);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Entity.__proto__ || (0, _getPrototypeOf2.default)(Entity)).call(this));

    (0, _defineProperties2.default)(_this, {
      _deps: { value: deps }
    });
    return _this;
  }

  /**
   * Subscribe to changes of data entity
   * @private
   */


  (0, _createClass3.default)(Entity, [{
    key: '_subscribe',
    value: function _subscribe() {
      this._deps.router.subscribe(this.sid, this);
      return this;
    }

    /**
     * Unsubscribe from changes of current data entity
     * @private
     */

  }, {
    key: '_unsubscribe',
    value: function _unsubscribe() {
      this._deps.router.unsubscribe(this.sid, this);
      return this;
    }

    /**
     * @public
     */

  }, {
    key: 'close',
    value: function close() {
      this._unsubscribe();
    }
  }]);
  return Entity;
}(_events2.default);

exports.default = Entity;
module.exports = exports['default'];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186}],208:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = _dereq_('./client');

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _client2.default;
module.exports = exports['default'];
},{"./client":203}],209:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class
 * @classdesc List item
 * Represents a data for each element in a collection
 * @alias ListItem
 * @property {Number} index  - identifier of an item
 * @property {Object} value - value of an item
 */
var ListItem = function () {
  /**
   * @private
   * @constructor
   * @param {Object} data Item descriptor
   * @param {Number} data.index Item identifier
   * @param {String} data.uri Item URI
   * @param {Object} data.value Item data
   */
  function ListItem(data) {
    var _this = this;

    (0, _classCallCheck3.default)(this, ListItem);

    (0, _defineProperties2.default)(this, {
      _data: { value: data },
      _index: { value: data.index, writable: false },
      _uri: { value: data.uri, writable: false },
      _value: { value: data.value, writable: true },
      _revision: { value: data.revision, writable: true },
      _lastEventId: { value: data.eventId, writable: true },

      index: { enumerable: true,
        get: function get() {
          return _this._index;
        } },
      value: { enumerable: true,
        get: function get() {
          return _this._value;
        } }
    });
  }

  /**
   * Update item data
   * @param {Number} EventId Update event id
   * @param {String} Revision Updated item revision
   * @param {Object} Value Updated item data
   * @private
   */


  (0, _createClass3.default)(ListItem, [{
    key: "_update",
    value: function _update(eventId, revision, value) {
      this._lastEventId = eventId;
      this._revision = revision;
      this._value = value;
      return this;
    }
  }]);
  return ListItem;
}();

exports.default = ListItem;
module.exports = exports["default"];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],210:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _from = _dereq_('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _loglevel = _dereq_('loglevel');

var _loglevel2 = _interopRequireDefault(_loglevel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function prepareLine(prefix, args) {
  return [prefix].concat((0, _from2.default)(args));
}

exports.default = {
  setLevel: function setLevel(level) {
    _loglevel2.default.setLevel(level);
  },

  trace: function trace() {
    _loglevel2.default.trace.apply(null, prepareLine('Sync T:', arguments));
  },
  debug: function debug() {
    _loglevel2.default.debug.apply(null, prepareLine('Sync D:', arguments));
  },
  info: function info() {
    _loglevel2.default.info.apply(null, prepareLine('Sync I:', arguments));
  },
  warn: function warn() {
    _loglevel2.default.warn.apply(null, prepareLine('Sync W:', arguments));
  },
  error: function error() {
    _loglevel2.default.error.apply(null, prepareLine('Sync E:', arguments));
  }
};
module.exports = exports['default'];
},{"babel-runtime/core-js/array/from":24,"loglevel":188}],211:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class
 * @classdesc Map item
 * Represents a data for each element in a collection
 * @alias MapItem
 * @property {String} key  - identifier of an item
 * @property {Object} value - value of an item
 */
var MapItem = function () {
  /**
   * @private
   * @constructor
   * @param {Object} data Item descriptor
   * @param {String} data.key Item identifier
   * @param {String} data.uri Item URI
   * @param {Object} data.value Item data
   */
  function MapItem(data) {
    var _this = this;

    (0, _classCallCheck3.default)(this, MapItem);

    (0, _defineProperties2.default)(this, {
      _data: { value: data },
      _key: { value: data.key, writable: false },
      _uri: { value: data.uri, writable: false },
      _value: { value: data.value, writable: true },
      _revision: { value: data.revision, writable: true },
      _lastEventId: { value: data.eventId, writable: true },

      key: { enumerable: true,
        get: function get() {
          return _this._key;
        } },
      value: { enumerable: true,
        get: function get() {
          return _this._value;
        } }
    });
  }

  /**
   * Update item data
   * @param {Number} EventId Update event id
   * @param {String} Revision Updated item revision
   * @param {Object} Value Updated item data
   * @private
   */


  (0, _createClass3.default)(MapItem, [{
    key: "_update",
    value: function _update(eventId, revision, value) {
      this._lastEventId = eventId;
      this._revision = revision;
      this._value = value;
      return this;
    }
  }]);
  return MapItem;
}();

exports.default = MapItem;
module.exports = exports["default"];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],212:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _uuid = _dereq_('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class Network
 * @classdesc Separates network operations to make it possible to add some optimization/caching strategies
 */
var Network = function () {
  function Network(productId, clientInfo, config, transport) {
    (0, _classCallCheck3.default)(this, Network);

    (0, _defineProperties2.default)(this, {
      _config: { value: config },
      _transport: { value: transport },
      _generateHeaders: { value: function value() {
          return {
            'Content-Type': 'application/json',
            'Twilio-Sync-Client-Info': (0, _stringify2.default)(clientInfo),
            'Twilio-Request-Id': 'RQ' + _uuid2.default.v4().replace(/-/g, ''),
            'X-Twilio-Product-Id': productId,
            'X-Twilio-Token': this._config.token
          };
        } }
    });
  }

  /**
   * Make a GET request by given URI
   * @Returns Promise<Response> Result of successful get request
   */


  (0, _createClass3.default)(Network, [{
    key: 'get',
    value: function get(uri) {
      var headers = this._generateHeaders();
      _logger2.default.debug('GET', uri, 'ID:', headers['Twilio-Request-Id']);
      return this._transport.get(uri, headers);
    }
  }, {
    key: 'post',
    value: function post(uri, body, revision) {
      var headers = this._generateHeaders();
      if (typeof revision !== 'undefined') {
        headers['If-Match'] = revision;
      }

      _logger2.default.debug('POST', uri, 'ID:', headers['Twilio-Request-Id']);
      return this._transport.post(uri, headers, body);
    }
  }, {
    key: 'put',
    value: function put(uri, body, revision) {
      var headers = this._generateHeaders();
      if (typeof revision !== 'undefined') {
        headers['If-Match'] = revision;
      }

      _logger2.default.debug('PUT', uri, 'ID:', headers['Twilio-Request-Id']);
      return this._transport.put(uri, headers, body);
    }
  }, {
    key: 'delete',
    value: function _delete(uri) {
      var headers = this._generateHeaders();
      _logger2.default.debug('DELETE', uri, 'ID:', headers['Twilio-Request-Id']);
      return this._transport.delete(uri, headers);
    }
  }]);
  return Network;
}();

exports.default = Network;


(0, _freeze2.default)(Network);
module.exports = exports['default'];
},{"./logger":210,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"uuid":234}],213:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class Paginator
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage Indicates the existence of next page
 * @property {boolean} hasPrevPage Indicates the existence of previous page
 */
var Paginator = function () {
  /*
  * @constructor
  * @param {Array} items Array of element for current page
  * @param {Object} params
  * @private
  */
  function Paginator(items, source, prevToken, nextToken) {
    (0, _classCallCheck3.default)(this, Paginator);

    (0, _defineProperties2.default)(this, {
      prevToken: { value: prevToken },
      nextToken: { value: nextToken },
      source: { value: source },
      hasNextPage: { value: !!nextToken, enumerable: true },
      hasPrevPage: { value: !!prevToken, enumerable: true },
      items: { get: function get() {
          return items;
        }, enumerable: true }
    });
  }

  /**
   * Request next page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */


  (0, _createClass3.default)(Paginator, [{
    key: 'nextPage',
    value: function nextPage() {
      return this.hasNextPage ? this.source(this.nextToken) : _promise2.default.reject(new Error('No next page'));
    }

    /**
     * Request previous page.
     * Does not modify existing object
     * @return {Promise<Paginator>}
     */

  }, {
    key: 'prevPage',
    value: function prevPage() {
      return this.hasPrevPage ? this.source(this.prevToken) : _promise2.default.reject(new Error('No previous page'));
    }
  }]);
  return Paginator;
}();

exports.default = Paginator;
module.exports = exports['default'];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],214:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_("babel-runtime/core-js/object/freeze");

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RetryingQueue = function () {
  function RetryingQueue() {
    (0, _classCallCheck3.default)(this, RetryingQueue);

    (0, _defineProperties2.default)(this, {
      _queue: { value: [] },
      _isActive: { value: false, writable: true }
    });
  }

  (0, _createClass3.default)(RetryingQueue, [{
    key: "_wakeupQueue",
    value: function _wakeupQueue() {
      var _this = this;

      if (!this._isActive && this._queue.length > 0) {
        this._isActive = true;
        setTimeout(function () {
          return _this._executeTask(_this._queue[0]);
        }, 0);
      }
    }
  }, {
    key: "_pickNext",
    value: function _pickNext() {
      var _this2 = this;

      this._queue.shift();

      if (this._queue.length === 0) {
        this._isActive = false;
        return;
      }

      setTimeout(function () {
        return _this2._executeTask(_this2._queue[0]);
      }, 0);
    }
  }, {
    key: "_pickSame",
    value: function _pickSame(arg) {
      var _this3 = this;

      this._queue[0].arg = arg;
      setTimeout(function () {
        return _this3._executeTask(_this3._queue[0]);
      }, 0);
    }
  }, {
    key: "_executeTask",
    value: function _executeTask(task) {
      var _this4 = this;

      task.task(task.context, task.arg).then(function (result) {
        _this4._pickNext();
        task.resolve(result);
      }).catch(function (error) {
        try {
          if (task.handle) {
            task.handle(error).then(function (result) {
              return result;
            }).then(function (result) {
              return _this4._pickSame(result);
            }).catch(task.reject);
          } else {
            throw error;
          }
        } catch (e) {
          task.reject(error);
        }
      });
    }
  }, {
    key: "add",
    value: function add(task, context, arg, errorHandler) {
      var _this5 = this;

      return new _promise2.default(function (resolve, reject) {
        _this5._queue.push({
          task: task,
          context: context,
          arg: arg,
          handle: errorHandler,
          resolve: resolve,
          reject: reject
        });
        _this5._wakeupQueue();
      });
    }
  }]);
  return RetryingQueue;
}();

exports.default = RetryingQueue;


(0, _freeze2.default)(RetryingQueue);
module.exports = exports["default"];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],215:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _utils = _dereq_('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var COREDATA_DOCUMENT_NOTIFICATION_TYPE = 'com.twilio.rtd.cds.document';
var COREDATA_LIST_NOTIFICATION_TYPE = 'com.twilio.rtd.cds.list';
var COREDATA_MAP_NOTIFICATION_TYPE = 'com.twilio.rtd.cds.map';

/**
 * @class Router
 * @classdesc Routes all incoming messages to the consumers
 */

var Router = function () {
  function Router(params) {
    var _this = this;

    (0, _classCallCheck3.default)(this, Router);

    (0, _defineProperties2.default)(this, {
      _config: { value: params.config },
      _subscriptions: { value: params.subscriptions },
      _notifications: { value: params.notifications }
    });

    this._notifications.subscribe(COREDATA_DOCUMENT_NOTIFICATION_TYPE);
    this._notifications.subscribe(COREDATA_LIST_NOTIFICATION_TYPE);
    this._notifications.subscribe(COREDATA_MAP_NOTIFICATION_TYPE);

    this._notifications.on('message', this.onMessage.bind(this));
    this._notifications.on('transportReady', function (state) {
      if (state) {
        _this.onConnected();
      }
    });
  }

  /**
   * Entry point for all incoming messages
   * @param {String} type - Type of incoming message
   * @param {Object} message - Message to route
   */


  (0, _createClass3.default)(Router, [{
    key: 'onMessage',
    value: function onMessage(type, message) {
      _logger2.default.trace('Notification type:', type, 'content:', message);

      var id = void 0;
      switch (type) {
        case COREDATA_DOCUMENT_NOTIFICATION_TYPE:
          id = message.event.document_sid;
          break;
        case COREDATA_LIST_NOTIFICATION_TYPE:
          id = message.event.list_sid;
          break;
        case COREDATA_MAP_NOTIFICATION_TYPE:
          id = message.event.map_sid;
          break;
        default:
          _logger2.default.warn('Unknown message type:', type, 'ignoring');
      }

      if (id) {
        message.event.type = message.event_type; // Patch message
        this._subscriptions.getSubscribers(id).forEach(function (entity) {
          entity._update((0, _utils.deepClone)(message.event));
        });
      }
    }

    /**
     * Subscribe for events
     */

  }, {
    key: 'subscribe',
    value: function subscribe(sid, entity) {
      return this._subscriptions.add(sid, entity).then(function (isNewSubscription) {
        if (isNewSubscription) {
          entity._softSync();
        }
      }).then(function () {
        return entity;
      });
    }

    /**
     * Unsubscribe from events
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(sid, entity) {
      return this._subscriptions.remove(sid, entity).then(function () {
        return entity;
      });
    }

    /**
     * Handle transport establishing event
     * If we have any subscriptions - we should check object for modifications
     */

  }, {
    key: 'onConnected',
    value: function onConnected() {
      this._subscriptions.forEach(function (id, endpoint) {
        endpoint._softSync();
      });
    }
  }]);
  return Router;
}();

exports.default = Router;
module.exports = exports['default'];
},{"./logger":210,"./utils":221,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],216:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _set = _dereq_('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _extends2 = _dereq_('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _slicedToArray2 = _dereq_('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getIterator2 = _dereq_('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _backoff = _dereq_('backoff');

var _backoff2 = _interopRequireDefault(_backoff);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MAX_SUBSCRIPTION_BATCH_SIZE = 100;

function substract(p1, p2, limit) {
  var result = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(p1), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _step$value = (0, _slicedToArray3.default)(_step.value, 2),
          key = _step$value[0],
          value = _step$value[1];

      if (!p2.has(key)) {
        result.push({ sid: key, type: value.type });
        if (limit && result.length >= limit) {
          break;
        }
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

  return result;
}

/**
 * @class Subscriptions
 * @classdesc Subscriptions container for CDS objects
 */

var Subscriptions = function () {
  /**
   * @constructor
   */
  function Subscriptions(config, network) {
    var _this = this;

    (0, _classCallCheck3.default)(this, Subscriptions);


    function createBackoff() {
      var defaultBackoffConfig = {
        randomisationFactor: 0.2,
        initialDelay: 50,
        maxDelay: 2 * 60 * 1000
      };
      return _backoff2.default.exponential((0, _extends3.default)(defaultBackoffConfig, config.backoffConfig || {}));
    }

    (0, _defineProperties2.default)(this, {
      _config: { value: config },
      _network: { value: network },
      _backoff: { value: createBackoff() },

      _types: { value: new _map2.default() },
      _subscriptions: { value: new _map2.default() },
      _persisted: { value: new _map2.default() }
    });

    this._backoff.on('ready', function () {
      var _getAction2 = _this._getAction(),
          action = _getAction2.action,
          list = _getAction2.list;

      if (action) {
        _this._request(action, list.map(function (x) {
          return { object_sid: x.sid, object_type: x.type };
        })) // eslint-disable-line camelcase
        .then(function () {
          _this._backoff.reset();
          _this._backoff.backoff();
        }).catch(function (e) {
          _logger2.default.error('Error while persisting subscriptions, retrying', action, e);
          _this._backoff.backoff(e);
        });
      } else {
        _this._backoff.reset();
        _logger2.default.info('Subscription list persisted');
      }
    });
  }

  (0, _createClass3.default)(Subscriptions, [{
    key: '_getAction',
    value: function _getAction() {
      var _this2 = this;

      var listToAdd = substract(this._subscriptions, this._persisted, MAX_SUBSCRIPTION_BATCH_SIZE);
      if (listToAdd.length > 0) {
        return { action: 'establish', list: listToAdd };
      }

      var listToRemove = substract(this._persisted, this._subscriptions, MAX_SUBSCRIPTION_BATCH_SIZE).map(function (x) {
        return { sid: x.sid, type: _this2._types.get(x.sid) };
      });
      if (listToRemove.length > 0) {
        return { action: 'cancel', list: listToRemove };
      }

      return {};
    }
  }, {
    key: '_persist',
    value: function _persist() {
      try {
        this._backoff.backoff();
      } catch (e) {} // eslint-disable-line no-empty
    }

    /**
     * @private
     */

  }, {
    key: '_request',
    value: function _request(action, requests) {
      var _this3 = this;

      _logger2.default.debug('Modifying server subscriptions: ', action, requests);

      var requestBody = {
        event_protocol_version: 3, // eslint-disable-line camelcase
        action: action,
        requests: requests
      };

      return this._network.post(this._config.subscriptionsUri, requestBody).then(function (response) {
        response.body.results.forEach(function (persisted) {
          if (!persisted.subscription) {
            _this3._persisted.delete(persisted.object_sid);
            _this3._types.delete(persisted.object_sid);
          } else {
            _this3._persisted.set(persisted.object_sid, persisted.subscription);
            var subscription = _this3._subscriptions.get(persisted.object_sid);
            if (subscription) {
              subscription.resolve(true);
            }
          }
        });
      });
    }

    /**
     * Add subscription
     * @param {string} uri URI to the server object
     * @param {object} endpoint Endpoint object
     * @return Promise<boolean> true if subscription haven't been there before
     */

  }, {
    key: 'add',
    value: function add(sid, entity) {
      var _this4 = this;

      var subscribed = this._subscriptions.has(sid);
      var persisted = this._persisted.has(sid);

      if (subscribed && persisted) {
        var _subscription = this._subscriptions.get(sid);
        _subscription.subscribers.add(entity);
        return _promise2.default.resolve(false);
      } else if (this._subscribed && !persisted) {
        var _subscription2 = this._subscriptions.get(sid);
        return _subscription2.promise;
      }

      var subscription = { type: entity.type,
        subscribers: new _set2.default([entity]),
        promise: null,
        resolve: null,
        reject: null
      };

      this._subscriptions.set(sid, subscription);
      var promiseToSubscribe = new _promise2.default(function (resolve, reject) {
        subscription.resolve = resolve;
        subscription.reject = reject;
        _this4._persist();
      });
      subscription.promise = promiseToSubscribe;
      return promiseToSubscribe;
    }

    /**
     * Remove subscription for the entity
     * @param {string} entityUri URI
     * @param {object} endpoint Endpoint object
     */

  }, {
    key: 'remove',
    value: function remove(id, entity) {
      if (!this._subscriptions.has(id)) {
        return _promise2.default.resolve(true);
      }

      var subscription = this._subscriptions.get(id);
      if (!subscription.subscribers.has(entity)) {
        return _promise2.default.resolve(false);
      }

      subscription.subscribers.delete(entity);
      if (subscription.subscribers.size > 0) {
        return _promise2.default.resolve(false);
      }

      // It's a hack: since server responce doesn't contain a type, but we need it
      // we should always keep it locally
      this._types.set(id, subscription.type);

      this._subscriptions.delete(id);
      this._persist();
      return _promise2.default.resolve(true);
    }

    /**
     * Query subscribers for given URI
     * @return {set}
     */

  }, {
    key: 'getSubscribers',
    value: function getSubscribers(id) {
      var subscription = this._subscriptions.get(id);
      return subscription && subscription.subscribers ? subscription.subscribers : new _set2.default();
    }

    /**
     * Iterates through all subscriptions
     * @param {function} hanlder function to call for each subscription
     */

  }, {
    key: 'forEach',
    value: function forEach(handler) {
      this._subscriptions.forEach(function (subscription, id) {
        subscription.subscribers.forEach(function (subscriber) {
          return handler(id, subscriber);
        });
      });
    }

    /**
     * Currently just resets retries
     * Should remove all subscriptions
     */

  }, {
    key: 'shutdown',
    value: function shutdown() {
      this._backoff.reset();
      this._subscriptions.clear();

      var listToRemove = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = (0, _getIterator3.default)(this._persisted), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = (0, _slicedToArray3.default)(_step2.value, 2),
              key = _step2$value[0],
              value = _step2$value[1];

          listToRemove.push({ object_sid: key, type: value.type }); // eslint-disable-line camelcase
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (listToRemove.length > 0) {
        return this._request('cancel', listToRemove).catch(function () {});
      }
      return _promise2.default.resolve();
    }
  }]);
  return Subscriptions;
}();

exports.default = Subscriptions;
module.exports = exports['default'];
},{"./logger":210,"babel-runtime/core-js/get-iterator":25,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/core-js/set":39,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/extends":44,"babel-runtime/helpers/slicedToArray":47,"backoff":49}],217:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = _dereq_('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _entity = _dereq_('./entity');

var _entity2 = _interopRequireDefault(_entity);

var _rfc = _dereq_('rfc6902');

var _retryingqueue = _dereq_('./retryingqueue');

var _retryingqueue2 = _interopRequireDefault(_retryingqueue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class
 * @alias Document
 * @classdesc
 * Primitive to store a single document in DataSync service
 * @property {String} sid SyncDocument unique id
 * @property {String} uniqueName Unique name of a document
 * @property {Object} value Value of a document
 *
 * @fires Document#updated
 * @fires Document#updatedRemotely
 * @fires Document#removed
 * @fires Document#removedRemotely
 */
var SyncDocument = function (_SyncEntity) {
  (0, _inherits3.default)(SyncDocument, _SyncEntity);

  /**
   * @constructor
   * @private
   */
  function SyncDocument(params, descriptor, onRemoveDocument) {
    (0, _classCallCheck3.default)(this, SyncDocument);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SyncDocument.__proto__ || (0, _getPrototypeOf2.default)(SyncDocument)).call(this, params));

    (0, _defineProperties2.default)(_this, {
      _config: { value: params.config },
      _datasync: { value: params.datasync },
      _network: { value: params.network },
      _router: { value: params.router },

      _updateQueue: { value: new _retryingqueue2.default() },
      _pendingListeners: { value: {} },
      _onRemoveDocument: { value: onRemoveDocument },

      _descriptor: { value: descriptor },
      _sid: { value: descriptor.sid },
      _revision: { value: descriptor.revision, writable: true },
      _lastEventId: { value: descriptor.last_event_id, writable: true },
      _data: { value: descriptor.data || {}, writable: true },

      uri: { get: function get() {
          return _this._descriptor.url;
        } },

      sid: { enumerable: true, get: function get() {
          return _this._sid;
        } },
      value: { enumerable: true, get: function get() {
          return _this._data;
        } },
      uniqueName: { enumerable: true, get: function get() {
          return _this._descriptor.unique_name || null;
        } }
    });

    _this._initialize();
    return _this;
  }

  (0, _createClass3.default)(SyncDocument, [{
    key: '_initialize',


    /**
     * @private
     */
    value: function _initialize() {
      var _this2 = this;

      ['keyAdded', 'keyRemoved', 'keyUpdated', 'keyAddedRemotely', 'keyRemovedRemotely', 'keyUpdatedRemotely'].forEach(function (eventName) {
        _this2._pendingListeners[eventName] = {};
        _this2.on(eventName, function (path, data) {
          var handlers = _this2._pendingListeners[eventName][path] || [];
          handlers.forEach(function (handler) {
            handler(data);
          });
          _this2._pendingListeners[eventName][path] = [];
        });
      });
    }

    /**
     * Update data entity with new data
     * @private
     */

  }, {
    key: '_update',
    value: function _update(update) {
      switch (update.type) {
        case 'document_updated':
          if (update.id > this._lastEventId) {
            var originalData = this._data;
            this._lastEventId = update.id;
            this._revision = update.document_revision;
            this._data = update.document_data;
            this._traverse(originalData, update.document_data, false);
            this.emit('updated', update.document_data, false);
            this.emit('updatedRemotely', update.document_data);
          }
          break;
        case 'document_removed':
          this._onRemoved(false);
      }
    }

    /**
     * Calculate diff between old and new data
     * @private
     */

  }, {
    key: '_traverse',
    value: function _traverse(originalData, updatedData, isLocalEvent) {
      var _this3 = this;

      var diff = (0, _rfc.createPatch)(originalData, updatedData);
      diff.forEach(function (row) {
        if (row.op === 'add') {
          _this3.emit('keyAdded', row.path, row.value, isLocalEvent);
          if (!isLocalEvent) {
            _this3.emit('keyAddedRemotely', row.path, row.value);
          }
        } else if (row.op === 'replace') {
          _this3.emit('keyUpdated', row.path, row.value, isLocalEvent);
          if (!isLocalEvent) {
            _this3.emit('keyUpdatedRemotely', row.path, row.value);
          }
        } else if (row.op === 'remove') {
          _this3.emit('keyRemoved', row.path, isLocalEvent);
          if (!isLocalEvent) {
            _this3.emit('keyRemovedRemotely', row.path);
          }
        }
      });
    }

    /**
     * @returns {Object} Internal data of entity
     * For now use a 'value' property instead
     * @private
     */

  }, {
    key: 'get',
    value: function get(path) {
      return !path ? this._data : this._value(path);
    }

    /**
     * Set new value for the document
     * @param {Object} value New value for the document
     * @param {Boolean} [conditional=false] Check for remote modification when updating.
     * If true, promise will be rejected if value was remotely modified
     * @returns {Promise}
     */

  }, {
    key: 'set',
    value: function set(value, conditional) {
      return this._actualSet(value, conditional ? function () {
        throw new Error('Revision mismatch');
      } : null);
    }

    /**
     * @private
     */

  }, {
    key: '_actualSet',
    value: function _actualSet(data, conflictResolver) {
      var _this4 = this;

      var resolver = void 0;
      var arg = { data: data };
      if (conflictResolver) {
        arg.revision = this._revision;

        resolver = function resolver(err) {
          if (err.status === 412) {
            return _this4._softSync().then(function () {
              return {
                revision: _this4._revision,
                data: conflictResolver(_this4._data, data)
              };
            });
          }
          throw err;
        };
      }

      return this._updateQueue.add(this._set.bind(this), this.uri, arg, resolver).then(function (result) {
        _this4._revision = result.revision;
        _this4._data = result.data;
        return data;
      }).then(function (_data) {
        _this4.emit('updated', _data, true);
      });
    }

    /**
     * @param {Document~Mutator} mutator Function to apply to current data in order to modify it.
     * Can be called multiple times if same data modified remotely at the same time.
     * @return {Promise}
     */

  }, {
    key: 'mutate',
    value: function mutate(mutator) {
      return this._actualSet(mutator(this._data), mutator);
    }

    /**
     * @param {Object} update Set of fields to update
     * @return {Promise<Object>} Result data
     */

  }, {
    key: 'update',
    value: function update(obj) {
      return this.mutate(function (remote) {
        (0, _extends3.default)(remote, obj);
        return remote;
      });
    }
  }, {
    key: '_set',
    value: function _set(context, param) {
      return this._network.post(this.uri, { data: param.data }, param.revision).then(function (response) {
        var revision = response.body.revision;
        return { revision: revision, data: param.data };
      });
    }

    /**
     * Get new data from server
     * @private
     */

  }, {
    key: '_softSync',
    value: function _softSync() {
      var _this5 = this;

      return this._network.get(this.uri).then(function (response) {
        _this5._update({ type: 'document_updated',
          id: response.body.last_event_id,
          document_revision: response.body.revision, // eslint-disable-line camelcase
          document_data: response.body.data }); // eslint-disable-line camelcase
        return _this5;
      }).catch(function (err) {
        if (err.status === 404) {
          _this5._onRemoved(false);
        } else {
          _logger2.default.error('Can\'t get updates for ' + _this5.sid + ':', err);
        }
      });
    }

    /**
     * Download new data from service and overwrite local changes
     * Won't fire any events and callbacks about changes
     * @private
     */

  }, {
    key: '_forceSync',
    value: function _forceSync() {
      var _this6 = this;

      return this._network.get(this.uri).then(function (response) {
        _this6._revision = response.body.revision;
        _this6._data = response.body.data;
        return _this6;
      }).catch(function (reason) {
        _logger2.default.error('Failed to get entity:', reason);
      });
    }
  }, {
    key: 'addEventHandler',
    value: function addEventHandler(eventName, path, handler) {
      var handlers = this._pendingListeners[eventName][path] || [];
      handlers.push(handler);
      this._pendingListeners[eventName][path] = handlers;
    }

    /**
     * Get value by given path
     * @param {string} path JSON path
     * @private
     */

  }, {
    key: '_value',
    value: function _value(path) {
      var _this7 = this;

      var result = void 0;
      try {
        (function () {
          var pathArr = path.replace(/^\/|\/$/gm, '').split('/');
          var obj = _this7.data;
          pathArr.forEach(function (el) {
            obj = obj[el];
          });
          result = obj;
        })();
      } catch (e) {
        _logger2.default.warn('Failed to get value:', e);
      }
      return result;
    }
  }, {
    key: '_onRemoved',
    value: function _onRemoved(locally) {
      // Should also do some cleanup here
      this.emit('removed', locally);
      if (!locally) {
        this.emit('removedRemotely');
      }
    }

    /**
     * Removes document from service
     * @return {Promise}
     * @public
     */

  }, {
    key: 'removeDocument',
    value: function removeDocument() {
      var _this8 = this;

      this._onRemoveDocument(this.sid);
      return this._network.delete(this.uri).then(function () {
        _this8._onRemoved(true);
      });
    }
  }, {
    key: 'type',
    get: function get() {
      return 'document';
    }
  }]);
  return SyncDocument;
}(_entity2.default);

exports.default = SyncDocument;

/**
 * Applies a transformation to the document value
 * @callback Document~Mutator
 * @param {Object} data current value
 * @return {Object} Modified value
 */

/**
* Fired when document value changed
* @event Document#updated
* @type {Object}
*/

/**
* Fired when document value changed remotely
* @event Document#updatedRemotely
* @type {Object}
*/

/**
* Fired when document removed from server
* @event Document#removed
*/

/**
* Fired when document removed from server remotely
* @event Document#removedRemotely
*/

module.exports = exports['default'];
},{"./entity":207,"./logger":210,"./retryingqueue":214,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/extends":44,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"rfc6902":194}],218:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_("babel-runtime/core-js/object/get-prototype-of");

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = _dereq_("babel-runtime/helpers/possibleConstructorReturn");

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_("babel-runtime/helpers/inherits");

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SyncError = function (_Error) {
  (0, _inherits3.default)(SyncError, _Error);

  function SyncError(message, code) {
    (0, _classCallCheck3.default)(this, SyncError);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SyncError.__proto__ || (0, _getPrototypeOf2.default)(SyncError)).call(this));

    (0, _defineProperties2.default)(_this, {
      name: { value: _this.constructor.name, enumerable: true },
      message: { value: message, enumerable: true },
      code: { value: code, enumerable: true }
    });
    return _this;
  }

  return SyncError;
}(Error);

exports.default = SyncError;
module.exports = exports["default"];
},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46}],219:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _extends2 = _dereq_('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _utils = _dereq_('./utils');

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _entity = _dereq_('./entity');

var _entity2 = _interopRequireDefault(_entity);

var _retryingqueue = _dereq_('./retryingqueue');

var _retryingqueue2 = _interopRequireDefault(_retryingqueue);

var _listitem = _dereq_('./listitem');

var _listitem2 = _interopRequireDefault(_listitem);

var _paginator = _dereq_('./paginator');

var _paginator2 = _interopRequireDefault(_paginator);

var _cache = _dereq_('./cache');

var _cache2 = _interopRequireDefault(_cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @alias List
 * @classdesc List collection to store an ordered list of values
 * @property {String} sid - List unique id
 * @property {String} uniqueName - List unique name
 *
 * @fires List#itemAdded
 * @fires List#itemAddedRemotely
 * @fires List#itemUpdated
 * @fires List#itemUpdatedRemotely
 * @fires List#itemRemoved
 * @fires List#itemRemovedRemotely
 * @fires List#collectionRemoved
 * @fires List#collectionRemovedRemotely
 */
var SyncList = function (_SyncEntity) {
  (0, _inherits3.default)(SyncList, _SyncEntity);

  /**
   * @private
   */
  function SyncList(deps, descriptor, onRemoveList) {
    (0, _classCallCheck3.default)(this, SyncList);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SyncList.__proto__ || (0, _getPrototypeOf2.default)(SyncList)).call(this, deps));

    (0, _defineProperties2.default)(_this, {
      _config: { value: deps.config, writable: false },
      _deps: { value: deps, writable: false },
      _descriptor: { value: descriptor },

      _tombstones: { value: new _map2.default() },
      _updateQueue: { value: new _retryingqueue2.default() },
      _cache: { value: new _cache2.default() },
      _onRemoveList: { value: onRemoveList },

      _links: { get: function get() {
          return _this._descriptor.links;
        } },
      _context: { writable: true },
      _revision: { value: descriptor.revision, writable: true },
      _lastEventId: { value: descriptor.last_event_id, writable: true },
      _items: { value: new _map2.default() },

      uri: { get: function get() {
          return _this._descriptor.url;
        } },

      sid: { enumerable: true, get: function get() {
          return _this._descriptor.sid;
        } },
      uniqueName: { enumerable: true, get: function get() {
          return _this._descriptor.unique_name || null;
        } }
    });
    return _this;
  }

  (0, _createClass3.default)(SyncList, [{
    key: '__set',
    value: function __set(location, param) {
      return this._deps.network.post(location, { data: param.data }, param.revision).then(function (response) {
        var result = response.body;
        result.data = param.data;
        return result;
      });
    }
  }, {
    key: '_set',
    value: function _set(item, value, resolver) {
      var _this2 = this;

      if (!resolver) {
        return this._deps.network.post(item._uri, { data: value }).then(function (result) {
          return item._update(result.body.last_event_id, result.body.revision, value);
        });
      }

      var _resolver = function _resolver(err) {
        if (err.status === 412) {
          return _this2._queryEvents().then(function () {
            return _this2.get(item.index);
          }).then(function (result) {
            return {
              revision: result._revision,
              data: resolver(result.value, value)
            };
          });
        }
        throw err;
      };

      return this._updateQueue.add(this.__set.bind(this), item._uri, { revision: item._revision, data: value }, _resolver).then(function (result) {
        return item._update(result.last_event_id, result.revision, result.data);
      });
    }

    /**
     * Add element to the List
     * @param {Object} value - value to add
     * @returns {Promise<Item>} A new item
     */

  }, {
    key: 'push',
    value: function push(value) {
      var _this3 = this;

      return this._deps.network.post(this._links.items, { data: value }).then(function (response) {
        var item = new _listitem2.default({ index: Number(response.body.index),
          revision: response.body.revision,
          eventId: response.body.last_event_id,
          uri: response.body.url,
          value: value });

        if (!_this3._items.has(item.index)) {
          _this3._items.set(item.index, item);
        } else {
          var localItem = _this3._items.get(item.index);
          if (localItem._lastEventId < item.last_event_id) {
            localItem._update(item._lastEventId, item._revision, item.value);
          }
          item = localItem;
        }

        _this3.emit('itemAdded', item, true);
        return item;
      });
    }

    /**
     * Update existing item in a List
     * @param {Number} index - index in the List
     * @param {Object} value - value to set
     * @param {Boolean} [conditional=false] Check for remote modification when updating.
     * If true, promise will be rejected if value was remotely modified
     * @returns {Promise<Item>} - A new element
     */

  }, {
    key: 'set',
    value: function set(index, value, conditional) {
      return this._actualSet(index, value, conditional ? function () {
        throw new Error('Revision mismatch');
      } : null);
    }

    /**
     * @private
     */

  }, {
    key: '_actualSet',
    value: function _actualSet(index, value, resolver) {
      var _this4 = this;

      return this.get(index).then(function (item) {
        return _this4._set(item, value, resolver);
      }).then(function (item) {
        _this4.emit('itemUpdated', item, true);
        return item;
      });
    }

    /**
     * Updates the existing item value
     *
     * @param {Number} Index Item key
     * @param {List~Mutator} Mutator Function performing value mutation
     * @returns {Promise}
     */

  }, {
    key: 'mutate',
    value: function mutate(index, mutator) {
      var _this5 = this;

      return this.get(index).then(function (item) {
        return _this5._actualSet(index, mutator(item.value), mutator);
      });
    }

    /**
     * @param {Number} Index Item key
     * @param {Object} update Set of fields to update
     * @return {Promise<Item>} Result data
     */

  }, {
    key: 'update',
    value: function update(index, obj) {
      return this.mutate(index, function (remote) {
        (0, _extends3.default)(remote, obj);
        return remote;
      });
    }

    /**
     * Remove List item by index
     * @param {Number} index - item index
     * @returns Promise to remove, which may fail
     */

  }, {
    key: 'remove',
    value: function remove(index) {
      var _this6 = this;

      return this.get(index).then(function (item) {
        return _this6._deps.network.delete(item._uri);
      }).then(function () {
        _this6._items.delete(index);
        _this6.emit('itemRemoved', index, true);
      });
    }

    /**
     * Retrieve item by index
     * @param {Number} index - item index
     * @returns {Promise<Item>}
     */

  }, {
    key: 'get',
    value: function get(index) {
      var _this7 = this;

      var cachedItem = this._cache.get(index);
      if (cachedItem) {
        return _promise2.default.resolve(cachedItem);
      }

      return this._queryItems({ index: index }).then(function (result) {
        if (result.items.length < 1) {
          throw new Error('No item with index ' + index + ' found');
        }

        return _this7._cache.store(index, result.items[0]);
      });
    }

    /**
     * Query events from servie and apply changes to the List
     * @private
     */

  }, {
    key: '_queryEvents',
    value: function _queryEvents() {
      var _this8 = this;

      var uri = this._links.events + '?From=' + (this._lastEventId + 1) + '&PageSize=100';
      return this._deps.network.get(uri).then(function (response) {
        return response.body.events.forEach(function (event) {
          return _this8._update(event);
        });
      });
    }

    /**
     * Query items from the List
     * @private
     */

  }, {
    key: '_queryItems',
    value: function _queryItems(arg) {
      var _this9 = this;

      arg = arg || {};
      var uri = new _utils.UriBuilder(this._links.items).arg('From', arg.from).arg('PageSize', arg.limit).arg('Index', arg.index).arg('PageToken', arg.pageToken).arg('Order', arg.order).build();

      return this._deps.network.get(uri).then(function (response) {
        var items = response.body.items.map(function (el) {
          return new _listitem2.default({ index: Number(el.index),
            uri: el.url,
            revision: el.revision,
            eventId: el.last_event_id,
            value: el.data });
        });
        items.forEach(function (item, idx) {
          var knownItem = _this9._items.get(item.index);
          if (!knownItem) {
            _this9._items.set(item.index, item);
          } else {
            items[idx] = knownItem;
          }
        });

        var meta = response.body.meta;
        return new _paginator2.default(items, function (pageToken) {
          return _this9._queryItems({ pageToken: pageToken });
        }, meta.previous_token, meta.next_token);
      });
    }

    /**
     * Query items from List
     * @param {Object} args Arguments for items query
     * @param {String} args.from Item, which should be used as an anchor. If undefined, starts from the beginning or end depending on args.order
     * @param {Number} args.pageSize Results page size
     * @param {String} args.order Order of results, should be 'asc' or 'desc'
     * @returns {Promise<Paginator>}
     * @public
     */

  }, {
    key: 'getItems',
    value: function getItems(args) {
      args = args || {};
      args.limit = args.pageSize || args.limit || 50;
      args.order = args.order || 'asc';
      return this._queryItems(args);
    }

    /**
     * @return {Promise<Object>} Context of List
     * @private
     */

  }, {
    key: 'getContext',
    value: function getContext() {
      var _this10 = this;

      if (typeof this._context !== 'undefined') {
        return _promise2.default.resolve(this._context);
      }

      return this._deps.network.get(this._links.context).then(function (response) {
        _this10._context = response.body.data;
        return _this10._context;
      });
    }

    /**
     * @private
     */

  }, {
    key: 'updateContext',
    value: function updateContext(context) {
      var _this11 = this;

      return this._deps.network.post(this._links.context, { data: context }).then(function () {
        _this11._context = context;
        _this11.emit('contextUpdated', context, true);
      }).catch(function (err) {
        _logger2.default.error('Failed to update context', err);
        throw err;
      });
    }

    /**
     * Remove list from service. It will be impossible to restore it.
     * @return {Promise} Promise to delete the collection
     * @public
     */

  }, {
    key: 'removeList',
    value: function removeList() {
      var _this12 = this;

      this._onRemoveList(this.sid);
      return this._deps.network.delete(this.uri).then(function () {
        _this12._onRemoved(true);
      });
    }
  }, {
    key: '_onRemoved',
    value: function _onRemoved(locally) {
      // Should also do some cleanup here
      this.emit('collectionRemoved', locally);
      if (!locally) {
        this.emit('collectionRemovedRemotely');
      }
    }

    /**
     * Force to check for modifications on server
     * If there are any modifications, object will fire all appropriate callbacks
     * @private
     */

  }, {
    key: '_softSync',
    value: function _softSync() {
      var _this13 = this;

      return this._queryEvents().catch(function (err) {
        if (err.status === 404) {
          _this13._onRemoved(false);
        } else {
          _logger2.default.error('Can\'t get updates for ' + _this13.sid + ':', err);
        }
      });
    }
  }, {
    key: '_shouldIgnoreEvent',
    value: function _shouldIgnoreEvent(key, eventId) {
      return (this._tombstones.get(key) || -1) >= eventId;
    }

    /**
     * Handle update, which came from the server
     * @private
     */

  }, {
    key: '_update',
    value: function _update(update) {
      var itemIndex = Number(update.item_index);
      switch (update.type) {
        case 'list_item_added':
          {
            this._handleItemAdded(itemIndex, update.item_url, update.id, update.item_revision, update.item_data);
          }
          break;
        case 'list_item_updated':
          {
            this._handleItemUpdated(itemIndex, update.item_url, update.id, update.item_revision, update.item_data);
          }
          break;
        case 'list_item_removed':
          {
            this._handleItemRemoved(itemIndex, update.id);
          }
          break;
        case 'list_context_updated':
          {
            this._handleContextUpdate(update.context_data, update.id);
          }
          break;
        case 'list_removed':
          {
            this._onRemoved(false);
          }
          break;
      }

      if (this._lastEventId < update.id) {
        this._revision = update.list_revision;
        this._lastEventId = update.id;
      }
    }

    /**
     * Handle item insertion event, coming from server
     * @private
     */

  }, {
    key: '_handleItemAdded',
    value: function _handleItemAdded(index, uri, eventId, revision, value) {
      if (!this._items.has(index) && !this._shouldIgnoreEvent(index, eventId)) {
        var item = new _listitem2.default({ index: index, uri: uri, eventId: eventId, revision: revision, value: value });
        this._items.set(index, item);
        this.emit('itemAdded', item, false);
        this.emit('itemAddedRemotely', item);
      }
    }

    /**
     * Handle new value of item, coming from server
     * @private
     */

  }, {
    key: '_handleItemUpdated',
    value: function _handleItemUpdated(index, uri, eventId, revision, value) {
      var item = this._items.get(index);
      if (!item && !this._shouldIgnoreEvent(index, eventId)) {
        item = new _listitem2.default({ index: index, uri: uri, eventId: eventId, revision: revision, value: value });
        this._items.set(index, item);

        this.emit('itemUpdated', item, false);
        this.emit('itemUpdatedRemotely', item);
      } else if (item && eventId > item._lastEventId) {
        item._update(eventId, revision, value);

        this.emit('itemUpdated', item, false);
        this.emit('itemUpdatedRemotely', item);
      }
    }

    /**
     * @private
     */

  }, {
    key: '_handleItemRemoved',
    value: function _handleItemRemoved(index, eventId) {
      if (this._items.has(index)) {
        this._items.delete(index);
      }
      this._tombstones.set(index, eventId);
      this.emit('itemRemoved', index, false);
      this.emit('itemRemovedRemotely', index);
    }
  }, {
    key: '_handleContextUpdate',
    value: function _handleContextUpdate(data, eventId) {
      if (this._lastEventId < eventId) {
        this._context = data;
        this.emit('contextUpdated', data, false);
        this.emit('contextUpdatedRemotely', data);
      }
    }
  }, {
    key: 'type',
    get: function get() {
      return 'list';
    }
  }]);
  return SyncList;
}(_entity2.default);

exports.default = SyncList;

/**
 * Applies a transformation to the item value
 * @callback List~Mutator
 * @param {Object} data current value of an item
 * @return {Object} Modified data for an item
 */

/**
 * Fired when item is added to the List
 * @event List#itemAdded
 * @type {Item} Added item
 */

/**
 * Fired when item is added to List by remote actor
 * @event List#itemAddedRemotely
 * @type {Item} Added item
 */

/**
 * Fired when item is updated
 * @event List#itemUpdated
 * @type {Item} Updated item
 */

/**
 * Fired when item is updated by remote actor
 * @event List#itemUpdatedRemotely
 * @type {Item} Updated item
 */

/**
 * Fired when item is removed from the List
 * @event List#itemRemoved
 * @type {String} item key
 */

/**
 * Fired when item is removed from the List by remote actor
 * @event List#itemRemovedRemotely
 * @type {String} item key
 */

/**
 * Fired when List is removed from server
 * @event List#collectionRemoved
 */

/**
 * Fired when List is removed from server by remote actor
 * @event List#collectionRemovedRemotely
 */

module.exports = exports['default'];
},{"./cache":202,"./entity":207,"./listitem":209,"./logger":210,"./paginator":213,"./retryingqueue":214,"./utils":221,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/extends":44,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46}],220:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = _dereq_('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _utils = _dereq_('./utils');

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _entity = _dereq_('./entity');

var _entity2 = _interopRequireDefault(_entity);

var _retryingqueue = _dereq_('./retryingqueue');

var _retryingqueue2 = _interopRequireDefault(_retryingqueue);

var _mapitem = _dereq_('./mapitem');

var _mapitem2 = _interopRequireDefault(_mapitem);

var _paginator = _dereq_('./paginator');

var _paginator2 = _interopRequireDefault(_paginator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @class
 * @alias Map
 * @classdesc Map collection to store a set of Key:Value pairs
 * @property {String} sid - Map unique id
 * @property {String} uniqueName - Map unique name
 *
 * @fires Map#itemAdded
 * @fires Map#itemAddedRemotely
 * @fires Map#itemUpdated
 * @fires Map#itemUpdatedRemotely
 * @fires Map#itemRemoved
 * @fires Map#itemRemovedRemotely
 * @fires Map#collectionRemoved
 * @fires Map#collectionRemovedRemotely
 */
var SyncMap = function (_SyncEntity) {
  (0, _inherits3.default)(SyncMap, _SyncEntity);

  /**
   * @constructor
   * @private
   */
  function SyncMap(deps, descriptor, onRemoveMap) {
    (0, _classCallCheck3.default)(this, SyncMap);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SyncMap.__proto__ || (0, _getPrototypeOf2.default)(SyncMap)).call(this, deps));

    var cacheState = {
      ensured: false
    };

    (0, _defineProperties2.default)(_this, {
      _descriptor: { value: descriptor },
      _cacheState: { value: cacheState },

      _tombstones: { value: new _map2.default() },
      _updateQueue: { value: new _retryingqueue2.default() },
      _onRemoveMap: { value: onRemoveMap },

      _links: { get: function get() {
          return _this._descriptor.links;
        } },
      _revision: { value: descriptor.revision, writable: true },
      _lastEventId: { value: descriptor.last_event_id, writable: true },
      _context: { writable: true },
      _items: { value: new _map2.default() },

      uri: { get: function get() {
          return _this._descriptor.url;
        } },

      sid: { enumerable: true, get: function get() {
          return _this._descriptor.sid;
        } },
      uniqueName: { enumerable: true, get: function get() {
          return _this._descriptor.unique_name || null;
        } }
    });
    return _this;
  }

  (0, _createClass3.default)(SyncMap, [{
    key: '_get',
    value: function _get(key) {
      return this._query({ key: key }).then(function (result) {
        if (result.items.length < 1) {
          throw new Error('No item with key ' + key + ' found');
        }
        return result.items[0];
      });
    }
  }, {
    key: '__set',
    value: function __set(location, param) {
      return this._deps.network.post(location, { data: param.data }, param.revision).then(function (response) {
        response = response.body;
        response.data = param.data;
        return response;
      });
    }

    /**
     * Update known existing element
     * @private
     */

  }, {
    key: '_set',
    value: function _set(location, keyValue, resolver) {
      var _this2 = this;

      if (!resolver) {
        return this.__set(location, { data: keyValue.data });
      }

      var _resolver = function _resolver(err) {
        if (err.status === 412) {
          return _this2._queryEvents().then(function () {
            return _this2.get(keyValue.key);
          }).then(function (item) {
            return {
              revision: item._revision,
              data: resolver(item.value, keyValue.data)
            };
          });
        }
        throw err;
      };

      return this._updateQueue.add(this.__set.bind(this), location, { revision: keyValue.revision, data: keyValue.data }, _resolver).then(function (result) {
        return result;
      });
    }

    /**
     * Create element or update if already existing
     * @private
     */

  }, {
    key: '_tryAddOrUpdate',
    value: function _tryAddOrUpdate(uri, keyValue, resolver) {
      var _this3 = this;

      return new _promise2.default(function (resolve, reject) {
        _this3._deps.network.post(uri, keyValue).then(function (response) {
          response.body.data = keyValue.data;
          response.body._isLocallyAdded = true; // TODO: Hack, remove me
          resolve(response.body);
        }).catch(function (err) {
          if (err.status !== 409) {
            reject(err);
            return;
          }

          var location = err.body.links.item;
          if (!resolver) {
            _this3._set(location, keyValue, resolver).then(resolve).catch(reject);
          } else {
            _this3._deps.network.get(location).then(function (result) {
              return {
                key: result.key,
                revision: result.revision,
                data: resolver(result.value, keyValue.data)
              };
            }).then(function (item) {
              return _this3._set(location, item, resolver);
            }).then(resolve).catch(reject);
          }
        });
      });
    }

    /**
     * Query events from servie and apply changes to the collection
     * @private
     */

  }, {
    key: '_queryEvents',
    value: function _queryEvents() {
      var _this4 = this;

      var uri = this._links.events + '?From=' + (this._lastEventId + 1) + '&PageSize=100';
      return this._deps.network.get(uri).then(function (response) {
        return response.body.events.forEach(function (event) {
          return _this4._update(event);
        });
      }).catch(function (e) {
        _logger2.default.error('Failed to fetch events:', e);
        throw e;
      });
    }

    /**
     * @return Promise<Object> Context of collection
     * @private
     */

  }, {
    key: 'getContext',
    value: function getContext() {
      var _this5 = this;

      if (typeof this._context !== 'undefined') {
        return _promise2.default.resolve(this._context);
      }

      return this._deps.network.get(this._links.context).then(function (response) {
        _this5._context = response.body.data;
        return _this5._context;
      });
    }

    /**
     * @param context {Object} New context value
     * @returns {Promise}
     * @private
     */

  }, {
    key: 'updateContext',
    value: function updateContext(context) {
      var _this6 = this;

      return this._deps.network.post(this._links.context, { data: context }).then(function () {
        _this6._context = context;
        _this6.emit('contextUpdated', context, true);
      });
    }

    /**
     * Set key and value pair in map
     * @param {String} key  Key identifier
     * @param {Object} value Value to set
     * @param {Boolean} [conditional=false] Check for remote modification when updating.
     * If true, promise will be rejected if value was remotely modified
     * @returns {Promise<Item>}
     * @public
     */

  }, {
    key: 'set',
    value: function set(key, value, conditional) {
      return this._actualSet(key, value, conditional ? function () {
        throw new Error('Revision mismatch');
      } : null);
    }

    /**
     * @private
     */

  }, {
    key: '_actualSet',
    value: function _actualSet(key, value, resolver) {
      var _this7 = this;

      var item = this._items.get(key);
      if (item) {
        var arg = { key: key, data: value };
        if (resolver) {
          arg.revision = item._revision;
        }

        return this._set(item._uri, arg, resolver).then(function (response) {
          item._update(response.last_event_id, response.revision, response.data);
          _this7.emit('itemUpdated', item, true);
          return item;
        });
      }

      return this._tryAddOrUpdate(this._links.items, { key: key, data: value }, resolver).then(function (result) {
        return {
          _isLocallyAdded: result._isLocallyAdded, // TODO: hack, remove me
          key: result.key,
          revision: result.revision,
          eventId: result.last_event_id,
          uri: result.url,
          value: result.data
        };
      }).then(function (descriptor) {
        item = _this7._items.get(key);
        if (item && descriptor.eventId > item._lastEventId) {
          item._update(descriptor.eventId, descriptor.revision, descriptor.value);
        } else if (!item) {
          item = new _mapitem2.default(descriptor);
          _this7._items.set(key, item);

          if (descriptor._isLocallyAdded) {
            // TODO: hack, remove me
            _this7.emit('itemAdded', item, true);
          } else {
            _this7.emit('itemUpdated', item, true);
          }
        }
        return item;
      });
    }

    /**
     * @param {String} key String identifier of entity in a map
     * @return {Promise<Item>}
     * @public
     */

  }, {
    key: 'get',
    value: function get(key) {
      if (this._items.has(key)) {
        return _promise2.default.resolve(this._items.get(key));
      }

      return this._query({ key: key }).then(function (result) {
        if (result.items.length < 1) {
          throw new Error('No item with key ' + key + ' found');
        }
        return result.items[0];
      });
    }

    /**
     * @param {String} Key Item key
     * @param {Map~Mutator} Mutator Function performing value mutation
     */

  }, {
    key: 'mutate',
    value: function mutate(key, mutator) {
      var _this8 = this;

      return new _promise2.default(function (resolve) {
        return _this8.get(key).then(function (item) {
          return resolve(item.value);
        }).catch(function () {
          return resolve({});
        });
      }).then(function (value) {
        return _this8._actualSet(key, mutator(value), mutator);
      });
    }

    /**
     * @param {String} key Item key
     * @param {Object} update Set of fields to update
     * @return {Promise<Item>} Result data
     */

  }, {
    key: 'update',
    value: function update(key, obj) {
      return this.mutate(key, function (remote) {
        (0, _extends3.default)(remote, obj);
        return remote;
      });
    }

    /**
     * Delete an entity by given key
     * @return {Promise}
     */

  }, {
    key: 'remove',
    value: function remove(key) {
      var _this9 = this;

      if (typeof key === 'undefined') {
        throw new Error('Key argument is invalid');
      }
      return this.get(key).then(function (item) {
        return _this9._deps.network.delete(item._uri);
      }).then(function () {
        _this9._items.delete(key);
        _this9.emit('itemRemoved', key, true);
      });
    }

    /**
     * @private
     */

  }, {
    key: '_query',
    value: function _query(args) {
      var _this10 = this;

      args = args || {};
      var uri = new _utils.UriBuilder(this._links.items).arg('From', args.from).arg('PageSize', args.limit).arg('Key', args.key).arg('PageToken', args.pageToken).arg('Order', args.order).build();

      return this._deps.network.get(uri).then(function (result) {
        var items = result.body.items.map(function (el) {
          return new _mapitem2.default({ key: el.key,
            uri: el.url,
            revision: el.revision,
            eventId: el.last_event_id,
            value: el.data });
        });
        items.forEach(function (item, idx) {
          var knownItem = _this10._items.get(item.key);
          if (!knownItem) {
            _this10._items.set(item.key, item);
          } else {
            items[idx] = knownItem;
          }
        });

        var meta = result.body.meta;
        return new _paginator2.default(items, function (pageToken) {
          return _this10._query({ pageToken: pageToken });
        }, meta.previous_token, meta.next_token);
      });
    }

    /**
     * Get a list of items from the Map
     * @param {Object} args Arguments for query
     * @param {String} args.from Item, which should be used as an anchor. If undefined, starts from the beginning or end depending on args.order
     * @param {Number} args.pageSize Result page size
     * @param {String} args.order Order of results, should be 'asc' or 'desc'
     * @return {Promise<Paginator>}
     * @public
     */

  }, {
    key: 'getItems',
    value: function getItems(args) {
      args = args || {};
      args.limit = args.pageSize || args.limit || 50;
      args.order = args.order || 'asc';
      return this._query(args);
    }

    /**
     * Synchronizes object with state on a server
     * Fires events about all changes
     *
     * SyncMap#entityAdded
     * SyncMap#entityRemoved
     * SyncMap#entityUpdated
     * SyncMap#contextUpdated
     *
     * @private
     */

  }, {
    key: '_softSync',
    value: function _softSync() {
      var _this11 = this;

      return this._queryEvents().catch(function (err) {
        if (err.status === 404) {
          _this11._onRemoved(false);
        } else {
          _logger2.default.error('Can\'t get updates for ' + _this11.sid + ':', err);
        }
      });
    }

    /**
     * Enumerate through all of maps items
     * It always triggers server interaction when being called for the first time for an object, so could be slow
     * This method not supported now and not meant to be used externally
     * @param {Function} handler Function to handle each argument
     * @private
     */

  }, {
    key: 'forEach',
    value: function forEach(handler) {
      var _this12 = this;

      return new _promise2.default(function (resolve, reject) {
        if (_this12._cacheState.ensured) {
          _this12._items.forEach(handler);
          resolve();
        } else {
          (function () {
            var firstPageQueryArgs = {
              order: 'asc',
              limit: 50
            };
            var getFirstPage = function getFirstPage() {
              return _this12._query(firstPageQueryArgs);
            };
            var handleEnd = function handleEnd() {
              _this12._cacheState.ensured = true;
              resolve();
            };
            _this12._processPage(getFirstPage, handler, handleEnd).catch(reject);
          })();
        }
      });
    }

    /**
     * @private
     */

  }, {
    key: '_processPage',
    value: function _processPage(getPage, handleElement, handleEnd) {
      var _this13 = this;

      return getPage().then(function (page) {
        page.items.forEach(function (el) {
          return handleElement(el);
        });
        if (page.hasNextPage) {
          setTimeout(function () {
            return _this13._processPage(page.nextPage.bind(page), handleElement, handleEnd);
          });
        } else {
          handleEnd();
        }
      });
    }
  }, {
    key: '_shouldIgnoreEvent',
    value: function _shouldIgnoreEvent(key, eventId) {
      return (this._tombstones.get(key) || -1) >= eventId;
    }

    /**
     * Handle update from the server
     * @private
     */

  }, {
    key: '_update',
    value: function _update(update) {
      switch (update.type) {
        case 'map_item_added':
          {
            this._handleItemAdded(update.item_key, update.item_url, update.id, update.item_revision, update.item_data);
          }
          break;
        case 'map_item_updated':
          {
            this._handleItemUpdated(update.item_key, update.item_url, update.id, update.item_revision, update.item_data);
          }
          break;
        case 'map_item_removed':
          {
            this._handleItemRemoved(update.item_key, update.id);
          }
          break;
        case 'map_context_updated':
          {
            this._handleContextUpdate(update.context_data, update.id);
          }
          break;
        case 'map_removed':
          {
            this._onRemoved(false);
          }
          break;
      }

      if (this._lastEventId < update.id) {
        this._revision = update.map_revision;
        this._lastEventId = update.id;
      }
    }

    /**
     * Handle entity insertion event, coming from server
     * @private
     */

  }, {
    key: '_handleItemAdded',
    value: function _handleItemAdded(key, uri, eventId, revision, value) {
      if (!this._items.has(key) && !this._shouldIgnoreEvent(key, eventId)) {
        var item = new _mapitem2.default({ key: key, uri: uri, eventId: eventId, revision: revision, value: value });
        this._tombstones.delete(key);
        this._items.set(key, item);
        this.emit('itemAdded', item, false);
        this.emit('itemAddedRemotely', item);
      }
    }

    /**
     * Handle new value of entity, coming from server
     * @private
     */

  }, {
    key: '_handleItemUpdated',
    value: function _handleItemUpdated(key, uri, eventId, revision, value) {
      var item = this._items.get(key);
      if (!item && !this._shouldIgnoreEvent(key, eventId)) {
        item = new _mapitem2.default({ key: key, uri: uri, eventId: eventId, revision: revision, value: value });
        this._items.set(key, item);

        this.emit('itemUpdated', item, false);
        this.emit('itemUpdatedRemotely', item);
      } else if (item && eventId > item._lastEventId) {
        item._update(eventId, revision, value);

        this.emit('itemUpdated', item, false);
        this.emit('itemUpdatedRemotely', item);
      }
    }

    /**
     * @private
     */

  }, {
    key: '_handleItemRemoved',
    value: function _handleItemRemoved(key, eventId) {
      if (this._items.has(key)) {
        this._items.delete(key);
      }
      this._tombstones.set(key, eventId);

      this.emit('itemRemoved', key, false);
      this.emit('itemRemovedRemotely', key, false);
    }
  }, {
    key: '_handleContextUpdate',
    value: function _handleContextUpdate(data, eventId) {
      if (this._lastEventId < eventId) {
        this._context = data;
        this.emit('contextUpdated', data, false);
        this.emit('contextUpdatedRemotely', data);
      }
    }
  }, {
    key: '_onRemoved',
    value: function _onRemoved(locally) {
      // Should also do some cleanup here
      this.emit('collectionRemoved', locally);
      if (!locally) {
        this.emit('collectionRemovedRemotely');
      }
    }

    /**
     * Delete map from server. It will be impossible to restore it.
     * @return {Promise} Promise to delete the collection
     * @public
     */

  }, {
    key: 'removeMap',
    value: function removeMap() {
      var _this14 = this;

      this._onRemoveMap(this.sid);
      return this._deps.network.delete(this.uri).then(function () {
        _this14._onRemoved(true);
      });
    }
  }, {
    key: 'type',
    get: function get() {
      return 'map';
    }
  }]);
  return SyncMap;
}(_entity2.default);

exports.default = SyncMap;

/**
 * Applies a transformation to the item value
 * @callback Map~Mutator
 * @param {Object} data current value of an item
 * @return {Object} Modified data for an item
 */

/**
 * Fired when item is added to the Map
 * @event Map#itemAdded
 * @type {Item} Added item
 */

/**
 * Fired when item is added to the Map by remote actor
 * @event Map#itemAdded
 * @type {Item} Added item
 */

/**
 * Fired when item is updated
 * @event Map#itemUpdated
 * @type {Item} Updated item
 */

/**
 * Fired when item is updated by remote actor
 * @event Map#itemUpdatedRemotely
 * @type {Item} Updated item
 */

/**
 * Fired when item is removed from the Map
 * @event Map#itemRemoved
 * @type {String} item key
 */

/**
 * Fired when item is removed from the Map by remote actor
 * @event Map#itemRemovedRemotely
 * @type {String} item key
 */

/**
 * Fired when Map is removed from server
 * @event Map#collectionRemoved
 */

/**
 * Fired when Map is removed from server by remote actor
 * @event Map#collectionRemovedRemotely
 */

module.exports = exports['default'];
},{"./entity":207,"./logger":210,"./mapitem":211,"./paginator":213,"./retryingqueue":214,"./utils":221,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/extends":44,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46}],221:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UriBuilder = exports.deepClone = undefined;

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Deep-clone an object. Note that this does not work on object containing
 * functions.
 * @param {object} obj - the object to deep-clone
 * @returns {object}
 */
function deepClone(obj) {
  return JSON.parse((0, _stringify2.default)(obj));
}

/**
 * Construct URI with query parameters
 */

var UriBuilder = function () {
  function UriBuilder(base) {
    (0, _classCallCheck3.default)(this, UriBuilder);

    (0, _defineProperties2.default)(this, {
      base: { value: base },
      args: { value: [] }
    });
  }

  (0, _createClass3.default)(UriBuilder, [{
    key: 'arg',
    value: function arg(name, value) {
      if (typeof value !== 'undefined') {
        this.args.push(name + '=' + encodeURIComponent(value));
      }
      return this;
    }
  }, {
    key: 'build',
    value: function build() {
      return this.args.length === 0 ? this.base : this.base + '?' + this.args.join('&');
    }
  }]);
  return UriBuilder;
}();

exports.deepClone = deepClone;
exports.UriBuilder = UriBuilder;
},{"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],222:[function(_dereq_,module,exports){
module.exports={
  "_args": [
    [
      {
        "raw": "twilio-sync@^0.3.0",
        "scope": null,
        "escapedName": "twilio-sync",
        "name": "twilio-sync",
        "rawSpec": "^0.3.0",
        "spec": ">=0.3.0 <0.4.0",
        "type": "range"
      },
      "/Users/bilby91/Projects/mrprofit/twilio-chat"
    ]
  ],
  "_from": "twilio-sync@>=0.3.0 <0.4.0",
  "_id": "twilio-sync@0.3.8",
  "_inCache": true,
  "_location": "/twilio-sync",
  "_nodeVersion": "7.4.0",
  "_npmOperationalInternal": {
    "host": "packages-12-west.internal.npmjs.com",
    "tmp": "tmp/twilio-sync-0.3.8.tgz_1485959803659_0.3402607263997197"
  },
  "_npmUser": {
    "name": "schertkov",
    "email": "schertkov@twilio.com"
  },
  "_npmVersion": "4.0.5",
  "_phantomChildren": {},
  "_requested": {
    "raw": "twilio-sync@^0.3.0",
    "scope": null,
    "escapedName": "twilio-sync",
    "name": "twilio-sync",
    "rawSpec": "^0.3.0",
    "spec": ">=0.3.0 <0.4.0",
    "type": "range"
  },
  "_requiredBy": [
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/twilio-sync/-/twilio-sync-0.3.8.tgz",
  "_shasum": "cb59a9e56f341177d9b135d1d8c7ea16e0b7f3fc",
  "_shrinkwrap": null,
  "_spec": "twilio-sync@^0.3.0",
  "_where": "/Users/bilby91/Projects/mrprofit/twilio-chat",
  "author": {
    "name": "Twilio"
  },
  "dependencies": {
    "babel-runtime": "^6.11.6",
    "loglevel": "^1.4.1",
    "platform": "^1.3.1",
    "rfc6902": "^1.2.2",
    "twilio-notifications": "^0.2.0",
    "twilio-transport": "^0.0.8",
    "twilsock": "^0.2.0",
    "uuid": "^3.0.1"
  },
  "description": "Twilio Sync client library",
  "devDependencies": {
    "async-test-tools": "^1.0.5",
    "babel-cli": "^6.14.0",
    "babel-eslint": "^7.0.0",
    "babel-plugin-add-module-exports": "^0.2.1",
    "babel-plugin-transform-object-assign": "^6.8.0",
    "babel-plugin-transform-runtime": "^6.15.0",
    "babel-preset-es2015": "^6.9.0",
    "babelify": "^7.3.0",
    "backoff": "^2.5.0",
    "browserify": "^13.1.0",
    "chai": "^3.5.0",
    "chai-as-promised": "^6.0.0",
    "cheerio": "^0.22.0",
    "del": "^2.2.1",
    "event-to-promise": "^0.7.0",
    "gulp": "^3.9.1",
    "gulp-derequire": "^2.1.0",
    "gulp-eslint": "^3.0.1",
    "gulp-exit": "0.0.2",
    "gulp-insert": "^0.5.0",
    "gulp-istanbul": "^1.0.0",
    "gulp-mocha": "^3.0.1",
    "gulp-rename": "^1.2.2",
    "gulp-replace": "^0.5.4",
    "gulp-tap": "^0.1.3",
    "gulp-uglify": "^2.0.0",
    "gulp-util": "^3.0.7",
    "ink-docstrap": "^1.2.1",
    "isparta": "^4.0.0",
    "jsdoc": "^3.4.0",
    "jsonwebtoken": "^7.1.6",
    "karma": "^1.3.0",
    "karma-browserify": "^5.1.0",
    "karma-browserstack-launcher": "^1.1.1",
    "karma-mocha": "^1.3.0",
    "karma-mocha-reporter": "^2.2.1",
    "run-sequence": "^1.2.2",
    "sinon": "^1.17.5",
    "sinon-as-promised": "^4.0.2",
    "sinon-chai": "^2.8.0",
    "twilio": "^3.3.0-edge",
    "underscore": "^1.8.3",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0"
  },
  "directories": {
    "test": "test"
  },
  "dist": {
    "shasum": "cb59a9e56f341177d9b135d1d8c7ea16e0b7f3fc",
    "tarball": "https://registry.npmjs.org/twilio-sync/-/twilio-sync-0.3.8.tgz"
  },
  "gitHead": "cf38c40f40944aabcd816562d61f8de89d0ad46d",
  "license": "MIT",
  "main": "lib/index.js",
  "maintainers": [
    {
      "name": "schertkov",
      "email": "schertkov@twilio.com"
    },
    {
      "name": "twilio-ci",
      "email": "mroberts+twilio-ci@twilio.com"
    }
  ],
  "name": "twilio-sync",
  "optionalDependencies": {},
  "readme": "ERROR: No README data found!",
  "scripts": {
    "prepublish": "node_modules/babel-cli/bin/babel.js src --out-dir lib",
    "test": "gulp unit-test"
  },
  "version": "0.3.8"
}

},{}],223:[function(_dereq_,module,exports){
'use strict';

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var XHR = typeof XMLHttpRequest === 'undefined' ? _dereq_('xmlhttprequest').XMLHttpRequest : XMLHttpRequest;

function parseResponseHeaders(headerString) {
  return headerString.split('\r\n').map(function (el) {
    return el.split(': ');
  }).filter(function (el) {
    return el.length === 2 && el[1].length > 0;
  }).reduce(function (prev, curr) {
    prev[curr[0]] = curr[1];return prev;
  }, {});
}

function extractBody(xhr) {
  var contentType = xhr.getResponseHeader('Content-Type');
  if (!contentType || contentType.indexOf('application/json') !== 0 || xhr.responseText.length === 0) {
    return xhr.responseText;
  }

  try {
    return JSON.parse(xhr.responseText);
  } catch (e) {
    return xhr.responseText;
  }
}

function request(method, params) {
  return new _promise2.default(function (resolve, reject) {
    var xhr = new XHR();
    xhr.open(method, params.url, true);

    xhr.onreadystatechange = function onreadystatechange() {
      if (xhr.readyState !== 4) {
        return;
      }

      var headers = parseResponseHeaders(xhr.getAllResponseHeaders());
      var body = extractBody(xhr);

      if (200 <= xhr.status && xhr.status < 300) {
        resolve({ status: xhr.status, headers: headers, body: body });
      } else {
        reject({ status: xhr.status, description: xhr.statusText, headers: headers, body: body });
      }
    };

    for (var headerName in params.headers) {
      xhr.setRequestHeader(headerName, params.headers[headerName]);
      if (headerName === 'Content-Type' && params.headers[headerName] === 'application/json') {
        params.body = (0, _stringify2.default)(params.body);
      }
    }

    xhr.send(params.body);
  });
}

/**
 * Use XMLHttpRequest to get a network resource.
 * @param {String} method - HTTP Method
 * @param {Object} params - Request parameters
 * @param {String} params.url - URL of the resource
 * @param {Array}  params.headers - An array of headers to pass [{ headerName : headerBody }]
 * @param {Object} params.body - A JSON body to send to the resource
 * @returns {Promise}
 **/
var Request = request;

/**
 * Sugar function for request('GET', params);
 * @param {Object} params - Request parameters
 * @returns {Promise}
 */
Request.get = function (params) {
  return request('GET', params);
};

/**
 * Sugar function for request('POST', params);
 * @param {Object} params - Request parameters
 * @returns {Promise}
 */
Request.post = function (params) {
  return request('POST', params);
};

/**
 * Sugar function for request('PUT', params);
 * @param {Object} params - Request parameters
 * @returns {Promise}
 */
Request.put = function (params) {
  return request('PUT', params);
};

/**
 * Sugar function for request('DELETE', params);
 * @param {Object} params - Request parameters
 * @returns {Promise}
 */
Request.delete = function (params) {
  return request('DELETE', params);
};

module.exports = Request;

},{"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/promise":38,"xmlhttprequest":60}],224:[function(_dereq_,module,exports){
'use strict';

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _keys = _dereq_('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var request = _dereq_('./httprequest');

function parseUri(uri) {
  var match = uri.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
  if (match) {
    var uriStruct = {
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      pathname: match[5],
      search: match[6],
      hash: match[7]
    };

    if (uriStruct.search.length > 0) {
      var paramsString = uriStruct.search.substring(1);
      uriStruct.params = paramsString.split('&').map(function (el) {
        return el.split('=');
      }).reduce(function (prev, curr) {
        if (!prev.hasOwnProperty(curr[0])) {
          prev[curr[0]] = curr[1];
        } else if (Array.isArray(prev[curr[0]])) {
          prev[curr[0]].push(curr[1]);
        } else {
          prev[curr[0]] = [prev[curr[0]], curr[1]];
        }
        return prev;
      }, {});
    }
    return uriStruct;
  }
  throw new Error('Incorrect URI: ' + uri);
}

function twilsockAddress(method, uri) {
  var parsedUri = parseUri(uri);
  var to = {
    method: method,
    host: parsedUri.host,
    path: parsedUri.pathname
  };
  if (parsedUri.params) {
    to.params = parsedUri.params;
  }
  return to;
}

function twilsockParams(type, uri, headers, body) {
  return {
    to: twilsockAddress(type, uri),
    headers: headers,
    body: body
  };
}

function adaptTwilsockResponse(response) {
  return { status: response.status,
    headers: response.header.http_headers,
    body: response.body };
}

function httpParams(uri, headers, body) {
  return {
    url: uri,
    headers: headers,
    body: body
  };
}

function adaptHttpResponse(response) {
  try {
    response.body = JSON.parse(response.body);
  } catch (e) {} // eslint-disable-line no-empty
  return response;
}

/**
 * By RFC header names are case-insensitive
 * though it is much easier to work with them in code
 * when they have any specific case.
 * So we forcefully lowercase all headers
 */
function lowercaseHeaders(response) {
  var keys = (0, _keys2.default)(response.headers);
  var n = keys.length;
  var headers = {};
  while (n--) {
    var key = keys[n];
    headers[key.toLowerCase()] = response.headers[key];
  }
  response.headers = headers;
  return response;
}

/**
 * @class Transport
 * @classdesc Provides generic network interface
 */
function Transport(twilsock) {
  var _this = this;

  (0, _defineProperties2.default)(this, {
    _activeGetRequests: { value: new _map2.default() },
    _twilsock: { value: twilsock },
    _http: { value: request },
    _useTwilsock: { get: function get() {
        return _this._twilsock && _this._twilsock.isConnected;
      } }
  });

  if (twilsock) {
    twilsock.connect();
  }
}

/**
 * Make a GET request by given URI
 *
 * This function applies "multiplexing" optimization.
 * If several requests for the same URI happen on the same time,
 * only one will really happen, but all clients will see th result.
 *
 * @Returns Promise<Response> Result of successful get request
 */
Transport.prototype.get = function get(uri, headers) {
  var _this2 = this;

  if (this._activeGetRequests.has(uri)) {
    return this._activeGetRequests.get(uri);
  }

  var promise = this._get(uri, headers).then(function (response) {
    _this2._activeGetRequests.delete(uri);
    return response;
  }).catch(function (error) {
    _this2._activeGetRequests.delete(uri);
    throw error;
  });

  this._activeGetRequests.set(uri, promise);
  return promise;
};

/**
 * @private
 */
Transport.prototype._get = function _get(uri, headers) {
  return (this._useTwilsock ? this._twilsock.send(twilsockParams('GET', uri, headers)).then(adaptTwilsockResponse) : this._http.get(httpParams(uri, headers)).then(adaptHttpResponse)).then(lowercaseHeaders);
};

/**
 * Make a POST request by given URI
 * @Returns Promise<Response> Result of successful request
 */
Transport.prototype.post = function post(uri, headers, body) {
  return (this._useTwilsock ? this._twilsock.send(twilsockParams('POST', uri, headers, body)).then(adaptTwilsockResponse) : this._http.post(httpParams(uri, headers, body)).then(adaptHttpResponse)).then(lowercaseHeaders);
};

/**
 * Make a PUT request by given URI
 * @Returns Promise<Response> Result of successful request
 */
Transport.prototype.put = function put(uri, headers, body) {
  return (this._useTwilsock ? this._twilsock.send(twilsockParams('PUT', uri, headers, body)).then(adaptTwilsockResponse) : this._http.put(httpParams(uri, headers, body)).then(adaptHttpResponse)).then(lowercaseHeaders);
};

/**
 * Make a DELETE request by given URI
 * @Returns Promise<Response> Result of successful request
 */
Transport.prototype.delete = function del(uri, headers) {
  return (this._useTwilsock ? this._twilsock.send(twilsockParams('DELETE', uri, headers)).then(adaptTwilsockResponse) : this._http.delete(httpParams(uri, headers)).then(adaptHttpResponse)).then(lowercaseHeaders);
};

(0, _freeze2.default)(Transport);

module.exports = Transport;

},{"./httprequest":223,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/keys":36}],225:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _set = _dereq_('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _uuid = _dereq_('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _configuration = _dereq_('./configuration');

var _configuration2 = _interopRequireDefault(_configuration);

var _twilsock = _dereq_('./twilsock');

var _twilsock2 = _interopRequireDefault(_twilsock);

var _packetinterface = _dereq_('./packetinterface');

var _packetinterface2 = _interopRequireDefault(_packetinterface);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @class
 * @alias Twilsock
 * @classdesc Client library for the Twilsock protocol
 * @property {Boolean} connected Indicates the twilsock connection state
 *
 * @constructor
 * @param {string} Token Twilio access token
 */
var TwilsockClient = function (_EventEmitter) {
  (0, _inherits3.default)(TwilsockClient, _EventEmitter);

  function TwilsockClient(token, options) {
    (0, _classCallCheck3.default)(this, TwilsockClient);

    var _this = (0, _possibleConstructorReturn3.default)(this, (TwilsockClient.__proto__ || (0, _getPrototypeOf2.default)(TwilsockClient)).call(this));

    options = options || {};
    options.logLevel = options.logLevel || 'error';
    _logger2.default.setLevel(options.logLevel);

    var config = new _configuration2.default(token, options);
    var twilsock = new _twilsock2.default(config);
    var packetInterface = new _packetinterface2.default(twilsock);

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _socket: { value: twilsock },
      _packet: { value: packetInterface },
      _registrations: { value: new _map2.default() },
      _registrationsInProgress: { value: new _map2.default() },

      isConnected: { get: function get() {
          return _this._socket.isConnected;
        } },
      connected: { get: function get() {
          return _this._socket.isConnected;
        } },
      state: { get: function get() {
          return _this._socket.state;
        } }
    });

    _this._socket.on('message', function (type, message) {
      return setTimeout(function () {
        _this.emit('message', type, message);
      }, 0);
    });
    _this._socket.on('connected', function () {
      return _this._updateRegistrations();
    });
    _this._socket.on('connected', function (uri) {
      return _this.emit('connected', uri);
    });
    _this._socket.on('disconnected', function () {
      return _this.emit('disconnected');
    });
    _this._socket.on('stateChanged', function (state) {
      return _this.emit('stateChanged', state);
    });
    return _this;
  }

  /**
   * Send a message
   * @param {Twilsock#Message} message Message structure with header, body and remote address
   * @public
   * @returns {Promise<Result>} Result from remote side
   */

  (0, _createClass3.default)(TwilsockClient, [{
    key: 'send',
    value: function send(message) {
      return this._packet.send(message.to, message.headers, message.body);
    }

    /**
     * Update token
     * @param {String} token
     * @public
     */

  }, {
    key: 'updateToken',
    value: function updateToken(token) {
      var _this2 = this;

      _logger2.default.info('updateToken');
      if (this._config.token === token) {
        return _promise2.default.resolve();
      }

      this._config.updateToken(token);
      this._socket.disconnect().then(function () {
        return _this2._socket.connect();
      });

      return _promise2.default.resolve();
    }
  }, {
    key: '_updateRegistration',
    value: function _updateRegistration(contextId, context) {
      var _this3 = this;

      _logger2.default.info('update registration for context', contextId);
      var registrationAttempts = this._registrationsInProgress.get(contextId);
      if (!registrationAttempts) {
        registrationAttempts = new _set2.default();
        this._registrationsInProgress.set(contextId, registrationAttempts);
      }

      var attemptId = _uuid2.default.v4();
      registrationAttempts.add(attemptId);

      return this._packet.putNotificationContext(contextId, context).then(function () {
        _logger2.default.info('registration attempt succeeded for context', context);
        registrationAttempts.delete(attemptId);
        if (registrationAttempts.size === 0) {
          _this3._registrationsInProgress.delete(contextId);
          _this3.emit('registered', contextId);
        }
      }).catch(function (err) {
        _logger2.default.info('registration attempt failed for context', context);
        _logger2.default.debug(err);

        registrationAttempts.delete(attemptId);
        if (registrationAttempts.size === 0) {
          _this3._registrationsInProgress.delete(contextId);
          _this3.emit('registrationFailed', contextId, err);
        }
      });
    }
  }, {
    key: '_updateRegistrations',
    value: function _updateRegistrations() {
      var _this4 = this;

      _logger2.default.info('refreshing all registrations');
      this._registrations.forEach(function (context, id) {
        _this4._updateRegistration(id, context);
      });
    }
  }, {
    key: 'setNotificationsContext',
    value: function setNotificationsContext(contextId, context) {
      if (!contextId || !context) {
        throw new Error('Invalid arguments provided');
      }

      this._registrations.set(contextId, context);
      if (this._socket.isConnected) {
        this._updateRegistration(contextId, context);
      }
    }
  }, {
    key: 'removeNotificationsContext',
    value: function removeNotificationsContext(contextId) {
      if (!this._registrations.has(contextId)) {
        return;
      }

      this._registrations.delete(contextId);
      if (this._socket.isConnected) {
        this._packet.deleteNotificationContext(contextId);
      }
    }

    /**
     * Connect to the server
     * @fires TwilsockClient#connected
     * @public
     */

  }, {
    key: 'connect',
    value: function connect() {
      return this._socket.connect();
    }

    /**
     * Connect to the server
     * @fires TwilsockClient#disconnected
     * @public
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      return this._socket.disconnect();
    }
  }]);
  return TwilsockClient;
}(_events2.default);

exports.default = TwilsockClient;

(0, _freeze2.default)(TwilsockClient);

/**
 * Twilsock destination address descriptor
 * @typedef {Object} Twilsock#Address
 * @property {String} method - HTTP method. (POST, PUT, etc)
 * @property {String} host - host name without path. (e.g. my.company.com)
 * @property {String} path - path on the host (e.g. /my/app/to/call.php)
 */

/**
 * Twilsock upstream message
 * @typedef {Object} Twilsock#Message
 * @property {Twilsock#Address} to - destination address
 * @property {Object} headers - HTTP headers
 * @property {Object} body - Body
 */

/**
 * Fired when new message received
 * @param {Object} message
 * @event TwilsockClient#message
 */

/**
 * Fired when socket connected
 * @param {String} URI of endpoint
 * @event TwilsockClient#connected
 */

/**
 * Fired when socket disconnected
 * @event TwilsockClient#disconnected
 */

module.exports = exports['default'];

},{"./configuration":226,"./logger":228,"./packetinterface":229,"./twilsock":230,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/core-js/set":39,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"events":186,"uuid":234}],226:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var TWILSOCK_URI = 'wss://tsock.twilio.com';
var TWILSOCK_PATH = '/v2/wsconnect';

/**
 * @param {String} token - authentication token
 * @param {Object} options - options to override defaults
 *
 * @class TwilsockConfig
 * @classdesc Settings container for the Twilsock client library
 */

var TwilsockConfig = function () {
  function TwilsockConfig(token, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, TwilsockConfig);

    options = options || {};
    var _options = options.Twilsock || {};
    var twilsockUri = _options.uri || options.wsServer || TWILSOCK_URI;

    (0, _defineProperties2.default)(this, {
      _twilsockWsHost: { value: twilsockUri + TWILSOCK_PATH },
      _token: { value: token, writable: true },

      twilsockUri: { get: function get() {
          return _this._twilsockWsHost;
        } },
      token: { get: function get() {
          return _this._token;
        } }
    });
  }

  (0, _createClass3.default)(TwilsockConfig, [{
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
    }
  }]);
  return TwilsockConfig;
}();

exports.default = TwilsockConfig;
module.exports = exports['default'];

},{"babel-runtime/core-js/object/define-properties":32,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],227:[function(_dereq_,module,exports){
arguments[4][197][0].apply(exports,arguments)
},{"./client":225,"dup":197}],228:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _from = _dereq_('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _loglevel = _dereq_('loglevel');

var _loglevel2 = _interopRequireDefault(_loglevel);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function prepareLine(prefix, args) {
  return [prefix].concat((0, _from2.default)(args));
}

exports.default = {
  setLevel: function setLevel(level) {
    _loglevel2.default.setLevel(level);
  },

  trace: function trace() {
    _loglevel2.default.trace.apply(null, prepareLine('Twilsock T:', arguments));
  },
  debug: function debug() {
    _loglevel2.default.debug.apply(null, prepareLine('Twilsock D:', arguments));
  },
  info: function info() {
    _loglevel2.default.info.apply(null, prepareLine('Twilsock I:', arguments));
  },
  warn: function warn() {
    _loglevel2.default.warn.apply(null, prepareLine('Twilsock W:', arguments));
  },
  error: function error() {
    _loglevel2.default.error.apply(null, prepareLine('Twilsock E:', arguments));
  }
};
module.exports = exports['default'];

},{"babel-runtime/core-js/array/from":24,"loglevel":188}],229:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = _dereq_('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var REQUEST_TIMEOUT = 30000;

function isHttpSuccess(code) {
  return code >= 200 && code < 300;
}

function isHttpReply(packet) {
  return packet && packet.header && packet.header.http_status;
}

var PacketInterface = function () {
  function PacketInterface(socket) {
    var _this = this;

    (0, _classCallCheck3.default)(this, PacketInterface);

    (0, _defineProperties2.default)(this, {
      _activeRequests: { value: new _map2.default() },
      _socket: { value: socket }
    });

    this._socket.on('reply', this._processReply.bind(this));
    this._socket.on('disconnected', function () {
      _this._activeRequests.forEach(function (descriptor) {
        clearTimeout(descriptor.timeout);
        descriptor.reject(new Error('Twilsock disconnected'));
      });
      _this._activeRequests.clear();
    });
  }

  (0, _createClass3.default)(PacketInterface, [{
    key: '_processReply',
    value: function _processReply(reply) {
      var request = this._activeRequests.get(reply.id);
      if (request) {
        clearTimeout(request.timeout);
        this._activeRequests.delete(reply.id);

        setTimeout(function () {
          // User shouldn't intercept connection handling, thus making it asynchronous
          if (!isHttpSuccess(reply.status.code)) {
            request.reject(new Error('Transport failure: ' + reply.status.status));
          } else if (isHttpReply(reply) && !isHttpSuccess(reply.header.http_status.code)) {
            request.reject({
              status: reply.header.http_status.code,
              description: reply.header.http_status.status,
              body: reply.body
            });
          } else {
            request.resolve(reply);
          }
        }, 0);
      }
    }
  }, {
    key: '_storeRequest',
    value: function _storeRequest(id, resolve, reject) {
      var requestDescriptor = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(function () {
          _logger2.default.debug('request', id, 'is timed out');
          reject(new Error('Twilsock: request timeout: ' + id));
        }, REQUEST_TIMEOUT)
      };
      this._activeRequests.set(id, requestDescriptor);
    }
  }, {
    key: 'send',
    value: function send(address, headers, body) {
      var _this2 = this;

      return new _promise2.default(function (resolve, reject) {
        var id = _this2._socket.sendUpstreamMessage(address, headers, body);
        _logger2.default.trace('message sent: ', { id: id, address: address, headers: headers, body: body });
        _this2._storeRequest(id, resolve, reject);
      });
    }
  }, {
    key: 'putNotificationContext',
    value: function putNotificationContext(contextId, context) {
      var _this3 = this;

      return new _promise2.default(function (resolve, reject) {
        var header = { method: 'put_notification_ctx', notification_ctx_id: contextId }; // eslint-disable-line camelcase
        var id = _this3._socket.send(header, context);
        _this3._storeRequest(id, resolve, reject);
      });
    }
  }, {
    key: 'deleteNotificationContext',
    value: function deleteNotificationContext(contextId) {
      var _this4 = this;

      return new _promise2.default(function (resolve, reject) {
        var packet = { method: 'delete_notification_ctx', notification_ctx_id: contextId }; // eslint-disable-line camelcase
        var id = _this4._socket.send(packet);
        _this4._storeRequest(id, resolve, reject);
      });
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      this._activeRequests.forEach(function (descriptor) {
        clearTimeout(descriptor.timeout);
        descriptor.reject(new Error('Twilsock: request cancelled by user'));
      });
      this._activeRequests.clear();
    }
  }]);
  return PacketInterface;
}();

exports.default = PacketInterface;
module.exports = exports['default'];

},{"./logger":228,"babel-runtime/core-js/map":28,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43}],230:[function(_dereq_,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = _dereq_('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = _dereq_('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = _dereq_('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = _dereq_('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _events = _dereq_('events');

var _events2 = _interopRequireDefault(_events);

var _logger = _dereq_('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _uuid = _dereq_('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _backoff = _dereq_('backoff');

var _backoff2 = _interopRequireDefault(_backoff);

var _javascriptStateMachine = _dereq_('javascript-state-machine');

var _javascriptStateMachine2 = _interopRequireDefault(_javascriptStateMachine);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var WebSocket = global.WebSocket || global.MozWebSocket || _dereq_('ws');

var ACTIVITY_CHECK_INTERVAL = 5000;
var ACTIVITY_TIMEOUT = 43000;

function byteLength(s) {
  var escstr = encodeURIComponent(s);
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });
  return binstr.length;
}

function stringToUint8Array(s) {
  var escstr = encodeURIComponent(s);
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });
  var ua = new Uint8Array(binstr.length);
  Array.prototype.forEach.call(binstr, function (ch, i) {
    ua[i] = ch.charCodeAt(0);
  });
  return ua;
}

function uint8ArrayToString(ua) {
  var binstr = Array.prototype.map.call(ua, function (ch) {
    return String.fromCharCode(ch);
  }).join('');
  var escstr = binstr.replace(/(.)/g, function (m, p) {
    var code = p.charCodeAt(0).toString(16).toUpperCase();
    if (code.length < 2) {
      code = '0' + code;
    }
    return '%' + code;
  });
  return decodeURIComponent(escstr);
}

function getMagic(buffer) {
  var strMagic = '';
  var idx = 0;
  for (; idx < buffer.length; ++idx) {
    var chr = String.fromCharCode(buffer[idx]);
    strMagic += chr;
    if (chr === '\r') {
      idx += 2;
      break;
    }
  }

  var magics = strMagic.split(' ');
  return {
    size: idx,
    protocol: magics[0],
    version: magics[1],
    headerSize: Number(magics[2])
  };
}

/**
 * Makes sure that body is properly stringified
 */
function preparePayload(payload) {
  switch (typeof payload === 'undefined' ? 'undefined' : (0, _typeof3.default)(payload)) {
    case 'undefined':
      return '';
    case 'object':
      return (0, _stringify2.default)(payload);
    default:
      return payload;
  }
}

/**
 * @param {Uint8Array} array
 * @returns {Object}
 */
function getJsonObject(array) {
  var str = uint8ArrayToString(array);
  try {
    return JSON.parse(str);
  } catch (e) {
    _logger2.default.error('failed to parse input: ', str);
    throw e;
  }
}

/**
 * @class TwilsockChannel
 * @classdesc Twilsock connection
 *
 * @param config
 */

var TwilsockChannel = function (_EventEmitter) {
  (0, _inherits3.default)(TwilsockChannel, _EventEmitter);

  function TwilsockChannel(config) {
    var _arguments = arguments;
    (0, _classCallCheck3.default)(this, TwilsockChannel);

    var _this = (0, _possibleConstructorReturn3.default)(this, (TwilsockChannel.__proto__ || (0, _getPrototypeOf2.default)(TwilsockChannel)).call(this));

    var backoff = _backoff2.default.exponential({
      randomisationFactor: 0.2,
      initialDelay: 2 * 1000,
      maxDelay: 2 * 60 * 1000
    });

    backoff.on('ready', function () {
      _this._retry();
    });

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _transportReady: { value: false, writable: true },
      _disconnectedPromiseResolve: { value: null, writable: true },
      _backoff: { value: backoff },
      _fsm: { value: null, writable: true },
      _watchTimer: { value: null, writable: true },
      _timestamp: { value: 0, writable: true },
      _socket: { value: null, writable: true },
      _activeToken: { value: null, writable: true },
      activeToken: { enumerable: true, get: function get() {
          return _this._activeToken;
        } },
      state: { enumberable: true, get: function get() {
          return _this._getState();
        } },
      isConnected: { enumberable: true, get: function get() {
          return _this._isConnected();
        } }
    });

    _this._fsm = _javascriptStateMachine2.default.create({
      initial: 'disconnected',
      events: [{
        name: 'userConnect', from: ['error', 'disconnected'], to: 'connecting'
      }, {
        name: 'userDisconnect', from: ['connecting', 'connected', 'retrying'], to: 'disconnecting'
      }, { name: 'userDisconnect', from: ['rejected'], to: 'disconnected' }, { name: 'userRetry', from: ['retrying'], to: 'connecting' }, { name: 'socketConnected', from: ['connecting'], to: 'connected' }, {
        name: 'socketClosed', from: ['connecting', 'connected', 'error'], to: 'retrying'
      }, { name: 'socketError', from: ['connected'], to: 'retrying' }, { name: 'socketClosed', from: ['disconnecting'], to: 'disconnected' }, {
        name: 'socketRejected', from: ['connecting', 'connected'], to: 'disconnecting'
      }, {
        name: 'tokenRejected', from: ['connecting', 'connected'], to: 'rejected'
      }, { name: 'evUnsupported', from: ['connecting'], to: 'unsupported' }, { name: 'evUnsupported', from: ['connected'], to: 'error' }, {
        name: 'protocolError', from: ['connecting', 'connected'], to: 'error'
      }],
      callbacks: {
        onconnecting: function onconnecting() {
          _this._startWatchdogTimer();
          _this._setupSocket();
          _this.emit('connecting');
        },
        onretrying: function onretrying() {
          _this._initRetry();
          _this.emit('connecting');
        },
        onenterconnected: _this._onConnected.bind(_this),
        onuserDisconnect: function onuserDisconnect() {
          _this._closeSocket();
        },
        ondisconnected: function ondisconnected() {
          return _this._finalizeSocket();
        },
        onsocketRejected: function onsocketRejected() {
          var args = Array.prototype.slice.call(_arguments, 3, _arguments.length);
          _this._onSocketRejected(args);
        },
        onunsupported: function onunsupported() {
          _this._closeSocket();
          _this._finalizeSocket();
        },
        onrejected: function onrejected() {
          _this._closeSocket();
          _this._finalizeSocket();
        },
        onerror: function onerror() {
          _this._closeSocket();
          _this._finalizeSocket();
        },
        onenterstate: function onenterstate() {
          _this.emit('stateChanged', _this.state);
        }
      },
      error: function error() {
        _logger2.default.trace('FSM: unexpected transition', arguments);
      }
    });

    return _this;
  }

  /**
   * Checks if connection established
   * @public
   */

  (0, _createClass3.default)(TwilsockChannel, [{
    key: '_isConnected',
    value: function _isConnected() {
      return this.state === TwilsockChannel.state.CONNECTED && this._socket && this._socket.readyState === 1;
    }

    /**
     * @returns {Number} Connection state
     * @public
     */

  }, {
    key: '_getState',
    value: function _getState() {
      if (!this._fsm) {
        return TwilsockChannel.state.DISCONNECTED;
      }

      switch (this._fsm.current) {
        case 'connecting':
        case 'retrying':
          return TwilsockChannel.state.CONNECTING;
        case 'connected':
          return TwilsockChannel.state.CONNECTED;
        case 'rejected':
          return TwilsockChannel.state.REJECTED;
        case 'disconnecting':
          return TwilsockChannel.state.DISCONNECTING;
        case 'disconnected':
        case 'error':
        default:
          return TwilsockChannel.state.DISCONNECTED;
      }
    }
  }, {
    key: '_initRetry',
    value: function _initRetry() {
      this._backoff.backoff();
    }
  }, {
    key: '_retry',
    value: function _retry() {
      this._socket = null;
      this._activeToken = null;
      this._fsm.userRetry();
    }
  }, {
    key: '_onConnected',
    value: function _onConnected() {
      this._backoff.reset();
      this.emit('connected', this._wschannelUrl);
    }
  }, {
    key: '_finalizeSocket',
    value: function _finalizeSocket() {
      this._stopWatchdogTimer();
      this._onDisconnected();
      if (this._disconnectedPromiseResolve) {
        var resolve = this._disconnectedPromiseResolve;
        this._disconnectedPromiseResolve = null;
        resolve();
      }
    }
  }, {
    key: '_onDisconnected',
    value: function _onDisconnected() {
      this._backoff.reset();
      this._wschannelUrl = null;
      this._socket = null;
      this._activeToken = null;
      this.emit('disconnected');
    }
  }, {
    key: '_setupSocket',
    value: function _setupSocket() {
      var self = this;
      var token = this._config.token;
      var uri = this._config.twilsockUri + '?token=' + encodeURIComponent(token);

      var socket = new WebSocket(uri);
      socket.binaryType = 'arraybuffer';

      socket.onopen = function () {
        _logger2.default.info('socket opened');
      };

      socket.onclose = function (e) {
        _logger2.default.info('socket closed', e);
        self._fsm.socketClosed();
      };

      socket.onerror = function (e) {
        _logger2.default.error('error: ', e);
        // self._fsm.socketError();
      };

      socket.onmessage = function (message) {
        _logger2.default.trace('data: ', message.data);

        var fieldMargin = 2;

        var dataView = new Uint8Array(message.data);
        var magic = getMagic(dataView);
        if (magic.protocol !== 'TWILSOCK' || magic.version !== 'V1.0') {
          _logger2.default.error('unsupported protocol: ' + magic.protocol + ' ver ' + magic.version);
          self._fsm.evUnsupported('Unsupported protocol');
          return;
        }

        var header = null;
        try {
          header = getJsonObject(dataView.subarray(magic.size, magic.size + magic.headerSize));
        } catch (e) {
          _logger2.default.error('failed to parse message header', e, message);
          self._fsm.protocolError();
          return;
        }
        _logger2.default.trace('message received: ', header);

        var payload = null;
        if (header.payload_size > 0) {
          var payloadOffset = fieldMargin + magic.size + magic.headerSize;
          var payloadSize = header.payload_size;
          if (!header.hasOwnProperty('payload_type') || header.payload_type.indexOf('application/json') === 0) {
            try {
              payload = getJsonObject(dataView.subarray(payloadOffset, payloadOffset + payloadSize));
            } catch (e) {
              _logger2.default.error('failed to parse message body', e, message);
              self._fsm.protocolError();
              return;
            }
          } else if (header.payload_type.indexOf('text/plain') === 0) {
            payload = uint8ArrayToString(dataView.subarray(payloadOffset, payloadOffset + payloadSize));
          }
        }

        self._updateActivityTimestamp();

        if (header.method === 'ready') {
          _logger2.default.trace('ready', payload);
          self._wschannelUrl = payload.wschannel_url;
          self._confirmReceiving(header);
          self._fsm.socketConnected();
        } else if (header.method === 'notification') {
          self._confirmReceiving(header);
          self.emit('message', header.message_type, payload);
        } else if (header.method === 'reply') {
          self.emit('reply', {
            id: header.id,
            status: header.status,
            header: header,
            body: payload
          });
        } else if (header.method === 'ping') {
          self._confirmReceiving(header);
        } else if (header.method === 'close') {
          _logger2.default.trace('connection close initated by server');
          self._confirmReceiving(header);

          if (payload && (payload.code === 401 || payload.code === 410)) {
            self._fsm.tokenRejected(payload);
          } else {
            self._fsm.socketRejected(payload);
          }
        }
      };

      this._activeToken = token;
      this._socket = socket;
    }

    /**
     * Should be called for each message to confirm it received
     */

  }, {
    key: '_confirmReceiving',
    value: function _confirmReceiving(messageHeader) {
      var header = {
        method: 'reply',
        id: messageHeader.id,
        payload_type: 'application/json', // eslint-disable-line camelcase
        status: { code: 200, status: 'OK' }
      };

      try {
        this._sendPacket(header);
      } catch (e) {
        _logger2.default.debug('failed to confirm packet receiving', e);
      }
    }

    /**
     * Prepare binary packet and send it over the network
     */

  }, {
    key: '_sendPacket',
    value: function _sendPacket(header, payload) {
      var payloadString = preparePayload(payload);

      header.payload_size = byteLength(payloadString); // eslint-disable-line camelcase
      var headerString = (0, _stringify2.default)(header) + '\r\n';
      var magicString = 'TWILSOCK V1.0 ' + (byteLength(headerString) - 2) + '\r\n';
      var message = stringToUint8Array(magicString + headerString + payloadString);

      try {
        this._socket.send(message.buffer);
      } catch (e) {
        _logger2.default.info('failed to send ', header, e);
        _logger2.default.info(e.stack);
        throw e;
      }
    }

    /**
     * Cancels pending retry attempt if it exists
     * @private
     */

  }, {
    key: '_cancelRetryAttempt',
    value: function _cancelRetryAttempt() {
      this._backoff.reset();
    }

    /**
     * Shutdown connection
     * @private
     */

  }, {
    key: '_closeSocket',
    value: function _closeSocket() {
      this._cancelRetryAttempt();
      if (this._socket) {
        this._socket.onopen = null;
        this._socket.onclose = null;
        this._socket.onerror = null;
        this._socket.onmessage = null;

        this._socket.close();
      }
      this._fsm.socketClosed();
    }

    /**
     * Initiate the twilsock connection
     * If already connected, it does nothing
     */

  }, {
    key: 'connect',
    value: function connect() {
      this._fsm.userConnect();
    }

    /**
     * Close twilsock connection
     * If already disconnected, it does nothing
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this2 = this;

      if (this._fsm.is('disconnected')) {
        return _promise2.default.resolve();
      }

      return new _promise2.default(function (resolve) {
        _this2._disconnectedPromiseResolve = resolve;
        _this2._fsm.userDisconnect();
      });
    }

    /**
     * Send upstream message
     * @returns {String} id of sent message
     */

  }, {
    key: 'sendUpstreamMessage',
    value: function sendUpstreamMessage(address, headers, body) {
      var id = _uuid2.default.v4();

      var httpHeader = {
        host: address.host,
        path: address.path,
        method: address.method
      };

      if (address.hasOwnProperty('params')) {
        httpHeader.params = address.params;
      }

      /* eslint-disable camelcase */
      var twilsockHeader = {
        method: 'message',
        id: id,
        http_header: httpHeader
      };

      if (headers) {
        twilsockHeader.http_header.headers = headers;
      }

      if (headers && headers.hasOwnProperty('Content-Type')) {
        twilsockHeader.payload_type = headers['Content-Type'];
      }

      this._sendPacket(twilsockHeader, body);
      return id;
      /* eslint-enable camelcase */
    }
  }, {
    key: 'send',
    value: function send(header, body) {
      header.id = header.id || _uuid2.default.v4();
      this._sendPacket(header, body);
      return header.id;
    }

    /**
     * @private
     */

  }, {
    key: '_onSocketRejected',
    value: function _onSocketRejected(reason) {
      _logger2.default.error('connection closed by server', reason);
      this._closeSocket();
    }

    /**
     * @private
     */

  }, {
    key: '_startWatchdogTimer',
    value: function _startWatchdogTimer() {
      var _this3 = this;

      this._timestamp = Date.now();
      this._watchTimer = setInterval(function () {
        if (Date.now() - _this3._timestamp > ACTIVITY_TIMEOUT && _this3._socket) {
          _this3._socket.close();
        }
      }, ACTIVITY_CHECK_INTERVAL);
    }

    /**
     * @private
     */

  }, {
    key: '_stopWatchdogTimer',
    value: function _stopWatchdogTimer() {
      clearInterval(this._watchTimer);
    }

    /**
     * @private
     */

  }, {
    key: '_updateActivityTimestamp',
    value: function _updateActivityTimestamp() {
      this._timestamp = Date.now();
    }
  }]);
  return TwilsockChannel;
}(_events2.default);
/**
 * Enum for connection state values.
 * @readonly
 * @enum {number}
 */

exports.default = TwilsockChannel;
TwilsockChannel.state = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  ERROR: 'error',
  REJECTED: 'rejected'
};
(0, _freeze2.default)(TwilsockChannel.state);

(0, _freeze2.default)(TwilsockChannel);
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./logger":228,"babel-runtime/core-js/json/stringify":27,"babel-runtime/core-js/object/define-properties":32,"babel-runtime/core-js/object/freeze":34,"babel-runtime/core-js/object/get-prototype-of":35,"babel-runtime/core-js/promise":38,"babel-runtime/helpers/classCallCheck":42,"babel-runtime/helpers/createClass":43,"babel-runtime/helpers/inherits":45,"babel-runtime/helpers/possibleConstructorReturn":46,"babel-runtime/helpers/typeof":48,"backoff":49,"events":186,"javascript-state-machine":187,"uuid":234,"ws":60}],231:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],232:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],233:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":232,"_process":193,"inherits":231}],234:[function(_dereq_,module,exports){
var v1 = _dereq_('./v1');
var v4 = _dereq_('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":237,"./v4":238}],235:[function(_dereq_,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],236:[function(_dereq_,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],237:[function(_dereq_,module,exports){
// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = _dereq_('./lib/rng');
var bytesToUuid = _dereq_('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":235,"./lib/rng":236}],238:[function(_dereq_,module,exports){
var rng = _dereq_('./lib/rng');
var bytesToUuid = _dereq_('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":235,"./lib/rng":236}],239:[function(_dereq_,module,exports){
module.exports={
  "author": {
    "name": "Twilio"
  },
  "dependencies": {
    "babel-runtime": "^6.18.0",
    "backoff": "^2.5.0",
    "durational": "^1.1.0",
    "events": "^1.1.1",
    "loglevel": "^1.4.1",
    "platform": "github:blackuy/platform.js#fix-unkown-node-version",
    "twilio-notifications": "github:blackuy/twilio-notifications",
    "twilio-sync": "^0.3.0",
    "twilio-transport": "^0.0.8",
    "twilsock": "^0.2.0",
    "util": "^0.10.3",
    "uuid": "^3.0.0"
  },
  "description": "A library for Twilio IP messaging",
  "devDependencies": {
    "async": "^2.1.2",
    "babel-eslint": "^7.0.0",
    "babel-plugin-add-module-exports": "^0.2.1",
    "babel-plugin-transform-object-assign": "^6.22.0",
    "babel-plugin-transform-runtime": "^6.15.0",
    "babel-preset-es2015": "^6.16.0",
    "babel-runtime": "^6.11.6",
    "babelify": "^7.3.0",
    "browserify": "^13.1.0",
    "chai": "^3.5.0",
    "chai-as-promised": "^6.0.0",
    "cheerio": "^0.22.0",
    "del": "^2.2.2",
    "event-to-promise": "^0.7.0",
    "express": "^4.14.0",
    "gulp": "^3.9.1",
    "gulp-derequire": "^2.1.0",
    "gulp-eslint": "^3.0.1",
    "gulp-exit": "0.0.2",
    "gulp-insert": "^0.5.0",
    "gulp-istanbul": "^1.1.1",
    "gulp-mocha": "^3.0.1",
    "gulp-rename": "^1.2.2",
    "gulp-replace": "^0.5.4",
    "gulp-tap": "^0.1.3",
    "gulp-uglify": "^2.0.0",
    "ink-docstrap": "^1.3.0",
    "jsdoc": "^3.4.2",
    "mocha.parallel": "^0.13.0",
    "proxyquire": "^1.7.10",
    "run-sequence": "^1.2.2",
    "sinon": "^1.17.6",
    "sinon-as-promised": "^4.0.2",
    "sinon-chai": "^2.8.0",
    "twilio": "^2.11.0",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0"
  },
  "directories": {},
  "engines": {
    "node": ">=0.12"
  },
  "license": "MIT",
  "main": "lib/index.js",
  "maintainers": [
    {
      "name": "schertkov",
      "email": "schertkov@twilio.com"
    }
  ],
  "name": "twilio-chat",
  "version": "0.11.1"
}

},{}]},{},[23])(23)
});