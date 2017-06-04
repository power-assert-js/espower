'use strict';

var assert = require('power-assert');

describe('Array', function () {
    beforeEach(function () {
        this.ary = [1,2,3];
    });
    describe('#indexOf()', function () {
        it('should return index when the value is present', function () {
            var who = 'ariya', two = 2;
            assert(this.ary.indexOf(who) === two);
        });
        it('should return -1 when the value is not present', function () {
            var minusOne = -1, two = 2;
            assert.ok(this.ary.indexOf(two) === minusOne, 'THIS IS AN ASSERTION MESSAGE');
        });
    });
    it('#length', function () {
        var four = 4;
        assert.equal(this.ary.length, four);
    });
    it('#length assertion with message', function () {
        var four = 4;
        assert.equal(this.ary.length, four, 'THIS IS AN ASSERTION MESSAGE');
    });
});
