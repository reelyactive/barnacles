barnacles
=========


What's in a name?
-----------------

barnacles consume spatio-temporal data concerning wireless devices and emit notification events based on changes such as appearances, displacements and disappearances.  barnacles ensure that contextual information propagates efficiently from a local to a global scale in the Internet of Things.  Why the name?  As [Wikipedia so eloquently states](http://en.wikipedia.org/wiki/Barnacle#Sexual_reproduction), "To facilitate genetic transfer between isolated individuals, barnacles have extraordinarily long penises."  And given the current state of isolation of nodes in today's IoT, this package (pun intended) needs "the largest penis to body size ratio of the animal kingdom".

Also, we hope the name provides occasions to overhear our Québecois colleagues say things like "Tu veux tu configurer ta barnacle!?!"

Check out our [developer page](http://reelyactive.github.io/) for more resources on our software and hardware.


Installation
------------

    npm install barnacles

barnacles are tightly coupled with [barnowl](https://www.npmjs.org/package/barnowl), our IoT middleware package.  The latter provides a source of data to the former, as the following example will show. 


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
```

When the above code is run, you should see output to the console similar to the following:

    001bc50940100000 has appeared on 001bc50940800000
    fee150bada55 has appeared on 001bc50940810000
    001bc50940100000 has displaced to 001bc50940800001
    fee150bada55 has displaced to 001bc50940810001
    ...


Querying the current state
--------------------------

It is possible to query the current state of barnacles.  Currently only one query is supported, and this query is based on the identifier values of either wireless transmitters and/or receivers.  For example, the following query would be suitable for the Hello barnacles & barnowl example above.

```javascript
notifications.getState( { ids: ["001bc50940100000", "001bc50940800000"] },
                        function(state) { console.log(state) } );
```

This query would return via the callback all current events which have one of the given ids as either:
- their own identifier value
- the identifier value of one of their decoders

In the latter case, the radio decodings of the event are omitted from the results.  The results of the above query would resemble the following:

    {
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
              "value": "001bc50940800001"
            }
          }
        ]
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

__Google Universal Analytics__

barnacles can send notifications to [Google's Universal Analytics platform](http://www.google.ca/analytics/) such that a wireless device being detected by a sensor is analagous to a user hitting a webpage.  In other words, imagine a physical location as a website, and the "invisible buttons" are webpages.  A wireless device moving through that space triggering invisible buttons is equivalent to a user browsing a website.  And it's all possible in one line of code:

```javascript
notifications.addService( { service: "google",
                            hostname: "http://hlc-server.url",
                            accountId: "UA-XXXXXXXX-X" } );
```
 
The optional _hostname_ can be used to specify the URL of an hlc-server instance.  This could be useful if you want to collect both physical and online "hits" of the same resource.  The _accountId_ is provided by Google when you set up Google Analytics Reporting.

The pageview path is recorded as /id/receiverID where the receiverID would for instance be 001bc50940800001.  Each wireless device is given a UUID and CID based on its identifier which allows tracking so long as the identifier does not change.

Note that you'll first need to manually install the universal-analytics package for this service:

    npm install universal-analytics


Options
-------

The following options are supported when instantiating barnacles (those shown are the defaults):

    {
      disappearanceMilliseconds: 10000
    }

Notes:
- none


What's next?
------------

This is an active work in progress.  Expect regular changes and updates, as well as improved documentation!


License
-------

MIT License

Copyright (c) 2014 reelyActive

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

