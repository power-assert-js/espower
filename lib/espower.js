/**
 * espower.js - Power Assert feature instrumentor based on the Mozilla JavaScript AST.
 *
 * https://github.com/twada/espower
 *
 * Copyright (c) 2013-2014 Takuto Wada
 * Licensed under the MIT license.
 *   https://raw.github.com/twada/espower/master/MIT-LICENSE.txt
 *
 * A part of deepCopy function is:
 *   Copyright (C) 2012 Yusuke Suzuki (twitter: @Constellation) and other contributors.
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
        define(['estraverse'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('estraverse'));
    } else {
        root.espower = factory(root.estraverse);
    }
}(this, function (estraverse) {
    'use strict';


    var syntax = estraverse.Syntax,
        deepCopy,
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
                if (node.callee.type === syntax.MemberExpression) {
                    node.callee.object = instrumentor.captureRecursively(node.callee.object);
                    if (node.callee.computed) {
                        node.callee.property = instrumentor.captureRecursively(node.callee.property);
                    }
                    return instrumentor.captureNode('funcall', node, instrumentor.propertyLocationOf(node.callee));
                } else {
                    return instrumentor.captureNode('funcall', node, instrumentor.locationOf(node));
                }
            },

            UnaryExpression: function (instrumentor, node) {
                if ((node.operator === 'typeof' || node.operator === 'delete') && node.argument.type === syntax.Identifier) {
                    // 'typeof Identifier' or 'delete Identifier' is not instrumented
                } else {
                    node.argument = instrumentor.captureRecursively(node.argument);
                }
                return instrumentor.captureNode('unary', node, instrumentor.locationOf(node));
            },

            BinaryExpression: function (instrumentor, node) {
                // BK: need to detect operator location before left/right instrumentation
                var infixOperatorLocation = instrumentor.infixOperatorLocationOf(node);
                node.left = instrumentor.captureRecursively(node.left);
                node.right = instrumentor.captureRecursively(node.right);
                return instrumentor.captureNode('binary', node, infixOperatorLocation);
            },

            LogicalExpression: function (instrumentor, node) {
                // BK: need to detect operator location before left/right instrumentation
                var infixOperatorLocation = instrumentor.infixOperatorLocationOf(node);
                node.left = instrumentor.captureRecursively(node.left);
                node.right = instrumentor.captureRecursively(node.right);
                return instrumentor.captureNode('logical', node, infixOperatorLocation);
            },

            AssignmentExpression: function (instrumentor, node) {
                // BK: need to detect operator location before left/right instrumentation
                var infixOperatorLocation = instrumentor.infixOperatorLocationOf(node);
                // Do not instrument left due to 'Invalid left-hand side in assignment'
                //node.left = instrumentor.captureRecursively(node.left);
                node.right = instrumentor.captureRecursively(node.right);
                return instrumentor.captureNode('assignment', node, infixOperatorLocation);
            },

            ObjectExpression: function (instrumentor, node) {
                node.properties.forEach(function (prop) {
                    if (prop.type === syntax.Property && prop.kind === 'init') {
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
            capturing = false,
            result = (this.options.destructive) ? ast : deepCopy(ast);
        this.tokens = result.tokens;
        estraverse.replace(result, {
            enter: function (currentNode, parentNode) {
                var numTargetArgs, indexOfCurrentArg, instrumentor;
                if (!parentNode || parentNode.type !== syntax.CallExpression) {
                    return undefined;
                }
                if (parentNode.callee === currentNode) {
                    return undefined;
                }
                if (!isSupportedNodeType(currentNode)) {
                    return undefined;
                }
                numTargetArgs = numberOfTargetArguments(parentNode.callee, that.options);
                if (numTargetArgs === 0) {
                    return undefined;
                }
                indexOfCurrentArg = parentNode.arguments.indexOf(currentNode);
                if (indexOfCurrentArg < numTargetArgs) {
                    capturing = true;
                    instrumentor = that.instrumentArgument(parentNode, currentNode);
                    return instrumentor.instrument(currentNode);
                }
                return undefined;
            }
        });
        return result;
    };

    SourceInstrumentor.prototype.instrumentArgument = function (callExpression, argumentNode) {
        return new LineInstrumentor(this.retrieveLineFor(callExpression), this.options, this.tokens);
    };

    SourceInstrumentor.prototype.retrieveLineFor = function (callExpression) {
        var lineNumber = callExpression.loc.start.line;
        return this.lines[lineNumber - 1];
        // if (typeof callExpression.raw !== 'undefined') {
        //     return callExpression.raw;
        // }
    };


    function LineInstrumentor (line, options, tokens) {
        this.line = line;
        this.options = options;
        this.tokens = tokens;
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

    // calculate property location of MemberExpression.
    LineInstrumentor.prototype.propertyLocationOf = function (memberExpression) {
        var n = newNodeWithLocationCopyOf(memberExpression),
            newLocation,
            prop = memberExpression.property,
            foundIndex,
            propLocation;
        if (typeof prop.loc !== 'undefined') {
            propLocation = this.locationOf(prop);
            if (memberExpression.computed) {
                this.adjustPropertyLocationOfComputedMemberExpression(memberExpression, propLocation);
            }
            return propLocation;
        } else if (typeof memberExpression.loc !== 'undefined') { // non-computed MemberExpression under CoffeeScriptRedux
            foundIndex = this.line.indexOf(prop.name, memberExpression.loc.start.column);
            if (foundIndex === -1) {
                throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + this.line + ' col: ' + memberExpression.loc.start.column);
            }
            newLocation = n({});
            newLocation.loc.start = {
                line: memberExpression.loc.start.line,
                column: foundIndex
            };
            return this.locationOf(newLocation);
        } else {
            throw new Error('Cannot detect property location: ' + prop.name + ' line: ' + this.line);
        }
    };

    LineInstrumentor.prototype.adjustPropertyLocationOfComputedMemberExpression = function (memberExpression, propLocation) {
        var startObjectLiteralNode = propLocation.properties[0].value,
            columnObjectLiteralNode = startObjectLiteralNode.properties[1].value,
            token,
            substr,
            foundIndex;
        if (this.tokens) {
            token = this.findLeftBracketTokenOf(memberExpression);
        }
        if (token) {
            // console.log('left bracket: ' + token.loc.start.column);
            columnObjectLiteralNode.value = token.loc.start.column;
        } else {
            substr = this.line.substring(memberExpression.loc.start.column, memberExpression.property.loc.start.column);
            foundIndex = substr.lastIndexOf('[');
            if (foundIndex !== -1) {
                columnObjectLiteralNode.value = memberExpression.loc.start.column + foundIndex;
            } else {
                columnObjectLiteralNode.value -= 1;
            }
        }
    };

    // calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
    LineInstrumentor.prototype.infixOperatorLocationOf = function (expression) {
        var n = newNodeWithLocationCopyOf(expression),
            newLocation,
            endOfLeftColumn,
            operatorStartColumn,
            operatorIndex,
            token;
        if (expression.left.loc.end && expression.left.loc.end.column) { // esprima
            endOfLeftColumn = expression.left.loc.end.column;
        } else if (expression.left.range) { // CoffeeScriptRedux
            endOfLeftColumn = expression.left.loc.start.column + (expression.left.range[1] - expression.left.range[0]);
        } else {
            throw new Error('Cannot detect operator location: ' + expression.operator + ' line: ' + this.line);
        }
        operatorStartColumn = endOfLeftColumn + 1;

        if (this.tokens) { // esprima
            token = this.findOperatorTokenOf(expression);
            if (token) {
                // console.log('TOKEN INDEX: ' + token.loc.start.column);
                operatorStartColumn = token.loc.start.column;
            }
        } else if (this.line) {
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

    LineInstrumentor.prototype.findLeftBracketTokenOf = function (expression) {
        var tokens = this.tokens,
            fromColumn = expression.property.loc.start.column,
            fromLine = expression.loc.start.line,
            toLine = expression.property.loc.start.line;
        return searchToken(tokens, fromLine, toLine, function (token, index) {
            var prevToken;
            if (token.loc.start.column === fromColumn) {
                prevToken = tokens[index - 1];
                if (prevToken.type === 'Punctuator' && prevToken.value === '[') {
                    return prevToken;
                }
            }
            return undefined;
        });
    };

    LineInstrumentor.prototype.findOperatorTokenOf = function (expression) {
        var tokens = this.tokens,
            fromColumn = expression.left.loc.end.column,
            toColumn = expression.right.loc.start.column,
            fromLine = expression.left.loc.end.line,
            toLine = expression.right.loc.start.line;
        return searchToken(tokens, fromLine, toLine, function (token, index) {
            if (fromColumn < token.loc.start.column &&
                token.loc.end.column < toColumn &&
                token.type === 'Punctuator' &&
                token.value === expression.operator) {
                return token;
            }
            return undefined;
        });
    };

    LineInstrumentor.prototype.captureAssertion = function (node, location) {
        var n = newNodeWithLocationCopyOf(node),
            exprArgs = [node, location];
        if (this.line) {
            exprArgs.push(n({
                type: syntax.Literal,
                value: this.line
            }));
        }
        if (this.options.path) {
            location.properties.push(n({
                type: syntax.Property,
                key: n({
                    type: syntax.Identifier,
                    name: 'path'
                }),
                value: n({
                    type: syntax.Literal,
                    value: this.options.path
                }),
                kind: 'init'
            }));
        }
        return n({
            type: syntax.CallExpression,
            callee: n({
                type: syntax.MemberExpression,
                computed: false,
                object: n({
                    type: syntax.Identifier,
                    name: this.options.powerAssertVariableName
                }),
                property: n({
                    type: syntax.Identifier,
                    name: '_expr'
                })
            }),
            arguments: exprArgs
        });
    };

    LineInstrumentor.prototype.captureNode = function (kind, target, location) {
        var n = newNodeWithLocationCopyOf(target);
        return n({
            type: syntax.CallExpression,
            callee: n({
                type: syntax.MemberExpression,
                computed: false,
                object: n({
                    type: syntax.Identifier,
                    name: this.options.powerAssertVariableName
                }),
                property: n({
                    type: syntax.Identifier,
                    name: '_capt'
                })
            }),
            arguments: [
                target,
                n({
                    type: syntax.Literal,
                    value: kind
                }),
                location
            ]
        });
    };

    LineInstrumentor.prototype.locationOf = function (node) {
        var n = newNodeWithLocationCopyOf(node);
        return n({
            type: syntax.ObjectExpression,
            properties: [
                n({
                    type: syntax.Property,
                    key: n({
                        type: syntax.Identifier,
                        name: 'start'
                    }),
                    value: n({
                        type: syntax.ObjectExpression,
                        properties: [
                            n({
                                type: syntax.Property,
                                key: n({
                                    type: syntax.Identifier,
                                    name: 'line'
                                }),
                                value: n({
                                    type: syntax.Literal,
                                    value: node.loc.start.line
                                }),
                                kind: 'init'
                            }),
                            n({
                                type: syntax.Property,
                                key: n({
                                    type: syntax.Identifier,
                                    name: 'column'
                                }),
                                value: n({
                                    type: syntax.Literal,
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
        if (callee.type !== syntax.MemberExpression || callee.computed !== false) {
            return false;
        }
        var obj = callee.object,
            prop = callee.property;
        return ((obj.type === syntax.Identifier && obj.name === objName) && (prop.type === syntax.Identifier && prop.name === propName));
    }

    function numberOfTargetArguments (callee, options) {
        if (isSingleArgumentAssert(callee, options)) {
            return 1;
        }
        if (isTwoArgumentsAssert(callee, options)) {
            return 2;
        }
        return 0;
    }

    function isSingleArgumentAssert (callee, options) {
        return isAssertFunctionCall(callee, options) || isAssertMethodCall(callee, options);
    }

    function isTwoArgumentsAssert (callee, options) {
        return options.targetMethods.twoArgs.some(function (name) {
            return detectTargetMemberExpression(callee, options.powerAssertVariableName, name);
        });
    }

    function isAssertMethodCall (callee, options) {
        return options.targetMethods.oneArg.some(function (name) {
            return detectTargetMemberExpression(callee, options.powerAssertVariableName, name);
        });
    }

    function isAssertFunctionCall (callee, options) {
        return (callee.type === syntax.Identifier && callee.name === options.powerAssertVariableName);
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

    function searchToken (tokens, fromLine, toLine, predicate) {
        var i, token, found;
        for(i = 0; i < tokens.length; i += 1) {
            token = tokens[i];
            if (token.loc.start.line < fromLine) {
                continue;
            }
            if (toLine < token.loc.end.line) {
                break;
            }
            found = predicate(token, i);
            if (found) {
                return found;
            }
        }
        return undefined;
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
    espower.defaultOptions = defaultOptions;
    return espower;
}));
