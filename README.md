barnacles
=========


A real-time location & sensor data aggregator for the IoT
---------------------------------------------------------

__barnacles__ consume real-time spatio-temporal information about wireless devices and emit notification events based on changes such as appearances, displacements and disappearances.  __barnacles__ receive this information stream from [barnowl](https://www.npmjs.com/package/barnowl) and other __barnacles__ instances, and maintain the current state of all detected devices.  __barnacles__ ensure that contextual information propagates efficiently from a local to a global scale in the Internet of Things.

__In the scheme of Things (pun intended)__

The [barnowl](https://www.npmjs.com/package/barnowl), __barnacles__, [barterer](https://www.npmjs.com/package/barterer) and [chickadee](https://www.npmjs.com/package/chickadee) packages all work together as a unit, conveniently bundled as [hlc-server](https://www.npmjs.com/package/hlc-server).  Check out our [developer page](https://reelyactive.github.io/) for more resources on reelyActive software and hardware.

![barnacles logo](https://reelyactive.github.io/barnacles/images/barnacles-bubble.png)


What's in a name?
-----------------

As [Wikipedia so eloquently states](http://en.wikipedia.org/wiki/Barnacle#Sexual_reproduction), "To facilitate genetic transfer between isolated individuals, __barnacles__ have extraordinarily long penises."  And given the current state of isolation of nodes in today's IoT, this package (pun intended) needs "the largest penis to body size ratio of the animal kingdom".

Also, we hope the name provides occasions to overhear our Québecois colleagues say things like "Tu veux tu configurer ta barnacle!?!"


Installation
------------

    npm install barnacles

__barnacles__ are tightly coupled with [barnowl](https://www.npmjs.com/package/barnowl), our IoT middleware package.  The latter provides a source of data to the former, as the following example will show. 


Hello barnacles & barnowl
-------------------------

```javascript
const Barnacles = require('barnacles');
const Barnowl = require('barnowl');

let barnowl = new Barnowl();
barnowl.addListener(Barnowl, {}, Barnowl.TestListener, {});

let barnacles = new Barnacles({ barnowl: barnowl });
```


What's next?
------------

The reelyActive team is currently overhauling barnacles for a v1.0.0 release. This is very much an active work in progress. If you're developing with barnacles check out:
* [diyActive](https://reelyactive.github.io/) our developer page
* our [node-style-guide](https://github.com/reelyactive/node-style-guide) for development
* our [contact information](https://www.reelyactive.com/contact/) to get in touch if you'd like to contribute


License
-------

MIT License

Copyright (c) 2014-2018 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.

