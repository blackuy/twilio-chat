'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

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
var log = require('./logger').scope('UserInfo');

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