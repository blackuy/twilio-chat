'use strict';

const BASE_CHAT_URI = 'https://aim.twilio.com';
const TYPING_PATH = '/v1/typing';
const TYPING_TIMEOUT = 5;
const CONSUMPTION_HORIZON_SENDING_INTERVAL = 'PT5S';

class ChatConfig {
  constructor(token, options) {
    options = options || {};
    const _options = options.Chat || options.IPMessaging || {};
    const baseUri = _options.apiUri || _options.typingUri || BASE_CHAT_URI;

    const httpCacheLifetime = Number.isInteger(options.httpCacheLifetime) ? options.httpCacheLifetime
                                                                          : 10000;
    Object.defineProperties(this, {
      _token: { value: token, writable: true },

      token: { get: () => this._token, enumerable: true },
      baseUri: { value: baseUri },
      baseUrl: { value: baseUri },

      typingIndicatorUri: { enumerable: true,
                            value: baseUri + TYPING_PATH },
      typingIndicatorTimeout: { enumerable: true,
                                value: TYPING_TIMEOUT * 1000 },
      consumptionReportInterval: { enumerable: true,
                                   value: CONSUMPTION_HORIZON_SENDING_INTERVAL },
      httpCacheLifetime: { enumberable: true, value: httpCacheLifetime }
    });
  }

  updateToken(token) {
    this._token = token;
  }
}

module.exports = ChatConfig;
