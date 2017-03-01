'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('../logger').scope('Members');

const Member = require('../member');

/**
 * @classdesc Represents the collection of members for the channel
 * @fires Members#memberJoined
 * @fires Members#memberLeft
 * @fires Members#memberUpdated
 * @fires Members#memberInfoUpdated
 */
class Members extends EventEmitter {
  constructor(channel, session, userInfos, members) {
    super();

    Object.defineProperties(this, {
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
  }

  unsubscribe() {
    return this._rosterStreamPromise ?
        this._rosterStreamPromise.then(entity => entity.close()) : Promise.resolve();
  }

  subscribe(rosterObjectName) {
    return this._rosterStreamPromise = this._rosterStreamPromise || this._datasync.map({ uniqueName: rosterObjectName, mode: 'open' })
      .then(rosterMap => {
        rosterMap.on('itemAdded', item => {
          this.upsertMember(item.key, item.value)
            .then(member => {
              this.emit('memberJoined', member);
            });
        });

        rosterMap.on('itemRemoved', memberSid => {
          if (!this.members.has(memberSid)) {
            return;
          }
          let leftMember = this.members.get(memberSid);
          this.members.delete(memberSid);
          this.emit('memberLeft', leftMember);
        });

        rosterMap.on('itemUpdated', item => {
          this.upsertMember(item.key, item.value);
        });

        let membersPromises = [];
        return rosterMap.forEach(item => {
          membersPromises.push(this.upsertMember(item.key, item.value));
        })
        .then(() => Promise.all(membersPromises))
        .then(() => rosterMap);
      })
      .catch(err => {
        this._rosterStreamPromise = null;
        log.error('Failed to get roster object for channel', this.channel.sid, err);
        throw err;
      });
  }

  upsertMember(memberSid, data) {
    let member = this.members.get(memberSid);
    if (member) {
      member._update(data);
      return Promise.resolve(member);
    }

    return this._userInfos.getUserInfo(data.identity, data.userInfo)
      .then(userInfo => {
        member = new Member(this.channel, data, memberSid, userInfo);
        this.members.set(memberSid, member);
        member.on('updated', () => this.emit('memberUpdated', member));
        member.on('userInfoUpdated', () => this.emit('memberInfoUpdated', member));
        return member;
      });
  }

  /**
   * @returns {Promise<Array<Member>>} returns list of members {@see Member}
   */
  getMembers() {
    return this._rosterStreamPromise.then(() => {
      var members = [];
      this.members.forEach((member) => members.push(member));
      return members;
    });
  }

  /**
   * Add user to the channel
   * @returns {Promise<|SessionError>}
   */
  add(username) {
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
  invite(username) {
    return this._session.addCommand('inviteMember', {
      channelSid: this.channel.sid,
      username: username
    });
  }

  /**
   * Remove user from channel
   * @returns {Promise<|SessionError>}
   */
  remove(username) {
    return this._session.addCommand('removeMember', {
      channelSid: this.channel.sid,
      username: username
    });
  }
}

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

