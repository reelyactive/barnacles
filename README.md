barnacles
=========


A real-time location & sensor data aggregator for the IoT
---------------------------------------------------------

barnacles consume real-time spatio-temporal information about wireless devices and emit notification events based on changes such as appearances, displacements and disappearances.  barnacles receive this information stream from [barnowl](https://www.npmjs.com/package/barnowl) and other barnacles instances, and maintain the current state of all detected devices.  barnacles ensure that contextual information propagates efficiently from a local to a global scale in the Internet of Things.

barnacles can notify other barnacles and any third-party service that has a REST API.  [Currently supported platforms](#connecting-with-services) include Google Analytics and several proprietary IoT and analytics services.  And it's easy to [connect your service](#connecting-your-service) too.

__In the scheme of Things (pun intended)__

The [barnowl](https://www.npmjs.com/package/barnowl), barnacles, [barterer](https://www.npmjs.com/package/barterer) and [chickadee](https://www.npmjs.com/package/chickadee) packages all work together as a unit, conveniently bundled as [hlc-server](https://www.npmjs.com/package/hlc-server).  Check out our [developer page](http://reelyactive.github.io/) for more resources on reelyActive software and hardware.


![barnacles logo](http://reelyactive.github.io/barnacles/images/barnacles-bubble.png)


What's in a name?
-----------------

As [Wikipedia so eloquently states](http://en.wikipedia.org/wiki/Barnacle#Sexual_reproduction), "To facilitate genetic transfer between isolated individuals, barnacles have extraordinarily long penises."  And given the current state of isolation of nodes in today's IoT, this package (pun intended) needs "the largest penis to body size ratio of the animal kingdom".

Also, we hope the name provides occasions to overhear our Québecois colleagues say things like "Tu veux tu configurer ta barnacle!?!"


Installation
------------

    npm install barnacles

barnacles are tightly coupled with [barnowl](https://www.npmjs.com/package/barnowl), our IoT middleware package.  The latter provides a source of data to the former, as the following example will show. 


Hello barnacles & barnowl
-------------------------

```javascript
var barnacles = require('barnacles');
var barnowl = require('barnowl');

var notifications = new barnacles();
var middleware = new barnowl();

middleware.bind( { protocol: 'test', path: 'default' } ); // See barnowl

notifications.bind({ barnowl: middleware });

notifications.on('appearance', function(event) {
  console.log(event.deviceId + ' has appeared on ' + event.receiverId);
});

notifications.on('displacement', function(event) {
  console.log(event.deviceId + ' has displaced to ' + event.receiverId);
});

notifications.on('disappearance', function(event) {
  console.log(event.deviceId + ' has disappeared from ' + event.receiverId);
});

notifications.on('keep-alive', function(event) {
  console.log(event.deviceId + ' remains at ' + event.receiverId);
});
```

When the above code is run, you should see output to the console similar to the following:

    001bc50940100000 has appeared on 001bc50940800000
    fee150bada55 has appeared on 001bc50940810000
    001bc50940100000 has displaced to 001bc50940800001
    fee150bada55 has displaced to 001bc50940810001
    ...


Events
------

![events animation](http://reelyactive.github.io/images/service-events.gif)

The events in the example above have the following structure:

### Basic

Contains only the minimum required fields.

    {
      "event": "appearance",
      "time": 1420075425678,
      "deviceId": "fee150bada55",
      "receiverId": "001bc50940810000",
      "rssi": 150,
      "tiraid": { /* Included for legacy purposes only */ }
    }

### Contextual

Same as above, but adds metadata associated with both the device and the receiver.  Requires a connection to a chickadee instance (see [Where to bind?](#where-to-bind)).

    {
      "event": "appearance",
      "time": 1420075425678,
      "deviceId": "fee150bada55",
      "deviceAssociationIds": [],
      "deviceUrl": "http://myjson.info/stories/test",
      "deviceTags": [ 'test' ],
      "receiverId": "001bc50940810000",
      "receiverUrl": "http://sniffypedia.org/Product/reelyActive_RA-R436/",
      "receiverTags": [ 'test' ],
      "receiverDirectory": "test",
      "rssi": 150,
      "tiraid": { /* Included for legacy purposes only */ }
    }


RESTful interactions
--------------------

Include _Content-Type: application/json_ in the header of all interactions in which JSON is sent to barnacles.

### GET /statistics

Retrieve the latest real-time statistics.  The response will be as follows:

    {
      "_meta": {
        "message": "ok",
        "statusCode": 200
      },
      "_links": {
        "self": {
          "href": "http://localhost:3005/statistics"
        }
      },
      "statistics": {
        "devices": 2,
        "tiraids": 2,
        "appearances": 0,
        "displacements": 0,
        "disappearances": 0
      }
    }

where _devices_ is the number of devices in the current state and all other values are the average number of events per second in the last statistics period.

### POST /events

Create an event.  Each event includes a tiraid and an event type, the latter being one of the following:
- appearance
- displacement
- disappearance (ignored)
- keep-alive

For instance, if the event is an _appearance_ of transmitting device id _2c0ffeeb4bed_ on receiving device id _001bc50940810000_, the JSON would be as follows:

    { 
      "event": "appearance", 
      "tiraid": {
        "identifier": {
          "type": "ADVA-48",
          "value": "2c0ffeeb4bed",
          "advHeader": {
            "type": "SCAN_REQ",
            "length": 12,
            "txAdd": "public",
            "rxAdd": "public"
          },
          "advData": {}
        },
        "timestamp": "2015-01-01T01:23:45.678Z",
        "radioDecodings": [
          {
            "rssi": 169,
            "identifier": {
              "type": "EUI-64",
              "value": "001bc50940810000"
            }
          }
        ]
      }
    }

A successful response would be as follows:

    {
      "_meta": {
        "message": "ok",
        "statusCode": 200
      },
      "_links": {
        "self": {
          "href": "http://localhost:3005/events"
        }
      }
    }


Querying the current state
--------------------------

It is possible to query the current state of barnacles.  There are the following four query options:
- "transmittedBy" returns the transmissions by the devices with the given ids
- "receivedBy" returns every transmission received by the devices with the given ids
- "receivedStrongestBy" returns every transmission received strongest by the devices with the given ids
- "receivedBySame" returns every transmission received by the same devices which decoded the given ids

For example, based on the Hello barnacles & barnowl example above, the following would query the most recent _transmission_ by device 001bc50940100000:

```javascript
var options = { query: "transmittedBy",
                ids: ["001bc50940100000"] };
notifications.getState(options, function(state) { console.log(state) } );
```

The results of the above query might resemble the following:

    {
      "devices": {
        "001bc50940100000": {
          "identifier": {
            "type": "EUI-64",
            "value": "001bc50940100000",
            "flags": {
              "transmissionCount": 0
            }
          },
          "timestamp": "2014-01-01T12:34:56.789Z",
          "radioDecodings": [
            {
              "rssi": 135,
              "identifier": {
                "type": "EUI-64",
                "value": "001bc50940800000"
              }
            }
          ]
        }
      }
    }

It is possible to include an _omit_ option if either the timestamp, radioDecodings and/or identifier of the tiraid are not required.  For example to query which device transmissions are _received_ by devices 001bc50940800000 and 001bc50940810000, omitting their timestamp and radioDecodings:

```javascript
var options = { query: "receivedBy",
                ids: ["001bc50940800000", "001bc50940810000"],
                omit: ["timestamp", "radioDecodings"] };
notifications.getState(options, function(state) { console.log(state) } );
```

The results of the above query might resemble the following:

    {
      "devices": {
        "001bc50940100000": {
          "identifier": {
            "type": "EUI-64",
            "value": "001bc50940100000",
            "flags": {
              "transmissionCount": 0
            }
          }
        },
        "fee150bada55": {
          "identifier": {
            "type": "ADVA-48",
            "value": "fee150bada55",
            "advHeader": {
              "type": "ADV_NONCONNECT_IND",
              "length": 22,
              "txAdd": "random",
              "rxAdd": "public"
            },
            "advData": {
              "flags": [
                "LE Limited Discoverable Mode",
                "BR/EDR Not Supported"
              ],
              "completeLocalName": "reelyActive"
            }
          }
        }
      }
    }


Querying real-time statistics
-----------------------------

It is possible to query the latest real-time statistics as follows:

```javascript
notifications.getStatistics();
```

This query will return the following:

    { devices: 0,
      tiraids: 0,
      appearances: 0,
      displacements: 0,
      disappearances: 0 }

where _devices_ is the number of devices in the current state and all other values are the average number of events per second in the last statistics period.


Connecting with services
------------------------

It is possible to connect different services such that they receive the notifications via their API.  The following services are supported:

### Barnacles (via REST)

barnacles can POST notifications to another barnacles instance (or any other server) via REST.  This way the remote barnacles instance is aware of the local state.  For instance to POST notifications to a barnacles instance hosted at www.remotebarnacles.com:

```javascript
notifications.addService( { service: "barnaclesrest",
                            hostname: "www.remotebarnacles.com",
                            port: 80,
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

In the case above, only notifications relative to the two whitelisted devices will be POSTed.  To POST notifications for all devices, omit the whitelist property.  The default path is '/events'.

### Barnacles (via MQTT)

barnacles can publish notifications to another barnacles instance (or any other broker) via [MQTT](http://mqtt.org/).  This way the remote barnacles instance is aware of the local state.  For instance to publish notifications to a barnacles instance hosted at www.remotebarnacles.com:

```javascript
notifications.addService( { service: "barnaclesmqtt",
                            hostname: "www.remotebarnacles.com",
                            topic: "events"
                            clientOptions: { keepalive: 3600 },
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

In the case above, only notifications relative to the two whitelisted devices will be published.  To publish notifications for all devices, omit the whitelist property.  The default topic is 'events'.

This service requires the [mqtt](https://www.npmjs.com/package/mqtt) package which is _not_ listed as a dependency.  To use this service, you must manually install the package:

    npm install mqtt

### Websockets

barnacles can send notifications via websockets.  For instance to set up websockets on a namespace called _test_:

```javascript
notifications.addService( { service: "websocket",
                            namespace: "/test",
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

If the barnacles instance were to be running on localhost port 3005, the notification stream could be consumed at localhost:3005/test.

### Logfile

barnacles can write events as comma-separated values (CSV) to a local logfile.  For instance to write to a file called _eventlog_:

```javascript
notifications.addService( { service: "logfile",
                            logfileName: "eventlog",
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

The output file name will be, for example, _eventlog-160101012345.csv_, where the numeric portion is the date and timestamp when the file is created.

### Google Universal Analytics

barnacles can send notifications to [Google's Universal Analytics platform](http://www.google.ca/analytics/) such that a wireless device being detected by a sensor is analagous to a user hitting a webpage.  In other words, imagine a physical location as a website, and the "invisible buttons" are webpages.  A wireless device moving through that space triggering invisible buttons is equivalent to a user browsing a website.  And it's all possible in one line of code:

```javascript
notifications.addService( { service: "google",
                            hostname: "http://hlc-server.url",
                            accountId: "UA-XXXXXXXX-X",
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```
 
The optional _hostname_ can be used to specify the URL of an hlc-server instance.  This could be useful if you want to collect both physical and online "hits" of the same resource.  The _accountId_ is provided by Google when you set up Google Analytics Reporting.  The optional _whitelist_ limits the notifications to those with tiraids containing one or more of the given receiver ids.

The pageview path is recorded as /id/receiverID where the receiverID would for instance be 001bc50940800001.  Each wireless device is given a UUID and CID based on its identifier which allows tracking so long as the identifier does not change.

This service requires the [universal-analytics](https://www.npmjs.com/package/universal-analytics) package which is _not_ listed as a dependency.  To use this service, you must manually install the package:

    npm install universal-analytics

### Initial State

barnacles can send notifications to the [Initial State](https://www.initialstate.com/) platform.  This allows for infrastructure statistics to be logged and visualised.  For instance to stream reelceiver send counts to an Initial State bucket:

```javascript
notifications.addService( { service: "initialstate",
                            bucketType: "sendCount",
                            bucketKey: "Bucket Key",
                            accessKey: "Your-Access-Key-Here",
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

The data key is always the reelceiverId and the value depends on the bucketType.  Currently, the following bucketTypes are supported:
- uptimeSeconds
- sendCount
- crcPass
- crcFail
- maxRSSI
- avgRSSI
- minRSSI
- temperatureCelcius
- radioVoltage

This service requires the [initial-state](https://www.npmjs.com/package/initial-state) package which is _not_ listed as a dependency.  To use this service, you must manually install the package:

    npm install initial-state

### mnubo

barnacles can send notifications to the [mnubo](http://mnubo.com/) platform.  For instance to stream real-time events to mnubo:

```javascript
notifications.addService( { service: "mnubo",
                            clientId: "Your-ID-Here",
                            clientSecret: "Your-Secret-Here",
                            clientEnv: "sandbox",
                            ignoreInfrastructureTx: false,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

This service requires the [mnubo-sdk](https://www.npmjs.com/package/mnubo-sdk) package which is _not_ listed as a dependency.  To use this service, you must manually install the package:

    npm install mnubo-sdk


Connecting your service
-----------------------

Prefer instead to connect your own service to barnacles so that it receives a real-time stream of spatio-temporal events?  There's an easy way and there's an even easier way.  We'll start with the latter.

### Use the Barnacles REST service

The barnacles API is incredibly simple to copy, and we suggest that you set up an endpoint on your service that can ingest events from a POST request.  See [POST /events](#post-events) for the structure of the data you'll receive.  And then set up your barnacles instance to post to that service by configuring the hostname, port and path as explained [here](#barnacles-via-rest), for example:

```javascript
notifications.addService( { service: "barnaclesrest",
                            hostname: "www.myservice.com",
                            path: "/mypath" } );
```

### Create your own service within barnacles

If the barnacles API is unsuitable for your service, or if your service already has an npm package, it might be preferable to write your own service to add to the barnacles code base.  Inspire yourself from the existing services in the [lib/services](https://github.com/reelyactive/barnacles/tree/develop/lib/services) folder, and then [get in touch](http://context.reelyactive.com/contact.html) and/or make a pull request on the develop branch.


Where to bind?
--------------

### barnowl

[barnowl](https://www.npmjs.com/package/barnowl) provides a real-time stream of events.  barnacles can bind to multiple instances of barnowl.

```javascript
notifications.bind( { barnowl: middleware } );
```

### chickadee

[chickadee](https://www.npmjs.com/package/chickadee) provides a contextual associations store.  When bound, barnacles will append any contextual information from chickadee to the events it propagates.  barnacles can bind to a single instance of chickadee only.  Compatible with chickadee@0.3.24 and above.

```javascript
notifications.bind( { chickadee: associations } );
```


Options
-------

The following options are supported when instantiating barnacles (those shown are the defaults):

    {
      httpPort: 3005,
      useCors: false,
      delayMilliseconds: 1000,
      minDelayMilliseconds: 100,
      historyMilliseconds: 5000,
      disappearanceMilliseconds: 10000,
      keepAliveMilliseconds: 5000,
      enableMasterSocketForwarding: false
    }

Notes:
- delayMilliseconds specifies how long to wait for data to arrive from all possible sources before determining if an event occurred - note that this introduces the given amount of latency
- minDelayMilliseconds specifies the minimum time between successive batches of event calculations - this can be tweaked to reduce CPU load
- historyMilliseconds specifies how long to consider historic spatio-temporal data before it is flushed from memory - to avoid the possibility of data being ignored, ensure that _historyMilliseconds = keepAliveMilliseconds_
- disappearanceMilliseconds specifies how long to wait after the most recent decoding before considering the transmitting device as disappeared and removing the record from memory
- keepAliveMilliseconds specifies the maximum time between subsequent events for each transmitting device - if no displacement events occur, barnacles will emit a keep-alive notification every given period
- enableMasterSocketForwarding specifies whether all events are forwarded on the master websocket


What's next?
------------

This is an active work in progress.  Expect regular changes and updates, as well as improved documentation!  If you're developing with barnacles check out:
* [diyActive](http://reelyactive.github.io/) our developer page
* our [node-style-guide](https://github.com/reelyactive/node-style-guide) for development
* our [contact information](http://context.reelyactive.com/contact.html) to get in touch if you'd like to contribute


License
-------

MIT License

Copyright (c) 2014-2016 reelyActive

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

