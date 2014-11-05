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

middleware.bind( { protocol: 'udp', path: '192.168.1.101:50000' } ); // See barnowl

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

When the above code is run with a valid (and active) data stream as input to barnowl, you should see output to the console similar to the following:

    001bc50940100000 has appeared on 001bc50940800000
    001bc50940100000 has displaced to 001bc50940800001
    001bc50940100000 has disappeared from 001bc50940800001


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

