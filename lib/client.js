'use strict';

var _freeze = require('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

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
var log = require('./logger');

var NotificationClient = require('twilio-notifications');
var TwilsockClient = require('twilsock');
var Transport = require('twilio-transport');
var SyncClient = require('twilio-sync');

var Configuration = require('./configuration');
var Session = require('./session');
var ChannelsEntity = require('./data/channels');

var PublicChannels = require('./data/publicchannels');

var UserInfos = require('./data/userinfos');
var TypingIndicator = require('./services/typingindicator');
var ConsumptionHorizon = require('./services/consumptionhorizon');
var Network = require('./services/network');

var SDK_VERSION = require('./../package.json').version;

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