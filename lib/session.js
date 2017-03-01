'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuid = require('uuid');
var platform = require('platform');

var log = require('./logger').scope('Session');
var ChangeTracker = require('./util/changetracker');
var SessionError = require('./sessionerror');

var Durational = require('durational');

var SDK_VERSION = require('./../package.json').version;
var SESSION_PURPOSE = 'com.twilio.rtd.ipmsg';

/**
*  Constructs the instance of Session
*
*  @classdesc Provides the interface to send the command to the server
*  It is reliable, which means that it tracks the command object state
*  and waits the answer from the server.
*/

var Session = function () {
  function Session(sync, transport, config) {
    var _this = this;

    (0, _classCallCheck3.default)(this, Session);

    console.log('navigator ----> ', navigator);

    var platformInfo = typeof navigator !== 'undefined' ? platform.parse(navigator.userAgent) : platform;
    // let platformInfo = {
    //   os: 'iOS',
    //   name: 'ReactNative',
    //   version: '0.41.2'
    // }

    (0, _defineProperties2.default)(this, {
      _endpointPlatform: {
        value: ['js', SDK_VERSION, platformInfo.os, platformInfo.name, platformInfo.version].join('|')
      },
      _pendingCommands: { value: new _map2.default() },
      _sessionContextChangeTracker: { value: new ChangeTracker() },
      _sessionStreamPromise: { value: null, writable: true },
      _config: { value: config },
      _token: { value: null, writable: true },
      _tokenSynced: { value: true, writable: true },
      identity: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.identity;
        } },
      userInfo: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.userInfo;
        } },
      reachabilityEnabled: { enumerable: true, get: function get() {
          return _this._sessionContextChangeTracker._data.reachabilityEnabled;
        } },
      datasync: { enumerable: true, value: sync },
      transport: { value: transport }
    });
  }

  (0, _createClass3.default)(Session, [{
    key: 'initialize',
    value: function initialize(token) {
      var _this2 = this;

      this._token = token;
      this._tokenSynced = false;
      var context = {
        type: 'IpMsgSession',
        apiVersion: '3',
        endpointPlatform: this._endpointPlatform,
        token: token
      };

      this._sessionStreamPromise = this.datasync.list({ purpose: SESSION_PURPOSE, context: context }).then(function (list) {
        log.info('Session created', list.sid);
        _this2._tokenSynced = true;

        list.on('itemAdded', function (item) {
          return _this2._processCommandResponse(item);
        });
        list.on('itemUpdated', function (item) {
          return _this2._processCommandResponse(item);
        });
        list.on('contextUpdated', function (updatedContext) {
          log.info('Session context updated');
          log.debug('new session context:', updatedContext);
          _this2._sessionContextChangeTracker.update(updatedContext);
        });

        return list;
      }).catch(function (err) {
        log.error('Failed to create session', err);
        throw err;
      });
      return this._sessionStreamPromise;
    }

    /**
     * Sends the command to the server
     * @returns Promise the promise, which is being fulfilled only when service will reply
     */

  }, {
    key: 'addCommand',
    value: function addCommand(action, params) {
      return this._processCommand(action, params);
    }

    /**
     * @private
     */

  }, {
    key: '_processCommand',
    value: function _processCommand(action, params) {
      var _this3 = this;

      var command = { request: params };
      command.request.action = action;
      command.commandId = uuid.v4();

      log.info('Adding command: ', action, command.commandId);
      log.debug('command arguments:', params);

      return new _promise2.default(function (resolve, reject) {
        _this3._sessionStreamPromise.then(function (list) {
          _this3._pendingCommands.set(command.commandId, { resolve: resolve, reject: reject });
          return list.push(command);
        }).then(function () {
          return log.debug('Command accepted by server', command.commandId);
        }).catch(function (err) {
          _this3._pendingCommands.delete(command.commandId);
          log.error('Failed to add a command to the session', err);
          reject(new Error('Can\'t add command: ' + err.description));
        });
      });
    }

    /**
     * @private
     */

  }, {
    key: '_processCommandResponse',
    value: function _processCommandResponse(entity) {
      if (entity.value.hasOwnProperty('response') && entity.value.hasOwnProperty('commandId') && this._pendingCommands.has(entity.value.commandId)) {
        var value = entity.value;
        var commandId = entity.value.commandId;
        if (value.response.status === 200) {
          log.debug('Command succeeded: ', value);
          var resolve = this._pendingCommands.get(commandId).resolve;
          this._pendingCommands.delete(commandId);
          resolve(value.response);
        } else {
          log.error('Command failed: ', value);
          var reject = this._pendingCommands.get(commandId).reject;
          this._pendingCommands.delete(commandId);
          reject(new SessionError(value.response.statusText, value.response.status));
        }
      }
    }
  }, {
    key: 'updateToken',
    value: function updateToken(token) {
      this._token = token;
      this._tokenSynced = false;
      return this.syncToken();
    }
  }, {
    key: 'syncToken',
    value: function syncToken() {
      var _this4 = this;

      if (this._tokenSynced) {
        return _promise2.default.resolve();
      }

      return this._sessionStreamPromise.then(function (list) {
        return list.getContext().then(function (context) {
          context.token = _this4._token;
          return list.updateContext(context);
        }).then(function () {
          _this4._tokenSynced = true;
        });
      }).catch(function (err) {
        log.error('Couldn\'t update the token in session context', err);
        throw new Error(err);
      });
    }
  }, {
    key: 'onKeyUpdated',
    value: function onKeyUpdated(path, handler) {
      this._sessionContextChangeTracker.addEventHandler('keyAdded', path, handler);
      this._sessionContextChangeTracker.addEventHandler('keyUpdated', path, handler);
    }
  }, {
    key: 'getSessionLinks',
    value: function getSessionLinks() {
      var _this5 = this;

      return new _promise2.default(function (resolve) {
        _this5._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('links')) {
            resolve(context.links);
          } else {
            _this5.onKeyUpdated('/links', function () {
              _this5._sessionStreamPromise.then(function (list) {
                return list.getContext();
              }).then(function (ctx) {
                return resolve(ctx.links);
              });
            });
          }
        });
      }).then(function (links) {
        return {
          publicChannelsUrl: _this5._config.baseUrl + links.publicChannelsUrl,
          myChannelsUrl: _this5._config.baseUrl + links.myChannelsUrl,
          typingUrl: _this5._config.baseUrl + links.typingUrl
        };
      });
    }
  }, {
    key: 'getChannelsId',
    value: function getChannelsId() {
      var _this6 = this;

      return new _promise2.default(function (resolve) {
        _this6._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('channelsUrl')) {
            resolve(context.channels);
          } else {
            _this6.onKeyUpdated('/channels', resolve);
          }
        });
      });
    }
  }, {
    key: 'getMyChannelsId',
    value: function getMyChannelsId() {
      var _this7 = this;

      return new _promise2.default(function (resolve) {
        _this7._sessionStreamPromise.then(function (list) {
          return list.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('myChannels')) {
            resolve(context.myChannels);
          } else {
            _this7.onKeyUpdated('/myChannels', resolve);
          }
        });
      });
    }
  }, {
    key: 'getUserInfosData',
    value: function getUserInfosData() {
      var _this8 = this;

      return new _promise2.default(function (resolve) {
        function resolveWithData(context) {
          resolve({
            userInfo: context.userInfo,
            identity: context.identity
          });
        }

        _this8._sessionStreamPromise.then(function (stream) {
          return stream.getContext();
        }).then(function (context) {
          if (context.hasOwnProperty('userInfo')) {
            resolveWithData(context);
          } else {
            _this8.onKeyUpdated('/userInfo', function () {
              _this8._sessionStreamPromise.then(function (stream) {
                return stream.getContext();
              }).then(function (updatedContext) {
                return resolveWithData(updatedContext);
              });
            });
          }
        });
      });
    }
  }, {
    key: 'getConsumptionReportInterval',
    value: function getConsumptionReportInterval() {
      var _this9 = this;

      return this._sessionStreamPromise.then(function (stream) {
        return stream.getContext();
      }).then(function (context) {
        return Durational.fromString(context.consumptionReportInterval || _this9._config.consumptionReportInterval);
      });
    }
  }]);
  return Session;
}();

module.exports = Session;