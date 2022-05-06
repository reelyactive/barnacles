barnacles
=========


Efficient data aggregator/distributor for RFID, RTLS and M2M
------------------------------------------------------------

__barnacles__ aggregates a real-time stream of radio decodings.  Based on changes in packet data (M2M) or location (RTLS) for each device, __barnacles__ produces an event.  The compressed radio decoding data can then be distributed over a network or consumed locally, as required.

![barnacles overview](https://reelyactive.github.io/barnacles/images/barnacles-overview.png)

__barnacles__ ingests and outputs a real-time stream of [raddec](https://github.com/reelyactive/raddec/) objects which facilitate any and all of the following applications:
- RFID: _what_ is present, based on the device identifier?
- RTLS: _where_ is it relative to the receiving devices?
- M2M: _how_ is its status, based on any payload included in the packet?

__barnacles__ can be coupled with [advlib](https://github.com/reelyactive/raddec/) packet processors to additionally interpret _dynamb_ (dynamic ambient), _statid_ (static ID) and _relay_ data for each device.

__barnacles__ is a lightweight [Node.js package](https://www.npmjs.com/package/barnacles) that can run on resource-constrained edge devices as well as on powerful cloud servers and anything in between.  It is typically connected with a [barnowl](https://github.com/reelyactive/barnowl/) instance which sources real-time radio decodings from an underlying hardware layer.  Together these packages are core components of [Pareto Anywhere](https://getpareto.com) open source software of the [reelyActive technology platform](https://www.reelyactive.com/technology/).


Installation
------------

    npm install barnacles


Quick start
-----------

    npm start

__barnacles__ will listen for raddec UDP packets on port 50001 and print the aggregated raddec output to the console.


Hello barnacles & barnowl
-------------------------

```javascript
const Barnowl = require('barnowl');
const Barnacles = require('barnacles');

let barnowl = new Barnowl();
barnowl.addListener(Barnowl, {}, Barnowl.TestListener, {}); // Source of data

let barnacles = new Barnacles({ barnowl: barnowl });
barnacles.on('raddec', function(raddec) {
  console.log(raddec);
});
```

As output you should see a stream of [raddec](https://github.com/reelyactive/raddec/) objects similar to the following:

```javascript
{
  transmitterId: "001122334455",
  transmitterIdType: 2,
  rssiSignature:
   [ { receiverId: "001bc50940810000",
       receiverIdType: 1,
       numberOfDecodings: 1,
       rssi: -60 },
     { receiverId: "001bc50940810001",
       receiverIdType: 1,
       numberOfDecodings: 1,
       rssi: -66 } ],
  packets: [ "061b55443322110002010611074449555520657669746341796c656572" ],
  timestamp: 1547693457133,
  events: [ 0 ]
}
```

Regardless of the underlying RF protocol and hardware, the [raddec](https://github.com/reelyactive/raddec/) specifies _what_ (transmitterId) is _where_ (receiverId & rssi), as well as _how_ (packets) and _when_ (timestamp).  __barnacles__ adds an _events_ property which indicates what has notably changed in the most recent radio decoding(s).


C'est-tu tout que ta barnacles peut faire?
------------------------------------------

The silly Québécois title aside (we couldn't resist the temptation), although __barnacles__ and __barnowl__ together may suffice for simple event-driven applications, functionality can be greatly extended with the following software packages:
- [advlib](https://github.com/reelyactive/advlib) to decode the individual packets from hexadecimal strings into JSON
- [chickadee](https://github.com/reelyactive/chickadee) to associate structured, linked data with the devices identified in the radio decodings


How to decode packets?
----------------------

__barnacles__ can accept packet processors, libraries and interpreters to decode raw packet data and trigger events in consequence.  For instance, instantiate __barnacles__ with all of the __advlib__ modules as follows:

```javascript
let options = {
    packetProcessors: [ { processor: require('advlib-ble'),
                          libraries: [ require('advlib-ble-services'),
                                       require('advlib-ble-manufacturers') ],
                          options: { ignoreProtocolOverhead: true,
                                     indices: [ require('sniffypedia') ] } } ],
    packetInterpreters: [ require('advlib-interoperable') ]
};

let barnacles = new Barnacles(options);
```

Packet decoding is a prerequisite for _dynamb_ and _relay_ events and _statid_ data.


How to distribute data?
-----------------------

__barnacles__ is an EventEmitter which means that software can listen for _'raddec'_ events.  To facilitate distribution over a network, __barnacles__ interfaces with a number of complementary software packages to keep the code as lightweight and modular as possible.  The following table lists all these interface packages which integrate seamlessly with __barnacles__ in just two lines of code.

| Interface package                                                       | Provides |
|:------------------------------------------------------------------------|:---------|
| [barnacles-socketio](https://github.com/reelyactive/barnacles-socketio) | socket.io push API |
| [barnacles-webhook](https://github.com/reelyactive/barnacles-webhook)   | Webhook (event-driven HTTP POST) |
| [barnacles-elasticsearch](https://github.com/reelyactive/barnacles-elasticsearch) | Elasticsearch database interface |

### Example: socket.io push API

```javascript
const Barnowl = require('barnowl');
const Barnacles = require('barnacles');
const BarnaclesSocketIO = require('barnacles-socketio'); // 1: Include the package

let barnowl = new Barnowl();
let barnacles = new Barnacles({ barnowl: barnowl });
barnowl.addListener(Barnowl, {}, Barnowl.TestListener, {});

// 2: Add the interface with relevant options
barnacles.addInterface(BarnaclesSocketIO, {});
```

### Example: Webhook

```javascript
const Barnowl = require('barnowl');
const Barnacles = require('barnacles');
const BarnaclesWebhook = require('barnacles-webhook'); // 1: Include the package

let barnowl = new Barnowl();
let barnacles = new Barnacles({ barnowl: barnowl });
barnowl.addListener(Barnowl, {}, Barnowl.TestListener, {});

// 2: Add the interface with relevant options
barnacles.addInterface(BarnaclesWebhook, { hostname: "127.0.0.1", port: 3000 });
```

### Example: Elasticsearch

```javascript
const Barnowl = require('barnowl');
const Barnacles = require('barnacles');
const BarnaclesElasticsearch = require('barnacles-elasticsearch'); // 1

let barnowl = new Barnowl();
let barnacles = new Barnacles({ barnowl: barnowl });
barnowl.addListener(Barnowl, {}, Barnowl.TestListener, {});

// 2: Add the interface with relevant options
barnacles.addInterface(BarnaclesElasticsearch, { host: "127.0.0.1:9200" });
```


Options
-------

__barnacles__ supports the following options:

| Property               | Default | Description                            | 
|:-----------------------|:--------|:---------------------------------------|
| delayMilliseconds      | 1000    | How long to wait for data to arrive from all possible sources before determining if an event occurred (introduces the given amount of latency) |
| minDelayMilliseconds   | 100     | Minimum time to wait between subsequent batches of event computation (gives the CPU a break) |
| decodingCompilationMilliseconds  | 2000 | On an event, combine rssiSignatures from raddecs up to this far in the past |
| packetCompilationMilliseconds    | 5000 | On an event, combine packets from raddecs up to this far in the past |
| historyMilliseconds    | 8000    | How long to consider historic spatio-temporal data before it is flushed from memory (if historyMilliseconds is less than keepAliveMilliseconds data may be lost) |
| keepAliveMilliseconds  | 5000    | How long to wait before triggering a keep-alive event in the absence of other events for a given transmitter. |
| observedEvents         | [ 0, 1, 2, 3 ] | Index list of the event types to emit |
| acceptStaleRaddecs     | false   | Accept raddecs with a timestamp more than historyMilliseconds in the past? (timestamp gets adjusted to current time) |
| acceptFutureRaddecs    | true    | Accept raddecs with a timestamp in the future? (timestamp gets adjusted to current time) |
| barnowl                | null    | barnowl instance providing source data |
| inputFilterParameters  | {}      | Filter on inbound raddecs (see [raddec-filter](https://github.com/reelyactive/raddec-filter)) |
| outputFilterParameters | {}      | Filter on outbound raddecs (see [raddec-filter](https://github.com/reelyactive/raddec-filter)) |
| packetProcessors       | {}      | Processors for packet data (see [advlib](https://github.com/reelyactive/advlib)) |
| packetInterpreters     | []    | Interpreters for packet data (see [advlib](https://github.com/reelyactive/advlib)) |
| dynambProperties       | { ... } | Packet properties to include in dynamb events |
| statidProperties       | { ... } | Packet properties to include as statid |


![barnacles logo](https://reelyactive.github.io/barnacles/images/barnacles-bubble.png)


What's in a name?
-----------------

As [Wikipedia so eloquently states](http://en.wikipedia.org/wiki/Barnacle#Sexual_reproduction), "To facilitate genetic transfer between isolated individuals, __barnacles__ have extraordinarily long penises."  And given the current state of isolation of nodes in today's IoT, this package (pun intended) needs "the largest penis to body size ratio of the animal kingdom".

Also, we hope the name provides occasions to overhear our Québécois colleagues say things like _"Tu veux tu configurer ta barnacle!?!"_


Project History
---------------

__barnacles__ v1.0.0 was released in January 2019, superseding all earlier versions, the latest of which remains available in the [release-0.4 branch](https://github.com/reelyactive/barnacles/tree/release-0.4) and as [barnacles@0.4.12 on npm](https://www.npmjs.com/package/barnacles/v/0.4.12).


Contributing
------------

Discover [how to contribute](CONTRIBUTING.md) to this open source project which upholds a standard [code of conduct](CODE_OF_CONDUCT.md).


Security
--------

Consult our [security policy](SECURITY.md) for best practices using this open source software and to report vulnerabilities.

[![Known Vulnerabilities](https://snyk.io/test/github/reelyactive/barnacles/badge.svg)](https://snyk.io/test/github/reelyactive/barnacles)


License
-------

MIT License

Copyright (c) 2014-2022 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

