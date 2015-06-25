barnacles
=========


A real-time location & sensor data aggregator for the IoT
---------------------------------------------------------

barnacles consume spatio-temporal data regarding wireless devices and emit notification events based on changes such as appearances, displacements and disappearances.  barnacles collect this real-time information from [barnowl](https://www.npmjs.com/package/barnowl) and other barnacles instances, and maintain the current state of all detected devices.  barnacles ensure that contextual information propagates efficiently from a local to a global scale in the Internet of Things.  barnacles can notify third-party services such as Google Analytics via a REST API.

__In the scheme of Things (pun intended)__

The [barnowl](https://www.npmjs.com/package/barnowl), barnacles, [barterer](https://www.npmjs.com/package/barterer) and [chickadee](https://www.npmjs.com/package/chickadee) packages all work together as a unit, conveniently bundled as [hlc-server](https://www.npmjs.com/package/hlc-server).  Check out our [developer page](http://reelyactive.github.io/) for more resources on reelyActive software and hardware.


![barnacles logo](http://reelyactive.com/images/barnacles.jpg)


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

notifications.on('appearance', function(tiraid) {
  console.log(tiraid.identifier.value + " has appeared on "
              + tiraid.radioDecodings[0].identifier.value);
});

notifications.on('displacement', function(tiraid) {
  console.log(tiraid.identifier.value + " has displaced to "
              + tiraid.radioDecodings[0].identifier.value);
});

notifications.on('disappearance', function(tiraid) {
  console.log(tiraid.identifier.value + " has disappeared from "
              + tiraid.radioDecodings[0].identifier.value);
});

notifications.on('keep-alive', function(tiraid) {
  console.log(tiraid.identifier.value + " remains at "
              + tiraid.radioDecodings[0].identifier.value);
});
```

When the above code is run, you should see output to the console similar to the following:

    001bc50940100000 has appeared on 001bc50940800000
    fee150bada55 has appeared on 001bc50940810000
    001bc50940100000 has displaced to 001bc50940800001
    fee150bada55 has displaced to 001bc50940810001
    ...


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

Create an event.  This includes a tiraid and an event type, the latter being one of the following:
- appearance
- displacement
- disappearance
- keep-alive

For instance, an _appearance_ of transmitting device id _2c0ffeeb4bed_ on receiving device id _001bc50940810000_ would be created with a POST /events including the following JSON:

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

barnacles can send notifications to another barnacles instance.  This way the remote barnacles instance is aware of the local state.  For instance to send notifications to a barnacles instance hosted at www.remotebarnacles.com:

```javascript
notifications.addService( { service: "barnaclesrest",
                            hostname: "www.remotebarnacles.com",
                            port: 80,
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```

In the case above, only notifications relative to the two whitelisted devices will be sent.  To send notifications for all devices, omit the whitelist property.

### Google Universal Analytics

barnacles can send notifications to [Google's Universal Analytics platform](http://www.google.ca/analytics/) such that a wireless device being detected by a sensor is analagous to a user hitting a webpage.  In other words, imagine a physical location as a website, and the "invisible buttons" are webpages.  A wireless device moving through that space triggering invisible buttons is equivalent to a user browsing a website.  And it's all possible in one line of code:

```javascript
notifications.addService( { service: "google",
                            hostname: "http://hlc-server.url",
                            accountId: "UA-XXXXXXXX-X",
                            whitelist: [ "001bc50940800000", "001bc50940810000" ] } );
```
 
The optional _hostname_ can be used to specify the URL of an hlc-server instance.  This could be useful if you want to collect both physical and online "hits" of the same resource.  The _accountId_ is provided by Google when you set up Google Analytics Reporting.  The optional _whitelist_ limits the notifications to those with tiraids containing one or more of the given receiver ids.

The pageview path is recorded as /id/receiverID where the receiverID would for instance be 001bc50940800001.  Each wireless device is given a UUID and CID based on its identifier which allows tracking so long as the identifier does not change.


Options
-------

The following options are supported when instantiating barnacles (those shown are the defaults):

    {
      httpPort: 3005,
      useCors: false,
      disappearanceMilliseconds: 10000,
      keepAliveMilliseconds: 5000
    }

Notes:
- none


What's next?
------------

This is an active work in progress.  Expect regular changes and updates, as well as improved documentation!  If you're developing with barnacles check out:
* [diyActive](http://reelyactive.github.io/) our developer page
* our [node-style-guide](https://github.com/reelyactive/node-style-guide) for development
* our [contact information](http://context.reelyactive.com/contact.html) to get in touch if you'd like to contribute


License
-------

MIT License

Copyright (c) 2014-2015 reelyActive

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

