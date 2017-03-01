'use strict';

const EventEmitter = require('events').EventEmitter;

const Channel = require('../channel');
const log = require('../logger');

/**
 * Represents channels collection
 * {@see Channel}
 */
class Channels extends EventEmitter {
  constructor(services) {
    super();

    Object.defineProperties(this, {
      _services: { value: services },
      _userInfos: { value: services.userInfos },
      _typingIndicator: { value: services.typingIndicator },
      _session: { value: services.session },
      channels: {
        enumerable: true,
        value: new Map()
      }
    });
  }

  _getMap() {
    return this._session.getMyChannelsId()
      .then(name => this._session.datasync.map({ uniqueName: name, mode: 'open' }));
  }

  /**
   * Add channel to server
   * @private
   * @returns {Promise<Channel|SessionError>} Channel
   */
  addChannel(options) {
    return this._session.addCommand('createChannel', {
      friendlyName: options.friendlyName,
      uniqueName: options.uniqueName,
      type: options.isPrivate ? 'private' : 'public',
      attributes: JSON.stringify(options.attributes)
    }).then((response) => {
      let existingChannel = this.channels.get(response.channelSid);
      if (existingChannel) {
        return existingChannel._subscribe().then(() => existingChannel);
      }

      let channel = new Channel(this._services, { channel: response.channel, channelSid: response.channelSid }, response.channelSid);
      this.channels.set(channel.sid, channel);
      this._registerForEvents(channel);

      return channel._subscribe().then(() => {
        this.emit('channelAdded', channel);
        return channel;
      });
    });
  }

  /**
   * Fetch channels list and instantiate all necessary objects
   */
  fetchChannels() {
    this._session.getMyChannelsId()
      .then(name => this._session.datasync.map({ uniqueName: name, mode: 'open' }))
      .then(map => {
        map.on('itemAdded', item => {
          this._upsertChannel(item.key, item.value);
        });

        map.on('itemRemoved', sid => {
          let channel = this.channels.get(sid);
          if (channel) {
            if (channel.status === 'joined' || channel.status === 'invited') {
              channel._setStatus('known');
              this.emit('channelLeft', channel);
            }
            if (channel.isPrivate) {
              this.channels.delete(sid);
              this.emit('channelRemoved', channel);
            }
          }
        });

        map.on('itemUpdated', item => {
          this._upsertChannel(item.key, item.value);
        });

        let upserts = [];
        return map.forEach(item => {
          upserts.push(this._upsertChannel(item.key, item.value));
        }).then(() => Promise.all(upserts));
      })
      .then(() => { log.debug('Channels list fetched'); })
      .then(() => this)
      .catch(e => {
        log.error('Failed to get channels list', e);
        throw e;
      });
  }

  _wrapPaginator(page, op) {
    return op(page.items)
        .then(items => ({
          items: items,
          hasNextPage: page.hasNextPage,
          hasPrevPage: page.hasPrevPage,
          nextPage: () => page.nextPage().then(x => this._wrapPaginator(x, op)),
          prevPage: () => page.prevPage().then(x => this._wrapPaginator(x, op))
        }));
  }

  getChannels(args) {
    return this._getMap()
      .then(channelsMap => channelsMap.getItems(args))
      .then(page => this._wrapPaginator(page
                        , items => Promise.all(items.map(item => this._upsertChannel(item.key, item.value))))
      );
  }

  getChannel(sid) {
    return this._getMap()
      .then(channelsMap => channelsMap.getItems({ key: sid }))
      .then(page => page.items.map(item => this._upsertChannel(item.key, item.value)))
      .then(items => items.length > 0 ? items[0] : null);
  }

  pushChannel(descriptor) {
    const sid = descriptor.sid;
    const data = {
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

    let channel = this.channels.get(descriptor.sid);
    if (!channel) {
      channel = new Channel(this._services, data, sid);
      this.channels.set(sid, channel);
    }
    return channel;
  }

  _upsertChannel(sid, data) {
    let channel = this.channels.get(sid);

    // Update the Channel's status if we know about it
    if (channel) {
      if (data.status === 'joined' && channel.status !== 'joined') {
        channel._setStatus('joined');

        if (typeof data.lastConsumedMessageIndex !== 'undefined') {
          channel._lastConsumedMessageIndex = data.lastConsumedMessageIndex;
        }

        channel._subscribe().then(() => { this.emit('channelJoined', channel); });
      } else if (data.status === 'invited' && channel.status !== 'invited') {
        channel._setStatus('invited');
        channel._subscribe().then(() => { this.emit('channelInvited', channel); });
      } else if (data.status === 'known' &&
          (channel.status === 'invited' || channel.status === 'joined')) {
        channel._setStatus('known');
        channel._update(data);
        channel._subscribe().then(() => { this.emit('channelLeft', channel); });
      } else if (data.status === 'notParticipating' && data.type === 'private') {
        channel._subscribe();
      } else {
        channel._update(data);
      }

      return channel._subscribe().then(() => channel);
    }

    // Fetch the Channel if we don't know about it
    channel = new Channel(this._services, data, sid);
    this._registerForEvents(channel);

    this.channels.set(sid, channel);
    return channel._subscribe().then(() => {
      if (data.status === 'joined') {
        channel._setStatus('joined');
        this.emit('channelJoined', channel);
      } else if (data.status === 'invited') {
        channel._setStatus('invited');
        this.emit('channelInvited', channel);
      }

      if (channel.isPrivate) {
        this.emit('channelAdded', channel);
      }
      return channel;
    });
  }

  _registerForEvents(channel) {
    channel.on('updated', () => this.emit('channelUpdated', channel));
    channel.on('memberJoined', this.emit.bind(this, 'memberJoined'));
    channel.on('memberLeft', this.emit.bind(this, 'memberLeft'));
    channel.on('memberUpdated', this.emit.bind(this, 'memberUpdated'));
    channel.on('messageAdded', this.emit.bind(this, 'messageAdded'));
    channel.on('messageUpdated', this.emit.bind(this, 'messageUpdated'));
    channel.on('messageRemoved', this.emit.bind(this, 'messageRemoved'));
    channel.on('typingStarted', this.emit.bind(this, 'typingStarted'));
    channel.on('typingEnded', this.emit.bind(this, 'typingEnded'));
  }
}

module.exports = Channels;

