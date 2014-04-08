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
        define(['estraverse', 'esprima'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('estraverse'), require('esprima'));
    } else {
        root.espower = factory(root.estraverse, root.esprima);
    }
}(this, function (estraverse, esprima) {
    'use strict';


    var syntax = estraverse.Syntax,
        deepCopy,
        supportedNodeTypes = [
            syntax.Identifier,
            syntax.MemberExpression,
            syntax.CallExpression,
            syntax.UnaryExpression,
            syntax.BinaryExpression,
            syntax.LogicalExpression,
            syntax.AssignmentExpression,
            syntax.ObjectExpression,
            syntax.NewExpression,
            syntax.ArrayExpression,
            syntax.ConditionalExpression,
            syntax.UpdateExpression,
            syntax.Property
        ];


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
            capturingStartPath,
            capturedMetaTree,
            capturedTokens,
            skipping = false,
            instrumentor,
            result = (this.options.destructive) ? ast : deepCopy(ast);
        this.tokens = result.tokens;

        estraverse.replace(result, {
            enter: function (currentNode, parentNode) {
                var controller = this,
                    path = controller.path(),
                    currentPath = path ? path[path.length - 1] : null,
                    numTargetArgs, indexOfCurrentArg;
                //console.log('enter currentNode:' + currentNode.type + ' parentNode: ' + parentNode.type + ' path: ' + path);

                if (capturingStartPath) {
                    if ((!isSupportedNodeType(currentNode)) ||
                        (isLeftHandSideOfAssignment(parentNode, currentPath)) ||
                        (isObjectLiteralKey(parentNode, currentPath)) ||
                        (isUpdateExpression(parentNode)) ||
                        (isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentPath)) ||
                        (isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentPath))) {
                        skipping = true;
                        return estraverse.VisitorOption.Skip;
                    }
                } else {
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
                        capturingStartPath = path;
                        capturedMetaTree = metaAst(currentNode);
                        capturedTokens = metaAst(subTokens(result.tokens, currentNode.loc.start, currentNode.loc.end));
                        instrumentor = that.instrumentArgument(parentNode, currentNode);
                        return undefined;
                    }
                }
                return undefined;
            },

            leave: function (currentNode, parentNode) {
                var controller = this,
                    path = controller.path(),
                    modifiedTree,
                    subpath,
                    instrumentedTree;
                //console.log('leave ' + currentNode.type + ' path: ' + path);

                if (!capturingStartPath) {
                    return undefined;
                }
                if (skipping) {
                    skipping = false;
                    return undefined;
                }
                if (parentNode.callee === currentNode) {
                    return undefined;
                }

                subpath = path.slice(capturingStartPath.length);

                //console.log('leave ' + currentNode.type + ' path: ' + path + ' ' + currentNode.name);
                switch(currentNode.type) {
                case syntax.Identifier:
                case syntax.MemberExpression:
                case syntax.CallExpression:
                case syntax.UnaryExpression:
                case syntax.BinaryExpression:
                case syntax.LogicalExpression:
                case syntax.AssignmentExpression:
                case syntax.UpdateExpression:
                case syntax.NewExpression:
                    modifiedTree = instrumentor.captureNode(currentNode, subpath);
                    break;
                case syntax.ObjectExpression:
                case syntax.ArrayExpression:
                case syntax.ConditionalExpression:
                    modifiedTree = currentNode;
                    break;
                default:
                    break;
                }

                if (modifiedTree && path && isLeavingAssertion(capturingStartPath, path)) {
                    instrumentedTree = instrumentor.captureAssertion(modifiedTree, capturedMetaTree, capturedTokens);
                    capturingStartPath = null;
                    capturedMetaTree = null;
                    capturedTokens = null;
                    return instrumentedTree;
                }

                return modifiedTree;
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

    LineInstrumentor.prototype.captureAssertion = function (node, metaAstTree, metaAstTokens) {
        var n = newNodeWithLocationCopyOf(node),
            namedArgs = n({
                type: syntax.ObjectExpression,
                properties: []
            });
        if (metaAstTree) {
            namedArgs.properties.push(n({
                type: syntax.Property,
                key: n({
                    type: syntax.Identifier,
                    name: 'tree'
                }),
                value: metaAstTree,
                kind: 'init'
            }));
        }
        if (metaAstTokens) {
            namedArgs.properties.push(n({
                type: syntax.Property,
                key: n({
                    type: syntax.Identifier,
                    name: 'tokens'
                }),
                value: metaAstTokens,
                kind: 'init'
            }));
        }
        if (this.line) {
            namedArgs.properties.push(n({
                type: syntax.Property,
                key: n({
                    type: syntax.Identifier,
                    name: 'content'
                }),
                value: n({
                    type: syntax.Literal,
                    value: this.line
                }),
                kind: 'init'
            }));
        }
        if (this.options.path) {
            namedArgs.properties.push(n({
                type: syntax.Property,
                key: n({
                    type: syntax.Identifier,
                    name: 'filepath'
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
            arguments: [node].concat(namedArgs)
        });
    };

    LineInstrumentor.prototype.captureNode = function (target, subpath) {
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
                    value: subpath.join('/')
                })
            ]
        });
    };


    function metaAst (tree) {
        var tempAst = esprima.parse('!' + JSON.stringify(tree));
        return tempAst.body[0].expression.argument;
    }

    function subTokens (tokens, from, to) {
        var i, token, result = [];
        for(i = 0; i < tokens.length; i += 1) {
            token = tokens[i];
            if (token.loc.start.line < from.line) {
                continue;
            }
            if (to.line < token.loc.end.line) {
                break;
            }
            if (token.loc.start.column < from.column) {
                continue;
            }
            if (to.column < token.loc.end.column) {
                break;
            }
            result.push(token);
        }
        return result;
    }

    function isLeftHandSideOfAssignment(parentNode, currentPath) {
        // Do not instrument left due to 'Invalid left-hand side in assignment'
        return parentNode.type === syntax.AssignmentExpression && currentPath === 'left';
    }

    function isObjectLiteralKey(parentNode, currentPath) {
        // Do not instrument Object literal key
        return parentNode.type === syntax.Property && parentNode.kind === 'init' && currentPath === 'key';
    }

    function isUpdateExpression(parentNode) {
        // Just wrap UpdateExpression, not digging in.
        return parentNode.type === syntax.UpdateExpression;
    }

    function isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentPath) {
        // Do not instrument non-computed property of MemberExpression within CallExpression.
        return currentNode.type === syntax.Identifier && parentNode.type === syntax.MemberExpression && !parentNode.computed && currentPath === 'property';
    }

    function isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentPath) {
        // 'typeof Identifier' or 'delete Identifier' is not instrumented
        return currentNode.type === syntax.Identifier && parentNode.type === syntax.UnaryExpression && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentPath === 'argument';
    }

    function isLeavingAssertion(capturingStartPath, path) {
        return capturingStartPath.join('/') === path.join('/');
    }

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
        return supportedNodeTypes.indexOf(node.type) !== -1;
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
    espower.defaultOptions = defaultOptions;
    return espower;
}));
