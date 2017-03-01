'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('loglevel');

const Message = require('../message');

function isForward(direction) {
  return direction.toLowerCase() === 'forward';
}

/**
 * Represents the collection of messages in a channel
 */
class Messages extends EventEmitter {
  constructor(channel, session, messages) {
    super();
    Object.defineProperties(this, {
      _datasync: { value: session.datasync },
      _eventStreamPromise: { value: null, writable: true },
      _sortedMessages: { value: messages },
      _messagesByIndex: { value: new Map() },
      _session: { value: session },
      channel: {
        enumerable: true,
        value: channel
      }
    });
  }

  /**
   * Subscribe to the Messages Event Stream
   * @param {String} uri - The URI of the Messages resource.
   * @returns {Promise}
   */
  subscribe(name) {
    return this._eventStreamPromise =
      this._eventStreamPromise || this._datasync.list({ uniqueName: name, mode: 'open' }).then(list => {

      list.on('itemAdded', item => {
        let message = new Message(this.channel, item.index, item.value);
        if (this._messagesByIndex.has(message.index)) {
          log.debug('Message arrived, but already known and ignored', this.channel.sid, message.index);
          return;
        }

        this._sortedMessages.push(message);
        this._messagesByIndex.set(message.index, message);
        message.on('updated', () => this.emit('messageUpdated', message));

        this.emit('messageAdded', message);
      });

      list.on('itemRemoved', index => {
        let message = this._removeMessageById(index);
        if (message) {
          this._messagesByIndex.delete(message.index);
          message.removeAllListeners('updated');
          this.emit('messageRemoved', message);
        }
      });

      list.on('itemUpdated', item => {
        let message = this._messagesByIndex.get(item.index);
        if (message) {
          message._update(item.value);
        }
      });

      return list;
    })
    .catch(err => {
      this._eventStreamPromise = null;
      log.error('Failed to get messages object for channel', this.channel.sid, err);
      throw err;
    });
  }

  unsubscribe() {
    return this._eventStreamPromise ?
        this._eventStreamPromise.then(entity => entity.close()) : Promise.resolve();
  }

  /**
   * @param {Number} entityId Entity ID of Message to remove.
   * @returns {Message} removedMessage The message that was removed (or undefined).
   * @private
   */
  _removeMessageById(entityId) {
    let removedMessage;

    for (let i = 0; i < this._sortedMessages.length; i++) {
      let message = this._sortedMessages[i];

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
  send(message, attributes) {
    if (typeof attributes === 'undefined') {
      attributes = {};
    } else if (attributes.constructor !== Object)  {
      return Promise.reject(new Error('Attributes must be a valid JSON object'));
    }

    return this._session.addCommand('sendMessage', {
      channelSid: this.channel.sid,
      text: message,
      attributes: JSON.stringify(attributes)
    });
  }

  /**
   * Returns messages from channel using paginator interface
   * @param {Number} [pageSize] Number of messages to return in single chunk. By default it's 100.
   * @param {String} [anchor] Most early message id which is already known, or 'end' by default
   * @returns {Promise<Paginator<Message>>} last page of messages by default
   */
  getMessages(pageSize, anchor, direction) {
    anchor = (typeof anchor !== 'undefined') ? anchor : 'end';
    direction = direction || 'backwards';
    return this._getMessages(pageSize, anchor, direction);
  }

  _wrapPaginator(page, op) {
    // We should swap next and prev page here, because of misfit of Sync and Chat paging conceptions
    return op(page.items).then(items => ({
      items: items.sort((x, y) => { return x.index - y.index; }),
      hasPrevPage: page.hasNextPage,
      hasNextPage: page.hasPrevPage,
      prevPage: () => page.nextPage().then(x => this._wrapPaginator(x, op)),
      nextPage: () => page.prevPage().then(x => this._wrapPaginator(x, op))
    }));
  }

  _upsertMessage(index, value) {
    let cachedMessage = this._messagesByIndex.get(index);
    if (cachedMessage) {
      return cachedMessage;
    }

    let message = new Message(this.channel, index, value);
    this._messagesByIndex.set(message.index, message);
    message.on('updated', () => this.emit('messageUpdated', message));
    return message;
  }

  /**
   * Returns last messages from channel
   * @param {Number} [pageSize] Number of messages to return in single chunk. By default it's 100.
   * @param {String} [anchor] Most early message id which is already known, or 'end' by default
   * @returns {Promise<Paginator<Message>>} last page of messages by default
   * @private
   */
  _getMessages(pageSize, anchor, direction) {
    anchor = (typeof anchor !== 'undefined') ? anchor : 'end';
    pageSize = pageSize || 30;
    let order = direction === 'backwards' ? 'desc' : 'asc';

    if (anchor !== 'end') { pageSize++; }

    return this.subscribe()
      .then(messagesList => messagesList.getItems({ from: anchor !== 'end' ? anchor : void (0), pageSize, order }))
      .then(page => {
        if (anchor !== 'end') {
          if (isForward(direction)) { page.items.shift(); }
          else { page.items.pop(); }
        }
        return page;
      })
      .then(page => this._wrapPaginator(page
                        , items => Promise.all(items.map(item => this._upsertMessage(item.index, item.value))))
      );
  }
}

module.exports = Messages;
