'use strict';

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var UriBuilder = require('../util').UriBuilder;
var Paginator = require('../restpaginator');
var ChannelDescriptor = require('../channeldescriptor');

/**
 * Public channels collection
 * It's a cassandra-backed pull-based collection
 */

var PublicChannels = function () {
  function PublicChannels(config, client, transport, url) {
    (0, _classCallCheck3.default)(this, PublicChannels);

    (0, _defineProperties2.default)(this, {
      _config: { value: config },
      _client: { value: client },
      _transport: { value: transport },
      _url: { value: url }
    });
  }

  (0, _createClass3.default)(PublicChannels, [{
    key: 'getChannels',
    value: function getChannels(args) {
      var _this = this;

      args = args || {};
      var url = new UriBuilder(this._url).arg('PageToken', args.pageToken).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new Paginator(body.channels.map(function (x) {
          return new ChannelDescriptor(_this._client, x);
        }), function (pageToken) {
          return _this.getChannels({ pageToken: pageToken });
        }, body.meta.prev_token, body.meta.next_token);
      });
    }
  }, {
    key: 'getChannelBySid',
    value: function getChannelBySid(sid) {
      var _this2 = this;

      var url = new UriBuilder(this._url).path(sid).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new ChannelDescriptor(_this2._client, body);
      });
    }
  }, {
    key: 'getChannelByUniqueName',
    value: function getChannelByUniqueName(sid) {
      var _this3 = this;

      var url = new UriBuilder(this._url).path(encodeURIComponent(sid)).build();
      return this._transport.get(url).then(function (response) {
        return response.body;
      }).then(function (body) {
        return new ChannelDescriptor(_this3._client, body);
      });
    }
  }]);
  return PublicChannels;
}();

module.exports = PublicChannels;