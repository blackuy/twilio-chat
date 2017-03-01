'use strict';

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
var UserInfo = require('../userinfo');

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