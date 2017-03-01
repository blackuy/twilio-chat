# Release how-to for IP Messaging JavaScript SDK 

### 1. create version
create git branch with version, i.e. x.y.x:

```
git checkout -b 0.9.3
```

### 2. alter package.json with correct version

commit correct version (for rc or simple release) in [package.json](https://code.hq.twilio.com/rtd/ipmessaging-js-lib/blob/master/package.json) to newly created git branch

```
...
package.json: "version": "0.9.3-rc1",
...
```

### 3. build release on build.corp.twilio.com
build release on [build.corp.twilio.com](https://build.corp.twilio.com/) for this branch *(NB! FOR THIS BRANCH AND NOT MASTER)*.
the release version for build should be just "rcN"
In the result there will be release build and git repo tagged with "release-x.y.x-rcN"

### 4. local build 
checkout the tag locally and do `npm install` and `gulp`

```
npm install
gulp
```

### 5. upload to dev with sdk-release-tool
use [sdk-release-tool](https://code.hq.twilio.com/client/sdk-release-tool/) to upload the artifact first on dev (with dry-run if you are cautios person):

```
./upload --dev --dry-run twilio-ip-messaging-js 0.9.3-rc1 /Users/aivanovs/Documents/js/ipmessaging-js-lib
./upload --dev twilio-ip-messaging-js 0.9.3-rc1 /Users/aivanovs/Documents/js/ipmessaging-js-lib
```

after upload please check the uploaded artifacts for correctness:

```
...
https://dev.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9.3-rc1/twilio-ip-messaging.js
https://dev.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9.3-rc1/docs/index.html
...
```

### 6. upload to stage/prod with sdk-release-tool
upload to stage/prod (depends on which steps are you) with the [sdk-release-tool](https://code.hq.twilio.com/client/sdk-release-tool/)

```
./upload --stage --dry-run twilio-ip-messaging-js 0.9.3-rc1 /Users/aivanovs/Documents/js/ipmessaging-js-lib
./upload --stage twilio-ip-messaging-js 0.9.3-rc1 /Users/aivanovs/Documents/js/ipmessaging-js-lib
```

after upload please check the uploaded artifacts for correctness:

```
...
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9.3-rc1/twilio-ip-messaging.js
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9.3-rc1/docs/index.html
...
```

### 7. pin with sdk-release-tool in stage/prod
pin new version with [sdk-release-tool](https://code.hq.twilio.com/client/sdk-release-tool/) (if needed, i.e. if it's release tool)
pin does link from newly updated version x.y.x to x.y

```
./pin --stage --dry-run twilio-ip-messaging-js 0.9.3
./pin --stage twilio-ip-messaging-js 0.9.3
```

after pinning verify that pinned links are working:

```
...
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9/twilio-ip-messaging.js
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9/docs/index.html
...
```

### 8. pin latest with sdk-release-tool in stage/prod
pin new version with [sdk-release-tool](https://code.hq.twilio.com/client/sdk-release-tool/) (if needed, i.e. if it's release tool)
pin-latest does link from newly updated version x.y.x to "latest"

```
./pin-latest --stage --dry-run twilio-ip-messaging-js 0.9.3
./pin-latest --stage twilio-ip-messaging-js 0.9.3
```

after pinning verify that pinned links are working:

```
...
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9/twilio-ip-messaging.js
https://stage.twiliocdn.com/sdk/rtc/js/ip-messaging/releases/0.9/docs/index.html
...
```
