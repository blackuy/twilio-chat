'use strict';

const UriBuilder = require('../util').UriBuilder;
const Paginator = require('../restpaginator');
const ChannelDescriptor = require('../channeldescriptor');

/**
 * Public channels collection
 * It's a cassandra-backed pull-based collection
 */
class PublicChannels {
  constructor(config, client, transport, url) {
    Object.defineProperties(this, {
      _config: { value: config },
      _client: { value: client },
      _transport: { value: transport },
      _url: { value: url }
    });
  }

  getChannels(args) {
    args = args || {};
    const url = new UriBuilder(this._url).arg('PageToken', args.pageToken).build();
    return this._transport.get(url)
      .then(response => response.body)
      .then(body => new Paginator(body.channels.map(x => new ChannelDescriptor(this._client, x))
                                 , pageToken => this.getChannels({ pageToken })
                                 , body.meta.prev_token
                                 , body.meta.next_token));
  }

  getChannelBySid(sid) {
    const url = new UriBuilder(this._url).path(sid).build();
    return this._transport.get(url)
      .then(response => response.body)
      .then(body => new ChannelDescriptor(this._client, body));
  }

  getChannelByUniqueName(sid) {
    const url = new UriBuilder(this._url).path(encodeURIComponent(sid)).build();
    return this._transport.get(url)
      .then(response => response.body)
      .then(body => new ChannelDescriptor(this._client, body));
  }
}

module.exports = PublicChannels;
