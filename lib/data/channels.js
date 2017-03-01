'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

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

var Channel = require('../channel');
var log = require('../logger');

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