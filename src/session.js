'use strict';

const uuid = require('uuid');
const platform = require('platform');

const log = require('./logger').scope('Session');
const ChangeTracker = require('./util/changetracker');
const SessionError = require('./sessionerror');

const Durational = require('durational');

const SDK_VERSION = require('./../package.json').version;
const SESSION_PURPOSE = 'com.twilio.rtd.ipmsg';

/**
*  Constructs the instance of Session
*
*  @classdesc Provides the interface to send the command to the server
*  It is reliable, which means that it tracks the command object state
*  and waits the answer from the server.
*/
class Session {
  constructor(sync, transport, config) {
    console.log('navigator ----> ', navigator)

    let platformInfo = typeof navigator !== 'undefined' ?
        platform.parse(navigator.userAgent) : platform;
    // let platformInfo = {
    //   os: 'iOS',
    //   name: 'ReactNative',
    //   version: '0.41.2'
    // }

    Object.defineProperties(this, {
      _endpointPlatform: {
        value: [
          'js',
          SDK_VERSION,
          platformInfo.os,
          platformInfo.name,
          platformInfo.version
        ].join('|')
      },
      _pendingCommands: { value: new Map() },
      _sessionContextChangeTracker: { value: new ChangeTracker() },
      _sessionStreamPromise: { value: null, writable: true },
      _config: { value: config },
      _token: { value: null, writable: true },
      _tokenSynced: { value: true, writable: true },
      identity: { enumerable: true, get: () => this._sessionContextChangeTracker._data.identity },
      userInfo: { enumerable: true, get: () => this._sessionContextChangeTracker._data.userInfo },
      reachabilityEnabled: { enumerable: true, get: () => this._sessionContextChangeTracker._data.reachabilityEnabled },
      datasync: { enumerable: true, value: sync },
      transport: { value: transport }
    });
  }

  initialize(token) {
    this._token = token;
    this._tokenSynced = false;
    let context = {
      type: 'IpMsgSession',
      apiVersion: '3',
      endpointPlatform: this._endpointPlatform,
      token: token
    };

    this._sessionStreamPromise = this.datasync.list({ purpose: SESSION_PURPOSE, context })
      .then(list => {
        log.info('Session created', list.sid);
        this._tokenSynced = true;

        list.on('itemAdded', item => this._processCommandResponse(item));
        list.on('itemUpdated', item => this._processCommandResponse(item));
        list.on('contextUpdated', updatedContext => {
          log.info('Session context updated');
          log.debug('new session context:', updatedContext);
          this._sessionContextChangeTracker.update(updatedContext);
        });

      return list;
    }).catch(function(err) {
      log.error('Failed to create session', err);
      throw err;
    });
    return this._sessionStreamPromise;
  }

  /**
   * Sends the command to the server
   * @returns Promise the promise, which is being fulfilled only when service will reply
   */
  addCommand(action, params) {
    return this._processCommand(action, params);
  }

  /**
   * @private
   */
  _processCommand(action, params) {
    var command = { request: params };
    command.request.action = action;
    command.commandId = uuid.v4();

    log.info('Adding command: ', action, command.commandId);
    log.debug('command arguments:', params);

    return new Promise((resolve, reject) => {
      this._sessionStreamPromise.then(list => {
        this._pendingCommands.set(command.commandId, { resolve, reject });
        return list.push(command);
      })
      .then(() => log.debug('Command accepted by server', command.commandId))
      .catch(err => {
        this._pendingCommands.delete(command.commandId);
        log.error('Failed to add a command to the session', err);
        reject(new Error('Can\'t add command: ' + err.description));
      });
    });
  }

  /**
   * @private
   */
  _processCommandResponse(entity) {
    if (entity.value.hasOwnProperty('response') &&
        entity.value.hasOwnProperty('commandId') &&
        this._pendingCommands.has(entity.value.commandId))
    {
      const value = entity.value;
      const commandId = entity.value.commandId;
      if (value.response.status === 200) {
        log.debug('Command succeeded: ', value);
        let resolve = this._pendingCommands.get(commandId).resolve;
        this._pendingCommands.delete(commandId);
        resolve(value.response);
      } else {
        log.error('Command failed: ', value);
        let reject = this._pendingCommands.get(commandId).reject;
        this._pendingCommands.delete(commandId);
        reject(new SessionError(value.response.statusText, value.response.status));
      }
    }
  }

  updateToken(token) {
    this._token = token;
    this._tokenSynced = false;
    return this.syncToken();
  }

  syncToken() {
    if (this._tokenSynced) {
      return Promise.resolve();
    }

    return this._sessionStreamPromise.then(list => {
      return list.getContext().then(context => {
        context.token = this._token;
        return list.updateContext(context);
      })
      .then(() => {
        this._tokenSynced = true;
      });
    }).catch((err) => {
      log.error('Couldn\'t update the token in session context', err);
      throw new Error(err);
    });
  }

  onKeyUpdated(path, handler) {
    this._sessionContextChangeTracker.addEventHandler('keyAdded', path, handler);
    this._sessionContextChangeTracker.addEventHandler('keyUpdated', path, handler);
  }

  getSessionLinks() {
    return new Promise(resolve => {
      this._sessionStreamPromise.then(list => list.getContext()).then(context => {
        if (context.hasOwnProperty('links')) {
          resolve(context.links);
        } else {
          this.onKeyUpdated('/links', () => {
            this._sessionStreamPromise
              .then(list => list.getContext())
              .then(ctx => resolve(ctx.links));
          });
        }
      });
    })
    .then(links => ({
      publicChannelsUrl: this._config.baseUrl + links.publicChannelsUrl,
      myChannelsUrl: this._config.baseUrl + links.myChannelsUrl,
      typingUrl: this._config.baseUrl + links.typingUrl
    }));
  }

  getChannelsId() {
    return new Promise(resolve => {
      this._sessionStreamPromise.then(list => list.getContext()).then(context => {
        if (context.hasOwnProperty('channelsUrl')) {
          resolve(context.channels);
        } else {
          this.onKeyUpdated('/channels', resolve);
        }
      });
    });
  }

  getMyChannelsId() {
    return new Promise((resolve) => {
      this._sessionStreamPromise.then(list => list.getContext()).then(context => {
        if (context.hasOwnProperty('myChannels')) {
          resolve(context.myChannels);
        } else {
          this.onKeyUpdated('/myChannels', resolve);
        }
      });
    });
  }

  getUserInfosData() {
    return new Promise((resolve) => {
      function resolveWithData(context) {
        resolve({
          userInfo: context.userInfo,
          identity: context.identity
        });
      }

      this._sessionStreamPromise
        .then(stream => stream.getContext())
        .then(context => {
          if (context.hasOwnProperty('userInfo')) {
            resolveWithData(context);
          } else {
            this.onKeyUpdated('/userInfo', () => {
              this._sessionStreamPromise.then(stream => stream.getContext())
                .then(updatedContext => resolveWithData(updatedContext));
            });
          }
        });
    });
  }

  getConsumptionReportInterval() {
    return this._sessionStreamPromise
      .then(stream => stream.getContext())
      .then((context) => {
        return Durational.fromString(context.consumptionReportInterval || this._config.consumptionReportInterval);
      });
  }
}

module.exports = Session;
