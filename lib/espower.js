/**
 * espower.js - Power Assert feature instrumentor based on the Mozilla JavaScript AST.
 *
 * https://github.com/twada/espower
 *
 * Copyright (c) 2013 Takuto Wada
 * Licensed under the MIT license.
 *   https://raw.github.com/twada/espower/master/MIT-LICENSE.txt
 *
 * A part of traverse function is:
 *   Copyright (C) 2012, 2011 Ariya Hidayat <ariya.hidayat@gmail.com> and other contributors.
 *   Released under the BSD license.
 *   https://github.com/ariya/esprima/raw/master/LICENSE.BSD
 *
 * A part of deepCopy function is:
 *   Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com> and other contributors.
 *   Released under the BSD license.
 *   https://github.com/Constellation/esmangle/raw/master/LICENSE.BSD
 *
 * A part of extend function is:
 *   Copyright 2012 jQuery Foundation and other contributors
 *   Released under the MIT license.
 *   http://jquery.org/license
 */
(function (root, factory) {
    'use strict';

    // using returnExports UMD pattern
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.espower = factory();
    }
}(this, function () {
    'use strict';


    var deepCopy,
        SUPPORTED_NODE_TYPES = [
            'Identifier',
            'MemberExpression',
            'CallExpression',
            'BinaryExpression',
            'UnaryExpression',
            'ConditionalExpression',
            'LogicalExpression',
            'ArrayExpression',
            'AssignmentExpression',
            'UpdateExpression'
            //// unsupported expressions
            // 'FunctionExpression',
            // 'NewExpression',
            // 'ObjectExpression',
            // 'RegularExpression',
            // 'SequenceExpression',
            // 'ThisExpression',
        ];


    function defaultOptions () {
        return {
            destructive: false,
            powerAssertVariableName: 'assert'
        };
    }


    /**
     * Instrument power assert feature into code. Mozilla JS AST in, Mozilla JS AST out.
     * @param ast JavaScript Mozilla JS AST to instrument (directly modified if destructive option is truthy)
     * @param options
     * @return instrumented AST
     */
    function espower (ast, options) {
        var instrumentor;
        options = extend(defaultOptions(), (options || {}));
        ensurePrerequisites(ast, options);
        instrumentor = new SourceInstrumentor(options);
        return instrumentor.instrument(ast);
    }


    function ensurePrerequisites (ast, options) {
        ensureLocationExists(ast, options);
        ensureSourceExists(options);
    }

    function ensureLocationExists (ast, options) {
        var errorMessage;
        if (typeof ast.loc === 'undefined') {
            errorMessage = 'JavaScript AST should contain location information.';
            if (options.path) {
                errorMessage += ' path: ' + options.path;
            }
            throw new Error(errorMessage);
        }
    }

    function ensureSourceExists (options) {
        if (! options.source) {
            throw new Error('Target source code content should be specified by options.source.');
        }
    }


    function SourceInstrumentor (options) {
        this.options = options;
        this.lines = options.source.split('\n');
    }

    SourceInstrumentor.prototype.instrument = function (ast) {
        var that = this,
            result = (this.options.destructive) ? ast : deepCopy(ast);
        traverse(result, function (node) {
            var expression;
            if (typeof node.type === 'undefined') {
                return;
            }
            if (node.type === 'ExpressionStatement') {
                expression = node.expression;
            } else if (node.type === 'ReturnStatement') {
                expression = node.argument;
            } else {
                return;
            }
            if (expression.type !== 'CallExpression') {
                return;
            }
            if (!(isInstrumentationTarget(expression.callee, that.options))) {
                return;
            }
            that.instrumentExpression(expression, that.options);
        });
        return result;
    };

    SourceInstrumentor.prototype.instrumentExpression = function (callExpression, options) {
        var targetNode = callExpression.arguments[0],
            instrumentor;
        if (!isSupportedNodeType(targetNode)) {
            return;
        }
        instrumentor = new LineInstrumentor(this.retrieveLineFor(callExpression), options);
        callExpression.arguments[0] = instrumentor.instrument(targetNode);
    };

    SourceInstrumentor.prototype.retrieveLineFor = function (callExpression) {
        var lineNumber = callExpression.loc.start.line;
        return this.lines[lineNumber - 1];
        // if (typeof callExpression.raw !== 'undefined') {
        //     return callExpression.raw;
        // }
    };


    function LineInstrumentor (line, options) {
        this.line = line;
        this.path = options.path;
        this.powerAssertVariableName = options.powerAssertVariableName;
    }

    LineInstrumentor.prototype.instrument = function (node) {
        var that = this,
            loc = that.locationOf(node),
            modifiedTree = that.captureRecursively(node);
        return that.captureAssertion(modifiedTree, loc);
    };

    LineInstrumentor.prototype.captureRecursively = function (node) {
        switch (node.type) {
        case 'Identifier':
            return this.captureIdentifier(node);
        case 'MemberExpression':
            return this.captureMemberExpression(node);
        case 'CallExpression':
            return this.captureCallExpression(node);
        case 'UnaryExpression':
            return this.captureUnaryExpression(node);
        case 'BinaryExpression':
            return this.captureBinaryExpression(node);
        case 'LogicalExpression':
            return this.captureLogicalExpression(node);
        case 'AssignmentExpression':
            return this.captureAssignmentExpression(node);
        case 'ArrayExpression':
            return this.captureArrayExpression(node);
        case 'ConditionalExpression':
            return this.captureConditionalExpression(node);
        case 'UpdateExpression':
            return this.captureUpdateExpression(node);
        default:
            return node;
        }
    };

    LineInstrumentor.prototype.captureIdentifier = function (target, location) {
        return this.captureNode('ident', target, (location || this.locationOf(target)));
    };

    LineInstrumentor.prototype.captureMemberExpression = function (node) {
        var propLocation = this.propertyLocationOf(node);
        node.object = this.captureRecursively(node.object);
        if (node.computed) {
            node.property = this.captureRecursively(node.property);
        }
        return this.captureIdentifier(node, propLocation);
    };

    LineInstrumentor.prototype.captureCallExpression = function (node) {
        var that = this;
        node.arguments = node.arguments.map(function (arg) {
            return that.captureRecursively(arg);
        });
        if (node.callee.type === 'MemberExpression') {
            node.callee.object = that.captureRecursively(node.callee.object);
            return that.captureNode('funcall', node, that.propertyLocationOf(node.callee));
        } else {
            return that.captureNode('funcall', node, that.locationOf(node));
        }
    };

    LineInstrumentor.prototype.captureUnaryExpression = function (node) {
        if ((node.operator === 'typeof' || node.operator === 'delete') && node.argument.type === 'Identifier') {
            // 'typeof Identifier' or 'delete Identifier' is not instrumented
        } else {
            node.argument = this.captureRecursively(node.argument);
        }
        return this.captureNode('unary', node, this.locationOf(node));
    };

    LineInstrumentor.prototype.captureBinaryExpression = function (node) {
        return this.captureExpressionWithInfixOperator(node, 'binary');
    };

    LineInstrumentor.prototype.captureLogicalExpression = function (node) {
        return this.captureExpressionWithInfixOperator(node, 'logical');
    };

    LineInstrumentor.prototype.captureAssignmentExpression = function (node) {
        return this.captureExpressionWithInfixOperator(node, 'assignment');
    };

    LineInstrumentor.prototype.captureArrayExpression = function (node) {
        var that = this;
        node.elements = node.elements.map(function (elem) {
            return that.captureRecursively(elem);
        });
        return node;
    };

    LineInstrumentor.prototype.captureConditionalExpression = function (node) {
        node.test = this.captureRecursively(node.test);
        node.consequent = this.captureRecursively(node.consequent);
        node.alternate = this.captureRecursively(node.alternate);
        return node;
    };

    LineInstrumentor.prototype.captureUpdateExpression = function (node) {
        return this.captureNode('update', node, this.locationOf(node));
    };

    LineInstrumentor.prototype.captureExpressionWithInfixOperator = function (expression, kind) {
        // BK: need to detect operator location before left/right instrumentation
        var infixOperatorLocation = this.infixOperatorLocationOf(expression);
        if (kind !== 'assignment') {
            // Do not instrument left due to 'Invalid left-hand side in assignment'
            expression.left = this.captureRecursively(expression.left);
        }
        expression.right = this.captureRecursively(expression.right);
        return this.captureNode(kind, expression, infixOperatorLocation);
    };

    // calculate property location of MemberExpression.
    LineInstrumentor.prototype.propertyLocationOf = function (memberExpression) {
        var that = this,
            n = newNodeWithLocationCopyOf(memberExpression),
            newLocation,
            computed = memberExpression.computed,
            prop = memberExpression.property,
            propertyIndex,
            propLocation,
            columnObjectLiteralNode;
        if (typeof prop.loc !== 'undefined') {
            propLocation = that.locationOf(prop);
            if (computed) {
                columnObjectLiteralNode = propLocation.properties[0].value.properties[1].value;
                columnObjectLiteralNode.value -= 1;
            }
            return propLocation;
        } else if (typeof memberExpression.loc !== 'undefined') { // non-computed MemberExpression under CoffeeScriptRedux
            propertyIndex = that.line.indexOf(prop.name, memberExpression.loc.start.column);
            if (propertyIndex === -1) {
                throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + that.line + ' col: ' + memberExpression.loc.start.column);
            }
            newLocation = n({});
            newLocation.loc.start = {
                line: memberExpression.loc.start.line,
                column: propertyIndex
            };
            return that.locationOf(newLocation);
        } else {
            throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + that.line);
        }
    };

    // calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
    LineInstrumentor.prototype.infixOperatorLocationOf = function (expression) {
        var that = this,
            n = newNodeWithLocationCopyOf(expression),
            newLocation,
            endOfLeftColumn,
            operatorStartColumn,
            operatorIndex;

        if (expression.left.loc.end && expression.left.loc.end.column) { // esprima
            endOfLeftColumn = expression.left.loc.end.column;
        } else if (expression.left.range) { // CoffeeScriptRedux
            endOfLeftColumn = expression.left.loc.start.column + (expression.left.range[1] - expression.left.range[0]);
        } else {
            throw new Error('Cannot detect operator location: ' + expression.operator + ' line: ' + that.line);
        }
        operatorStartColumn = endOfLeftColumn + 1;

        if (that.line) {
            operatorIndex = that.line.indexOf(expression.operator, endOfLeftColumn);
            if (operatorIndex !== -1) {
                operatorStartColumn = operatorIndex;
            }
        }
        newLocation = n({});
        newLocation.loc.start = {
            line: expression.left.loc.start.line,
            column: operatorStartColumn
        };
        return that.locationOf(newLocation);
    };

    LineInstrumentor.prototype.captureAssertion = function (node, location) {
        var n = newNodeWithLocationCopyOf(node),
            exprArgs = [node, location];
        if (this.line) {
            exprArgs.push(n({
                type: 'Literal',
                value: this.line
            }));
        }
        if (this.path) {
            location.properties.push(n({
                type: 'Property',
                key: n({
                    type: 'Identifier',
                    name: 'path'
                }),
                value: n({
                    type: 'Literal',
                    value: this.path
                }),
                kind: 'init'
            }));
        }
        return n({
            type: 'CallExpression',
            callee: n({
                type: 'MemberExpression',
                computed: false,
                object: n({
                    type: 'Identifier',
                    name: this.powerAssertVariableName
                }),
                property: n({
                    type: 'Identifier',
                    name: '_expr'
                })
            }),
            arguments: exprArgs
        });
    };

    LineInstrumentor.prototype.captureNode = function (kind, target, location) {
        var n = newNodeWithLocationCopyOf(target);
        return n({
            type: 'CallExpression',
            callee: n({
                type: 'MemberExpression',
                computed: false,
                object: n({
                    type: 'Identifier',
                    name: this.powerAssertVariableName
                }),
                property: n({
                    type: 'Identifier',
                    name: '_capt'
                })
            }),
            arguments: [
                target,
                n({
                    type: 'Literal',
                    value: kind
                }),
                location
            ]
        });
    };

    LineInstrumentor.prototype.locationOf = function (node) {
        var n = newNodeWithLocationCopyOf(node);
        return n({
            type: 'ObjectExpression',
            properties: [
                n({
                    type: 'Property',
                    key: n({
                        type: 'Identifier',
                        name: 'start'
                    }),
                    value: n({
                        type: 'ObjectExpression',
                        properties: [
                            n({
                                type: 'Property',
                                key: n({
                                    type: 'Identifier',
                                    name: 'line'
                                }),
                                value: n({
                                    type: 'Literal',
                                    value: node.loc.start.line
                                }),
                                kind: 'init'
                            }),
                            n({
                                type: 'Property',
                                key: n({
                                    type: 'Identifier',
                                    name: 'column'
                                }),
                                value: n({
                                    type: 'Literal',
                                    value: node.loc.start.column
                                }),
                                kind: 'init'
                            })
                        ]
                    }),
                    kind: 'init'
                })
            ]
        });
    };


    function newNodeWithLocationCopyOf (original) {
        return function (newNode) {
            if (typeof original.loc !== 'undefined') {
                newNode.loc = deepCopy(original.loc);
            }
            if (typeof original.range !== 'undefined') {
                newNode.range = deepCopy(original.range);
            }
            return newNode;
        };
    }

    function detectTargetMemberExpression (callee, objName, propName) {
        if (callee.type !== 'MemberExpression' || callee.computed !== false) {
            return false;
        }
        var obj = callee.object,
            prop = callee.property;
        return ((obj.type === 'Identifier' && obj.name === objName) && (prop.type === 'Identifier' && prop.name === propName));
    }

    function isAssertOkCall (callee, options) {
        return detectTargetMemberExpression(callee, options.powerAssertVariableName, 'ok');
    }

    function isAssertCall (callee, options) {
        return (callee.type === 'Identifier' && callee.name === options.powerAssertVariableName);
    }

    function isInstrumentationTarget (callee, options) {
        return isAssertCall(callee, options) || isAssertOkCall(callee, options);
    }

    function isSupportedNodeType (node) {
        return SUPPORTED_NODE_TYPES.indexOf(node.type) !== -1;
    }


    // borrowed from esprima example
    // Executes visitor on the object and its children (recursively).
    function traverse(object, visitor) {
        var key, child;

        if (visitor.call(null, object) === false) {
            return;
        }
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                child = object[key];
                if (typeof child === 'object' && child !== null) {
                    traverse(child, visitor);
                }
            }
        }
    }


    // borrowed from esmangle
    deepCopy = (function () {
        var deepCopyInternal,
            isArray = Array.isArray;
        if (!isArray) {
            isArray = function isArray(array) {
                return Object.prototype.toString.call(array) === '[object Array]';
            };
        }
        deepCopyInternal = function (obj, result) {
            var key, val;
            for (key in obj) {
                if (key.lastIndexOf('__', 0) === 0) {
                    continue;
                }
                if (obj.hasOwnProperty(key)) {
                    val = obj[key];
                    if (typeof val === 'object' && val !== null) {
                        if (val instanceof RegExp) {
                            val = new RegExp(val);
                        } else {
                            val = deepCopyInternal(val, isArray(val) ? [] : {});
                        }
                    }
                    result[key] = val;
                }
            }
            return result;
        };
        return function (obj) {
            return deepCopyInternal(obj, isArray(obj) ? [] : {});
        };
    })();


    // borrowed from qunit.js
    function extend (a, b) {
        var prop;
        for (prop in b) {
            if (b.hasOwnProperty(prop)) {
                if (typeof b[prop] === 'undefined') {
                    delete a[prop];
                } else {
                    a[prop] = b[prop];
                }
            }
        }
        return a;
    }


    // using returnExports UMD pattern with substack pattern
    espower.deepCopy = deepCopy;
    espower.traverse = traverse;
    espower.defaultOptions = defaultOptions;
    return espower;
}));
