'use strict';

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
var log = require('../logger').scope('Members');

var Member = require('../member');

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