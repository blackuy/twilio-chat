'use strict';

console.log('INSIDEEEEEEEEEEEE')

const EventEmitter = require('events').EventEmitter;
const log = require('./logger');

const NotificationClient = require('twilio-notifications');
const TwilsockClient = require('twilsock');
const Transport = require('twilio-transport');
const SyncClient = require('twilio-sync');

const Configuration = require('./configuration');
const Session = require('./session');
const ChannelsEntity = require('./data/channels');

const PublicChannels = require('./data/publicchannels');

const UserInfos = require('./data/userinfos');
const TypingIndicator = require('./services/typingindicator');
const ConsumptionHorizon = require('./services/consumptionhorizon');
const Network = require('./services/network');

const SDK_VERSION = require('./../package.json').version;

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
class Client extends EventEmitter {
  /**
   * @param {string} token - Access token
   * @param {Client#ClientOptions} options - Options to customize the Client
   */
  constructor(token, options) {
    super();

    options = options || { };
    options.logLevel = options.logLevel || 'error';
    options.productId = 'ip_messaging';

    if (!token) {
      throw new Error('A valid Twilio token must be passed to Chat client');
    }

    log.setLevel(options.logLevel);
    let config = new Configuration(token, options);

    options.twilsockClient = options.twilsockClient || new TwilsockClient(token, options);
    options.transport = options.transport || new Transport(options.twilsockClient, options);
    options.notificationsClient = options.notificationsClient || new NotificationClient(token, options);
    options.syncClient = options.syncClient || new SyncClient(token, options);

    const sync = options.syncClient;
    const transport = options.transport;
    const twilsock = options.twilsockClient;
    const notifications = options.notificationsClient;

    let session = new Session(sync, transport, config);
    let sessionPromise = session.initialize(token);

    let network = new Network(config, session, transport);

    let userInfos = new UserInfos(session, sync, null);
    userInfos.on('userInfoUpdated', this.emit.bind(this, 'userInfoUpdated'));

    let consumptionHorizon = new ConsumptionHorizon(config, session);
    let typingIndicator = new TypingIndicator(config
                                          , transport
                                          , notifications
                                          , this.getChannelBySid.bind(this));

    let channelsEntity = new ChannelsEntity({ session, userInfos, typingIndicator, consumptionHorizon, network, config });
    let channelsPromise = sessionPromise.then(() => {
      channelsEntity.on('channelAdded', this.emit.bind(this, 'channelAdded'));
      channelsEntity.on('channelRemoved', this.emit.bind(this, 'channelRemoved'));
      channelsEntity.on('channelInvited', this.emit.bind(this, 'channelInvited'));
      channelsEntity.on('channelJoined', this.emit.bind(this, 'channelJoined'));
      channelsEntity.on('channelLeft', this.emit.bind(this, 'channelLeft'));
      channelsEntity.on('channelUpdated', this.emit.bind(this, 'channelUpdated'));

      channelsEntity.on('memberJoined', this.emit.bind(this, 'memberJoined'));
      channelsEntity.on('memberLeft', this.emit.bind(this, 'memberLeft'));
      channelsEntity.on('memberUpdated', this.emit.bind(this, 'memberUpdated'));

      channelsEntity.on('messageAdded', this.emit.bind(this, 'messageAdded'));
      channelsEntity.on('messageUpdated', this.emit.bind(this, 'messageUpdated'));
      channelsEntity.on('messageRemoved', this.emit.bind(this, 'messageRemoved'));

      channelsEntity.on('typingStarted', this.emit.bind(this, 'typingStarted'));
      channelsEntity.on('typingEnded', this.emit.bind(this, 'typingEnded'));

      return channelsEntity.fetchChannels();
    }).then(() => channelsEntity);

    notifications.on('transportReady', state => {
      if (state) {
        this._connectionState = Client.connectionState.CONNECTED;
        this._session.syncToken().catch(err => {
          log.error('Failed to sync session token', err);
        });
      } else {
        switch (this._twilsock.state) {
          case 'rejected':
            this._connectionState = Client.connectionState.DENIED;
            break;
          default:
            this._connectionState = Client.connectionState.CONNECTING;
        }
      }
      this.emit('connectionStateChanged', this._connectionState);
    });

    Object.defineProperties(this, {
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
        get: () => this._userInfos.myUserInfo
      },
      connectionState: {
        enumerable: true,
        get: () => this._connectionState
      },
      reachabilityEnabled: {
        enumerable: true,
        get: () => this._session.reachabilityEnabled
      }
    });

    this._initializePromise = this._initialize();
  }

  /**
   * @returns {Promise.<T>|Request}
   * @private
   */
  _initialize() {
    return this._sessionPromise.then(() => {
        this._notifications.subscribe('twilio.channel.new_message', 'apn');
        this._notifications.subscribe('twilio.channel.added_to_channel', 'apn');
        this._notifications.subscribe('twilio.channel.invited_to_channel', 'apn');

        this._notifications.subscribe('twilio.channel.new_message', 'gcm');
        this._notifications.subscribe('twilio.channel.added_to_channel', 'gcm');
        this._notifications.subscribe('twilio.channel.invited_to_channel', 'gcm');

        return this._session.getSessionLinks()
                 .then(links => links.publicChannelsUrl)
                 .then(url => {
                   this._publicChannels = new PublicChannels(this._config, this, this._transport, url);
                   return this._publicChannels;
                 });
      })
      .then(this._typingIndicator.initialize());
  }

  /**
   * @private
   */
  _getSession() {
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
  initialize() {
    return this._initializePromise.then(() => this);
  }

  /**
   * Gracefully shutting down library instance
   */
  shutdown() {
    return this._twilsock.disconnect();
  }

  /**
   * Update the token used by the Client and re-register with IP Messaging services.
   * @param {String} token - The JWT string of the new token.
   * @public
   * @returns {Promise<Client>}
   */
  updateToken(token) {
    log.info('updateToken');
    if (token === this._config.token) {
      return Promise.resolve(this);
    }

    return  this._datasync.updateToken(token)
      .then(() => this._notifications.updateToken(token))
      .then(() => this._twilsock.updateToken(token))
      .then(() => this._sessionPromise)
      .then(() => this._session.updateToken(token))
      .then(() => this._config.updateToken(token))
      .then(() => this);
  }

  /**
   * Get a Channel by its SID.
   * @param {String} channelSid - The sid of the Channel to get.
   * @returns {Promise<Channel>}
   */
  getChannelBySid(channelSid) {
    if (!channelSid || typeof channelSid !== 'string') {
      throw new Error('Client.getChannelBySid requires a <String>channelSid parameter');
    }

    return this._channels.getChannel(channelSid)
      .then(channel => {
        return channel || this._publicChannels.getChannelBySid(channelSid).then(x => this._channels.pushChannel(x));
      });
  }

  /**
   * Get a Channel by its unique identifier name.
   * @param {String} uniqueName - The unique identifier name of the Channel to get.
   * @returns {Promise<Channel>}
   */
  getChannelByUniqueName(uniqueName) {
    if (!uniqueName || typeof uniqueName !== 'string') {
      throw new Error('Client.getChannelByUniqueName requires a <String>uniqueName parameter');
    }

    // Currently it's not cached on client, fix?
    return this._publicChannels.getChannelByUniqueName(uniqueName).then(x => this._channels.pushChannel(x));
  }

  /**
   * Get the current list of all Channels the Client knows about.
   * @returns {Promise<Paginator<Channel>>}
   */
  getUserChannels(args) {
    return this._channelsPromise.then(channels => channels.getChannels(args));
  }

  /**
   * Get the public channels directory content
   * @returns {Promise<Paginator<ChannelDescriptor>>}
   */
  getPublicChannels() {
    return this._publicChannels.getChannels();
  }

  /**
   * Create a channel on the server.
   * @param {Client#CreateChannelOptions} [options] - Options for the Channel
   * @returns {Promise<Channel>}
   */
  createChannel(options) {
    options = options || { };
    return this._channelsPromise.then((channelsEntity) => channelsEntity.addChannel(options));
  }

  /**
   * Registers for push notifications
   * @param {string} registrationId - Push notification id provided by platform
   * @param {string} channelType - 'gcm' or 'apn' for now
   * @private
   */
  setPushRegistrationId(registrationId, type) {
    this._notifications.setPushRegistrationId(registrationId, type || 'gcm');
  }

  /**
   * Push notification payload handler
   * @private
   */
  putPushNotificationPayload(notification) {
    let data = notification.additionalData;
    switch (data.type) {
      case 'twilio.channel.new_message': {
        const channelId = data.data.channel_id;
        const messageSid = data.data.message_id;
        this.getChannelBySid(channelId)
          .then(channel => channel.getMessages(10, messageSid));
      }
    }
  }
}

/**
 * Current version of Chat client.
 * @name Client#version
 * @type String
 * @readonly
 */
Object.defineProperties(Client, {
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
Object.freeze(Client.connectionState);

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
