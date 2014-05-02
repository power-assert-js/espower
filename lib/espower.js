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
        define(['estraverse', 'escodegen'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('estraverse'), require('escodegen'));
    } else {
        root.espower = factory(root.estraverse, root.escodegen);
    }
}(this, function (estraverse, escodegen) {
    'use strict';

    // see: https://github.com/Constellation/escodegen/issues/115
    if (typeof define === 'function' && define.amd) {
        escodegen = window.escodegen;
    }

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
            escodegenOptions: {
                format: {
                    indent: {
                        style: ''
                    },
                    newline: ''
                },
                verbatim: 'x-verbatim-espower'
            },
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
        var instrumentor = new Instrumentor(extend(defaultOptions(), (options || {})));
        return instrumentor.instrument(ast);
    }


    function Instrumentor (options) {
        ensureOptionPrerequisites(options);
        this.options = options;
    }

    Instrumentor.prototype.instrument = function (ast) {
        ensureAstPrerequisites(ast, this.options);
        var that = this,
            assertionPath,
            argumentPath,
            canonicalCode,
            lineNum,
            argumentModified = false,
            skipping = false,
            result = (this.options.destructive) ? ast : deepCopy(ast);

        estraverse.replace(result, {
            enter: function (currentNode, parentNode) {
                var controller = this,
                    path = controller.path(),
                    currentPath = path ? path[path.length - 1] : null;
                //console.log('enter currentNode:' + currentNode.type + ' parentNode: ' + parentNode.type + ' path: ' + path);

                if (argumentPath) {
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
                    if (!parentNode || parentNode.type !== syntax.CallExpression || !isSupportedNodeType(currentNode)) {
                        return undefined;
                    }
                    if (that.isCalleeOfTargetAssertion(currentNode)) {
                        // entering target assertion
                        lineNum = parentNode.loc.start.line;
                        canonicalCode = generateCanonicalCode(parentNode, that.options.escodegenOptions);
                        assertionPath = path.slice(0, -1);
                        return undefined;
                    }
                    if (that.isTargetAssertionArgument(parentNode, currentNode)) {
                        // entering target argument
                        argumentPath = path;
                        return undefined;
                    }
                }
                return undefined;
            },

            leave: function (currentNode, parentNode) {
                var controller = this,
                    path = controller.path(),
                    resultTree = currentNode,
                    relativeEsPath;
                //console.log('leave ' + currentNode.type + ' path: ' + path);

                if (skipping) {
                    skipping = false;
                    return undefined;
                }

                if (isPathIdentical(assertionPath, path)) {
                    // leaving target assertion
                    canonicalCode = null;
                    lineNum = null;
                    assertionPath = null;
                    return undefined;
                }

                if (!argumentPath) {
                    return undefined;
                }

                if (isLastPieceOfFunctionCall(parentNode, currentNode)) {
                    return undefined;
                }

                relativeEsPath = path.slice(assertionPath.length);

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
                    resultTree = that.captureNode(currentNode, relativeEsPath);
                    argumentModified = true;
                    break;
                default:
                    break;
                }

                if (isPathIdentical(argumentPath, path)) {
                    // leaving target argument
                    argumentPath = null;
                    if (argumentModified) {
                        argumentModified = false;
                        return that.captureAssertion(resultTree, canonicalCode, lineNum);
                    }
                }

                return resultTree;
            }
        });
        return result;
    };

    Instrumentor.prototype.isCalleeOfTargetAssertion = function (node) {
        return numberOfTargetArguments(node, this.options) !== 0;
    };

    Instrumentor.prototype.isTargetAssertionArgument = function (parentNode, currentNode) {
        var numTargetArgs, indexOfCurrentArg;
        numTargetArgs = numberOfTargetArguments(parentNode.callee, this.options);
        if (numTargetArgs === 0) {
            return false;
        }
        indexOfCurrentArg = parentNode.arguments.indexOf(currentNode);
        return (indexOfCurrentArg < numTargetArgs);
    };

    Instrumentor.prototype.captureAssertion = function (node, canonicalCode, lineNum) {
        var n = newNodeWithLocationCopyOf(node),
            props = [];
        addLiteralTo(props, n, 'content', canonicalCode);
        addLiteralTo(props, n, 'filepath', this.options.path);
        addLiteralTo(props, n, 'line', lineNum);
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
            arguments: [node].concat(n({
                type: syntax.ObjectExpression,
                properties: props
            }))
        });
    };

    Instrumentor.prototype.captureNode = function (target, relativeEsPath) {
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
                    value: relativeEsPath.join('/')
                })
            ]
        });
    };


    function generateCanonicalCode(node, escodegenOptions) {
        var ast = deepCopy(node);
        estraverse.replace(ast, {
            leave: function (currentNode, parentNode) {
                if (currentNode.type === syntax.Literal && typeof currentNode.raw !== 'undefined') {
                    currentNode['x-verbatim-espower'] = {
                        content : currentNode.raw,
                        precedence : escodegen.Precedence.Primary
                    };
                    return currentNode;
                } else {
                    return undefined;
                }
            }
        });
        return escodegen.generate(ast, escodegenOptions);
    }

    function addLiteralTo(props, createNode, name, data) {
        if (data) {
            addToProps(props, createNode, name, createNode({
                type: syntax.Literal,
                value: data
            }));
        }
    }

    function addToProps(props, createNode, name, value) {
        props.push(createNode({
            type: syntax.Property,
            key: createNode({
                type: syntax.Identifier,
                name: name
            }),
            value: value,
            kind: 'init'
        }));
    }

    function isLastPieceOfFunctionCall(parentNode, currentNode) {
        return (parentNode.type === syntax.CallExpression || parentNode.type === syntax.NewExpression) &&
            parentNode.callee === currentNode;
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

    function isPathIdentical(path1, path2) {
        if (!path1 || !path2) {
            return false;
        }
        return path1.join('/') === path2.join('/');
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
            'targetMethods'
        ].forEach(function (propName) {
            ensureOptionExistence(options, propName);
        });

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
