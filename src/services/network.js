'use strict';

class Network {
  constructor(config, session, transport) {
    Object.defineProperties(this, {
      _config: { value: config },
      _transport: { value: transport },
      _session: { value: session },
      _cacheLifetime: { value: config.httpCacheLifetime, writable: true },

      _cache: { value: new Map() },
      _timer: { value: null, writable: true }
    });
  }

  _isExpired(timestamp) {
    return !this._cacheLifetime || (Date.now() - timestamp) > this._cacheLifetime;
  }

  _cleanupCache() {
    for (let [k, v] of this._cache) {
      if (this._isExpired(v.timestamp)) {
        this._cache.delete(k);
      }
    }

    if (this._cache.size === 0) {
      clearTimeout(this._timer);
    }
  }

  _pokeTimer() {
    this._timer = this._timer || setInterval(() => this._cleanupCache(), this._cacheLifetime * 2);
  }

  get(url) {
    let cacheEntry = this._cache.get(url);
    if (cacheEntry && !this._isExpired(cacheEntry.timestamp)) {
      return Promise.resolve(cacheEntry.response);
    }

    const headers = { 'X-Twilio-Token': this._config.token };
    return this._transport.get(url, headers)
      .then(response => {
        this._cache.set(url, { response, timestamp: Date.now() });
        this._pokeTimer();
        return response;
      });
  }
}

module.exports = Network;
