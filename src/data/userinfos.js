'use strict';

const EventEmitter = require('events').EventEmitter;
const UserInfo = require('../userinfo');

/**
 * @classdesc Container for known user infos
 * @fires UserInfos#userInfoUpdated
 */
class UserInfos extends EventEmitter {
  constructor(session, datasync) {
    super();

    let myUserInfo = new UserInfo(null, null, datasync, session);
    myUserInfo.on('updated', () => this.emit('userInfoUpdated', myUserInfo));

    Object.defineProperties(this, {
      _session: { value: session },
      _datasync: { value: datasync },
      _infos: { value: new Map() },
      _identity: { value: null, writable: true },

      myUserInfo: { enumerable: true, get: () => myUserInfo }
    });

    this._session.getUserInfosData()
      .then(data => {
        this._identity = data.identity;

        myUserInfo._identity = data.identity;
        myUserInfo._entityName = data.userInfo;
        this._infos.set(data.identity, myUserInfo);

        return myUserInfo._ensureFetched();
      });
  }

  /**
   * @returns {Promise<UserInfo>} Fully initialized user info for logged in user
   */
  getMyUserInfo() {
    return this._session.getUserInfosData()
      .then(data => this.getUserInfo(data.identity, data.userInfo));
  }

  /**
   * @returns {Promise<UserInfo>} Fully initialized user info
   */
  getUserInfo(identity, id) {
    let userInfo = this._infos.get(identity);
    if (!userInfo) {
      userInfo = new UserInfo(identity, id || null, this._datasync, this._session);
      this._infos.set(identity, userInfo);
      userInfo.on('updated', () => this.emit('userInfoUpdated', userInfo));
    }
    return userInfo._ensureFetched();
  }
}

module.exports = UserInfos;
