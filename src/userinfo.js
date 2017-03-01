'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('./logger').scope('UserInfo');

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
class UserInfo extends EventEmitter {
  constructor(identity, entityName, datasync, session) {
    super();
    this.setMaxListeners(0);

    Object.defineProperties(this, {
      _datasync: { value: datasync },
      _session: { value: session },
      _identity: { value: identity, writable: true },
      _entityName: { value: entityName, writable: true },
      _attributes: { value: {}, writable: true },
      _friendlyName: { value: null, writable: true },
      _online: { value: null, writable: true },
      _notifiable: { value: null, writable: true },
      _promiseToFetch: { writable: true },

      identity: { enumerable: true, get: () => this._identity },
      attributes: { enumerable: true, get: () => this._attributes },
      friendlyName: { enumerable: true, get: () => this._friendlyName },
      online: { enumerable: true, get: () => this._online },
      notifiable: { enumerable: true, get: () => this._notifiable }
    });
  }

  // Handles service updates
  _update(key, value) {
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
  _updateReachabilityInfo(map, update) {
    if (!this._session.reachabilityEnabled) {
      return Promise.resolve();
    }

    return map.get('reachability')
      .then(update)
      .catch(err => { log.warn('Failed to get reachability info for ', this._identity, err); });
  }

  // Fetch user info
  _fetch() {
    if (!this._entityName) {
      return Promise.resolve(this);
    }

    let update = item => this._update(item.key, item.value);
    this._promiseToFetch = this._datasync.map({ uniqueName: this._entityName, mode: 'open' }).then(map => {
      map.on('itemUpdated', update);
      return Promise.all([
        map.get('friendlyName').then(update),
        map.get('attributes').then(update),
        this._updateReachabilityInfo(map, update)
      ]);
    })
    .then(() => {
      log.debug('Fetched for', this.identity);
      return this;
    })
    .catch(err => {
      this._promiseToFetch = null;
      throw err;
    });
    return this._promiseToFetch;
  }

  _ensureFetched() {
    return this._promiseToFetch || this._fetch();
  }

  /**
   * Update the UserInfo's attributes.
   * @param {Object} attributes - The new attributes object.
   * @returns {Promise<UserInfo|SessionError>} A Promise for the UserInfo
   */
  updateAttributes(attributes) {
    if (attributes.constructor !== Object)  {
      throw new Error('Attributes must be an object.');
    }

    return this._session.addCommand('editUserAttributes', {
      username: this._identity,
      attributes: JSON.stringify(attributes)
    }).then(() => this);
  }

  /**
   * Update the Users's friendlyName.
   * @param {String} name - The new friendlyName.
   * @returns {Promise<UserInfo|SessionError>} A Promise for the UserInfo
   */
  updateFriendlyName(friendlyName) {
    return this._session.addCommand('editUserFriendlyName', {
      username: this._identity,
      friendlyName: friendlyName
    }).then(() => this);
  }
}

/**
 * Fired when the UserInfo's fields have been updated.
 * @param {String} reason - Name of the property which has changed
 * @event UserInfo#updated
 */

module.exports = UserInfo;
