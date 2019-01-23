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

__barnacles__ is a lightweight [Node.js package](https://www.npmjs.com/package/barnacles) that can run on resource-constrained edge devices as well as on powerful cloud servers and anything in between.  It is typically connected with a [barnowl](https://github.com/reelyactive/barnowl/) instance which sources real-time radio decodings from an underlying hardware layer.  Together these packages are core to the [reelyActive technology platform](https://www.reelyactive.com/technology/), which includes a wealth of complementary software and hardware.


Installation
------------

    npm install barnacles


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
  event: "appearance"
}
```

Regardless of the underlying RF protocol and hardware, the [raddec](https://github.com/reelyactive/raddec/) specifies _what_ (transmitterId) is _where_ (receiverId & rssi), as well as _how_ (packets) and _when_ (timestamp).  __barnacles__ adds an _event_ property which indicates what has notably changed in the most recent radio decoding(s).


C'est-tu tout que ta barnacles peut faire?
------------------------------------------

The silly Québécois title aside (we couldn't resist the temptation), although __barnacles__ and __barnowl__ together may suffice for simple event-driven applications, functionality can be greatly extended with the following software packages:
- [advlib](https://github.com/reelyactive/advlib) to decode the individual packets from hexadecimal strings into JSON
- [chickadee](https://github.com/reelyactive/chickadee) to associate structured, linked data with the devices identified in the radio decodings


How to distribute data?
-----------------------

__barnacles__ is an EventEmitter which means that software can listen for _'raddec'_ events.  To facilitate distribution over a network, __barnacles__ interfaces with a number of complementary software packages to keep the code as lightweight and modular as possible.  The following table lists all these interface packages which integrate seamlessly with __barnacles__ in just two lines of code.

| Interface package                                                       | Provides |
|:------------------------------------------------------------------------|:---------|
| [barnacles-socketio](https://github.com/reelyactive/barnacles-socketio) | socket.io push API |

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


Options
-------

__barnacles__ supports the following options:

| Property              | Default | Description                            | 
|:----------------------|:--------|:---------------------------------------|
| barnowl               | null    | barnowl instance providing source data |


![barnacles logo](https://reelyactive.github.io/barnacles/images/barnacles-bubble.png)


What's in a name?
-----------------

As [Wikipedia so eloquently states](http://en.wikipedia.org/wiki/Barnacle#Sexual_reproduction), "To facilitate genetic transfer between isolated individuals, __barnacles__ have extraordinarily long penises."  And given the current state of isolation of nodes in today's IoT, this package (pun intended) needs "the largest penis to body size ratio of the animal kingdom".

Also, we hope the name provides occasions to overhear our Québécois colleagues say things like _"Tu veux tu configurer ta barnacle!?!"_


What's next?
------------

The reelyActive team is currently overhauling barnacles for a v1.0.0 release. This is very much an active work in progress. If you're developing with barnacles check out:
* [diyActive](https://reelyactive.github.io/) our developer page
* our [node-style-guide](https://github.com/reelyactive/node-style-guide) for development
* our [contact information](https://www.reelyactive.com/contact/) to get in touch if you'd like to contribute


License
-------

MIT License

Copyright (c) 2014-2019 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

