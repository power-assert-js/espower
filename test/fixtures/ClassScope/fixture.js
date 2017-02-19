'use strict';

const assert = require('assert');

class Dog {
    say() {
        return 'bow';
    }
}

const d = new Dog();
assert(d.say());
