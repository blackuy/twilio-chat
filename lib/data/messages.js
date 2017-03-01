'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

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
var log = require('loglevel');

var Message = require('../message');

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