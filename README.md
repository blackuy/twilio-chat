Twilio Chat client library
=============
Twilio Chat is a service for messages delivery over ip networks.
Visit our official site for more detalis: [https://www.twilio.com/chat](https://www.twilio.com/chat)


Instantiating and using
=============
To use the library you will need:
* generate a token
* create an instance of AccessManager class from twilio-common library.

```
var client = new Twilio.Chat.Client(token);
client.initialize()
  .then(function() {
    // Hey! I can start using a library!
  });
```


Consuming a library
=============
You can consume the library from NPM:
```
npm install twilio-chat
```

For browser you can use version from CDN:
```html
<script src="//media.twiliocdn.com/sdk/js/chat/v0.11/twilio-chat.min.js"></script>
```
