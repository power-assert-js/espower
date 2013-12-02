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
        handlers = {
            Identifier: function (instrumentor, node) {
                return instrumentor.captureNode('ident', node, instrumentor.locationOf(node));
            },

            MemberExpression: function (instrumentor, node) {
                var propLocation = instrumentor.propertyLocationOf(node);
                node.object = instrumentor.captureRecursively(node.object);
                if (node.computed) {
                    node.property = instrumentor.captureRecursively(node.property);
                }
                return instrumentor.captureNode('ident', node, propLocation);
            },

            CallExpression: function (instrumentor, node) {
                node.arguments = node.arguments.map(function (arg) {
                    return instrumentor.captureRecursively(arg);
                });
                if (node.callee.type === 'MemberExpression') {
                    node.callee.object = instrumentor.captureRecursively(node.callee.object);
                    return instrumentor.captureNode('funcall', node, instrumentor.propertyLocationOf(node.callee));
                } else {
                    return instrumentor.captureNode('funcall', node, instrumentor.locationOf(node));
                }
            },

            UnaryExpression: function (instrumentor, node) {
                if ((node.operator === 'typeof' || node.operator === 'delete') && node.argument.type === 'Identifier') {
                    // 'typeof Identifier' or 'delete Identifier' is not instrumented
                } else {
                    node.argument = instrumentor.captureRecursively(node.argument);
                }
                return instrumentor.captureNode('unary', node, instrumentor.locationOf(node));
            },

            BinaryExpression: function (instrumentor, node) {
                return instrumentor.captureExpressionWithInfixOperator('binary', node);
            },

            LogicalExpression: function (instrumentor, node) {
                return instrumentor.captureExpressionWithInfixOperator('logical', node);
            },

            AssignmentExpression: function (instrumentor, node) {
                return instrumentor.captureExpressionWithInfixOperator('assignment', node);
            },

            ObjectExpression: function (instrumentor, node) {
                node.properties.forEach(function (prop) {
                    if (prop.type === 'Property' && prop.kind === 'init') {
                        prop.value = instrumentor.captureRecursively(prop.value);
                    }
                });
                return node;
            },

            NewExpression: function (instrumentor, node) {
                node.arguments = node.arguments.map(function (arg) {
                    return instrumentor.captureRecursively(arg);
                });
                return instrumentor.captureNode('new', node, instrumentor.locationOf(node));
            },

            ArrayExpression: function (instrumentor, node) {
                node.elements = node.elements.map(function (elem) {
                    return instrumentor.captureRecursively(elem);
                });
                return node;
            },

            ConditionalExpression: function (instrumentor, node) {
                node.test = instrumentor.captureRecursively(node.test);
                node.consequent = instrumentor.captureRecursively(node.consequent);
                node.alternate = instrumentor.captureRecursively(node.alternate);
                return node;
            },

            UpdateExpression: function (instrumentor, node) {
                return instrumentor.captureNode('update', node, instrumentor.locationOf(node));
            }

            //// unsupported expressions
            // FunctionExpression
            // RegularExpression
            // SequenceExpression
            // ThisExpression
        };


    function defaultOptions () {
        return {
            destructive: false,
            powerAssertVariableName: 'assert',
            lineSeparator: '\n',
            targetMethods: {
                oneArg: [
                    'ok'
                ],
                twoArgs: [
                    'equal',
                    'notEqual',
                    'strictEqual',
                    'notStrictEqual',
                    'deepEqual',
                    'notDeepEqual'
                ]
            }
        };
    }


    /**
     * Instrument power assert feature into code. Mozilla JS AST in, Mozilla JS AST out.
     * @param ast JavaScript Mozilla JS AST to instrument (directly modified if destructive option is truthy)
     * @param options Instrumentation options.
     * @return instrumented AST
     */
    function espower (ast, options) {
        var instrumentor = new SourceInstrumentor(extend(defaultOptions(), (options || {})));
        return instrumentor.instrument(ast);
    }


    function SourceInstrumentor (options) {
        ensureOptionPrerequisites(options);
        this.options = options;
        this.lines = options.source.split(options.lineSeparator);
    }

    SourceInstrumentor.prototype.instrument = function (ast) {
        ensureAstPrerequisites(ast, this.options);
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
            if (isSingleArgumentAssert(expression.callee, that.options)) {
                that.instrumentArgument(0, expression);
                return;
            }
            if (isTwoArgumentsAssert(expression.callee, that.options)) {
                that.instrumentArgument(0, expression);
                that.instrumentArgument(1, expression);
                return;
            }
        });
        return result;
    };

    SourceInstrumentor.prototype.instrumentArgument = function (index, callExpression) {
        var instrumentor = new LineInstrumentor(this.retrieveLineFor(callExpression), this.options),
            targetNode = callExpression.arguments[index];
        if (!isSupportedNodeType(targetNode)) {
            return;
        }
        callExpression.arguments[index] = instrumentor.instrument(targetNode);
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
        this.options = options;
    }

    LineInstrumentor.prototype.instrument = function (node) {
        ensureAstPrerequisites(node, this.options);
        var loc = this.locationOf(node),
            modifiedTree = this.captureRecursively(node);
        return this.captureAssertion(modifiedTree, loc);
    };

    LineInstrumentor.prototype.captureRecursively = function (node) {
        if (isSupportedNodeType (node)) {
            return nodeHandlerFor(node.type).call(null, this, node);
        } else {
            return node;
        }
    };

    LineInstrumentor.prototype.captureExpressionWithInfixOperator = function (kind, expression) {
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
        var n = newNodeWithLocationCopyOf(memberExpression),
            newLocation,
            computed = memberExpression.computed,
            prop = memberExpression.property,
            propertyIndex,
            propLocation,
            columnObjectLiteralNode;
        if (typeof prop.loc !== 'undefined') {
            propLocation = this.locationOf(prop);
            if (computed) {
                columnObjectLiteralNode = propLocation.properties[0].value.properties[1].value;
                columnObjectLiteralNode.value -= 1;
            }
            return propLocation;
        } else if (typeof memberExpression.loc !== 'undefined') { // non-computed MemberExpression under CoffeeScriptRedux
            propertyIndex = this.line.indexOf(prop.name, memberExpression.loc.start.column);
            if (propertyIndex === -1) {
                throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + this.line + ' col: ' + memberExpression.loc.start.column);
            }
            newLocation = n({});
            newLocation.loc.start = {
                line: memberExpression.loc.start.line,
                column: propertyIndex
            };
            return this.locationOf(newLocation);
        } else {
            throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + this.line);
        }
    };

    // calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
    LineInstrumentor.prototype.infixOperatorLocationOf = function (expression) {
        var n = newNodeWithLocationCopyOf(expression),
            newLocation,
            endOfLeftColumn,
            operatorStartColumn,
            operatorIndex;

        if (expression.left.loc.end && expression.left.loc.end.column) { // esprima
            endOfLeftColumn = expression.left.loc.end.column;
        } else if (expression.left.range) { // CoffeeScriptRedux
            endOfLeftColumn = expression.left.loc.start.column + (expression.left.range[1] - expression.left.range[0]);
        } else {
            throw new Error('Cannot detect operator location: ' + expression.operator + ' line: ' + this.line);
        }
        operatorStartColumn = endOfLeftColumn + 1;

        if (this.line) {
            operatorIndex = this.line.indexOf(expression.operator, endOfLeftColumn);
            if (operatorIndex !== -1) {
                operatorStartColumn = operatorIndex;
            }
        }
        newLocation = n({});
        newLocation.loc.start = {
            line: expression.left.loc.start.line,
            column: operatorStartColumn
        };
        return this.locationOf(newLocation);
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
        if (this.options.path) {
            location.properties.push(n({
                type: 'Property',
                key: n({
                    type: 'Identifier',
                    name: 'path'
                }),
                value: n({
                    type: 'Literal',
                    value: this.options.path
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
                    name: this.options.powerAssertVariableName
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
                    name: this.options.powerAssertVariableName
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

    function isAssertMethodCall (callee, options) {
        return options.targetMethods.oneArg.some(function (name) {
            return detectTargetMemberExpression(callee, options.powerAssertVariableName, name);
        });
    }

    function isAssertFunctionCall (callee, options) {
        return (callee.type === 'Identifier' && callee.name === options.powerAssertVariableName);
    }

    function isSingleArgumentAssert (callee, options) {
        return isAssertFunctionCall(callee, options) || isAssertMethodCall(callee, options);
    }

    function isTwoArgumentsAssert (callee, options) {
        return options.targetMethods.twoArgs.some(function (name) {
            return detectTargetMemberExpression(callee, options.powerAssertVariableName, name);
        });
    }

    function isSupportedNodeType (node) {
        return typeof nodeHandlerFor(node.type) === 'function';
    }

    function nodeHandlerFor (nodeType) {
        return handlers[nodeType];
    }

    function ensureAstPrerequisites (ast, options) {
        var errorMessage;
        if (typeof ast.loc === 'undefined') {
            errorMessage = 'JavaScript AST should contain location information.';
            if (options.path) {
                errorMessage += ' path: ' + options.path;
            }
            throw new Error(errorMessage);
        }
    }

    function ensureOptionPrerequisites (options) {
        [
            'destructive',
            'powerAssertVariableName',
            'lineSeparator',
            'targetMethods'
        ].forEach(function (propName) {
            ensureOptionExistence(options, propName);
        });

        if (! options.source) {
            throw new Error('Target source code content should be specified by options.source.');
        }
        if (typeof options.targetMethods.oneArg === 'undefined') {
            throw new Error('options.targetMethods.oneArg should be specified.');
        }
        if (typeof options.targetMethods.twoArgs === 'undefined') {
            throw new Error('options.targetMethods.twoArgs should be specified.');
        }
    }

    function ensureOptionExistence (options, propName) {
        if (typeof options[propName] === 'undefined') {
            throw new Error('options.' + propName + ' should be specified.');
        }
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
    espower.handlers = handlers;
    espower.deepCopy = deepCopy;
    espower.traverse = traverse;
    espower.defaultOptions = defaultOptions;
    return espower;
}));
