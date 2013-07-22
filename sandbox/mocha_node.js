var assert = require('power-assert');

describe('Array', function(){
  before(function(){
    this.ary = [1,2,3];
  });
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      var zero = 0, two = 2;
      assert(this.ary.indexOf(zero) === two, 'THIS IS A MESSAGE');
    });
    it('should return index when the value is present', function(){
      var minusOne = -1, two = 2;
      assert.ok(this.ary.indexOf(two) === minusOne, 'THIS IS A MESSAGE 2');
    });
  });
});