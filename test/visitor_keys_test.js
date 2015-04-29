'use strict';

var espower = require('..');
var assert = require('assert');

//// original code of jsx_test.json:
// var React = require('react/addons');
// var TestUtils = React.addons.TestUtils;
// var assert = require('power-assert');
// it('CheckboxWithLabel', function() {
//     var CheckboxWithLabel = require('../src/CheckboxWithLabel.js');
//     var checkbox = TestUtils.renderIntoDocument(
//         <CheckboxWithLabel labelOn="On" labelOff="Off"/>
//     );
//     var label = TestUtils.findRenderedDOMComponentWithTag(
//         checkbox, 'label'
//     );
//     assert(label.getDOMNode().textContent === 'Off');
//     var input = TestUtils.findRenderedDOMComponentWithTag(
//         checkbox, 'input'
//     );
//     TestUtils.Simulate.change(input);
//     assert(label.getDOMNode().textContent === 'On');
// });
var ast = require('./jsx_test.json');

it('custom visitorKeys', function () {
    var visitorKeys = require('./visitor-keys.json');
    assert.doesNotThrow(function () {
        espower(ast, { visitorKeys: visitorKeys });
    });
});
