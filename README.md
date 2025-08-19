barnacles
=========

__barnacles__ processes a real-time stream of ambient RF decodings into an efficient representation of "_what_ is _where_ and _how_" as standard developer-friendly JSON that is vendor/technology/application-agnostic.

![Overview of barnacles](https://reelyactive.github.io/barnacles/images/overview.png)

__barnacles__ ingests and outputs a real-time stream of [raddec](https://github.com/reelyactive/raddec/) objects, and can be coupled with [advlib](https://github.com/reelyactive/advlib/) packet processors to additionally interpret _dynamb_ (dynamic ambient), _statid_ (static ID) and _relay_ data for each device.

__barnacles__ is a lightweight [Node.js package](https://www.npmjs.com/package/barnacles) that can run on resource-constrained edge devices as well as on powerful cloud servers and anything in between.  It is included in reelyActive's [Pareto Anywhere](https://www.reelyactive.com/pareto/anywhere/) open source IoT middleware suite where it maintains an in-memory snapshot of the [hyperlocal context](https://www.reelyactive.com/context/) data structure for consumption by API modules, and distribution by [barnacles-x modules](#how-to-distribute-data).


Getting Started
---------------

Follow our step-by-step tutorials to get started with __Pareto Anywhere__, which includes __barnacles__, on the platform of your choice:
- [Run Pareto Anywhere on a personal computer](https://reelyactive.github.io/diy/pareto-anywhere-pc/)
- [Run Pareto Anywhere on a Raspberry Pi](https://reelyactive.github.io/diy/pareto-anywhere-pi/)

Learn "owl" about the __raddec__ and __dynamb__ JSON data output:
-  [reelyActive Developer's Cheatsheet](https://reelyactive.github.io/diy/cheatsheet/)


Quick start
-----------

Clone this repository, install package dependencies with `npm install`, and then from the root folder run at any time:

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
barnacles.on('raddec', (raddec) => {
  console.log(raddec);
});
barnacles.on('dynamb', (dynamb) => {
  console.log(dynamb);
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

As well as [dynamb](https://reelyactive.github.io/diy/cheatsheet/#dynamb) objects similar to the following:

```javascript
{
  deviceId: "001bc50940810000",
  deviceIdType: 1,
  numberOfReceivedDevices: 42,
  numberOfStrongestReceivedDevices: 21,
  timestamp: 1547693457133
}
```

Regardless of the underlying RF protocol and hardware, the [raddec](https://github.com/reelyactive/raddec/) specifies _what_ (transmitterId) is _where_ (receiverId & rssi), as well as _how_ (packets) and _when_ (timestamp).  __barnacles__ adds an _events_ property which indicates what has notably changed in the most recent radio decoding(s).


C'est-tu tout que ta barnacles peut faire?
------------------------------------------

The silly Québécois title aside (we couldn't resist the temptation), although __barnacles__ and __barnowl__ together may suffice for simple event-driven applications, functionality can be greatly extended with the following software packages:
- [advlib](https://github.com/reelyactive/advlib) to decode the individual packets from hexadecimal strings into JSON
- [chickadee](https://github.com/reelyactive/chickadee) to provide a /context API by associating structured, linked data with the devices identified in the radio decodings
- [barterer](https://github.com/reelyactive/barterer) to provide a /devices API


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

Packet decoding is a prerequisite for _dynamb_ and _relay_ events and _statid_ data, with the exception of Electronic Product Code (EPC) data which is automatically decoded as _statid_ data by __barnacles__ using [advlib-epc](https://github.com/reelyactive/advlib-epc).


How to distribute data?
-----------------------

__barnacles__ is an EventEmitter which means that software can listen for _raddec_, _dynamb_ and _relay_ events.  To facilitate distribution over a network, __barnacles__ interfaces with a number of complementary software packages to keep the code as lightweight and modular as possible.  The following table lists all these interface packages which integrate seamlessly with __barnacles__ in just two lines of code.

| Interface package                                                | Provides |
|:-----------------------------------------------------------------|:---------|
| [barnacles-webhook](https://github.com/reelyactive/barnacles-webhook) | Webhook (event-driven HTTP POST) |
| [barnacles-websocket](https://github.com/reelyactive/barnacles-websocket) | WebSocket server |
| [barnacles-socketio](https://github.com/reelyactive/barnacles-socketio) | socket.io push API |
| [barnacles-mqtt](https://github.com/reelyactive/barnacles-mqtt) | MQTT |
| [barnacles-sparkplug](https://github.com/reelyactive/barnacles-sparkplug) | Sparkplug (MQTT) |
| [barnacles-opcua](https://github.com/reelyactive/barnacles-opcua) | OPC-UA |
| [barnacles-logfile](https://github.com/reelyactive/barnacles-logfile) | Write raddec & dynamb events to a local logfile |
| [barnacles-postgres](https://github.com/reelyactive/barnacles-postgres) | PostgreSQL database interface |
| [barnacles-influxdb2](https://github.com/reelyactive/barnacles-influxdb2) | InfluxDB 2 database interface |
| [barnacles-elasticsearch](https://github.com/reelyactive/barnacles-elasticsearch) | Elasticsearch database interface |
| [barnacles-tds](https://github.com/reelyactive/barnacles-tds) | SQL Server (Tabular Data Stream) |
| [barnacles-agora](https://github.com/reelyactive/barnacles-agora) | Agora Software interface |
| [barnacles-wiliot](https://github.com/reelyactive/barnacles-wiliot) | Relay IoT Pixel payloads to the Wiliot Cloud |

See our [Create a Pareto Anywhere startup script](https://reelyactive.github.io/diy/pareto-anywhere-startup-script/) tutorial for detailed instructions on including any of the above interface packages with a [pareto-anywhere](https://github.com/reelyactive/pareto-anywhere) deployment, or consult the examples below for a standalone __barnacles__ deployment.

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
| disappearanceMilliseconds        | 15000 | How long to wait before a device is considered to have disappeared (and also how long to retain dynamb data). |
| observedEvents         | [ 0, 1, 2, 3 ] | Index list of the event types to emit |
| acceptStaleRaddecs     | false   | Accept raddecs with a timestamp more than historyMilliseconds in the past? (timestamp gets adjusted to current time) |
| acceptFutureRaddecs    | true    | Accept raddecs with a timestamp in the future? (timestamp gets adjusted to current time) |
| barnowl                | null    | barnowl instance providing source data |
| inputFilterParameters  | {}      | Filter on inbound raddecs (see [raddec-filter](https://github.com/reelyactive/raddec-filter)) |
| outputFilterParameters | {}      | Filter on outbound raddecs (see [raddec-filter](https://github.com/reelyactive/raddec-filter)) |
| packetProcessors       | []      | Processors for packet data (see [advlib](https://github.com/reelyactive/advlib)) |
| packetInterpreters     | []    | Interpreters for packet data (see [advlib](https://github.com/reelyactive/advlib)) |
| protocolSpecificDataProcessors | [] | Processors for protocol-specific data (see [advlib](https://github.com/reelyactive/advlib)) |
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


Modular Architecture
--------------------

__barnacles__ is easily combined with the following complementary software modules:
- [barnowl](https://github.com/reelyactive/barnowl)
- [barterer](https://github.com/reelyactive/barterer)
- [chickadee](https://github.com/reelyactive/chickadee)
- [chimps](https://github.com/reelyactive/chimps)
- [advlib](https://github.com/reelyactive/advlib)

Learn more about the [reelyActive Open Source Software packages](https://reelyactive.github.io/diy/oss-packages/), all of which are bundled together as [Pareto Anywhere](https://github.com/reelyactive/pareto-anywhere) open source IoT middleware.


Contributing
------------

Discover [how to contribute](CONTRIBUTING.md) to this open source project which upholds a standard [code of conduct](CODE_OF_CONDUCT.md).


Security
--------

Consult our [security policy](SECURITY.md) for best practices using this open source software and to report vulnerabilities.


License
-------

MIT License

Copyright (c) 2014-2025 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

