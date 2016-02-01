'use strict';

var estraverse = require('estraverse');
var syntax = estraverse.Syntax;
var escope = require('escope');
var escallmatch = require('escallmatch');
var cloneAst = require('./clone-ast');
var AssertionVisitor = require('./assertion-visitor');
var EspowerError = require('./espower-error');
var typeName = require('type-name');
var find = require('array-find');
var extend = require('xtend');

function Transformation () {
    this.mutations = {};
    this.nameCounts = {};
}
Transformation.prototype.register = function (espath, callback) {
    if (!this.mutations[espath]) {
        this.mutations[espath] = [];
    }
    this.mutations[espath].push(callback);
};
Transformation.prototype.apply = function (espath, node) {
    this.mutations[espath].forEach(function (callback) {
        callback(node);
    });
};
Transformation.prototype.isTarget = function (espath) {
    return !!this.mutations[espath];
};
Transformation.prototype.generateUniqueName = function (name) {
    if (!this.nameCounts[name]) {
        this.nameCounts[name] = 0;
    }
    this.nameCounts[name] += 1;
    return '_' + name + this.nameCounts[name];
};

function Instrumentor (options) {
    verifyOptionPrerequisites(options);
    this.options = options;
    this.matchers = options.patterns.map(function (pattern) { return escallmatch(pattern, options); });
}

Instrumentor.prototype.instrument = function (ast) {
    verifyAstPrerequisites(ast, this.options);
    var that = this;
    var assertionVisitor;
    var storage = {
        transformation: new Transformation()
    };
    var skipping = false;
    var result = (this.options.destructive) ? ast : cloneAst(ast);
    var scopeManager = escope.analyze(result);
    var currentScope = scopeManager.acquire(result);
    var visitor = {
        enter: function (currentNode, parentNode) {
            if (/Function/.test(currentNode.type)) {
                currentScope = scopeManager.acquire(currentNode);
            }
            var controller = this;
            var path = controller.path();
            var currentKey = path ? path[path.length - 1] : null;
            if (assertionVisitor) {
                if (assertionVisitor.toBeSkipped(controller)) {
                    skipping = true;
                    return controller.skip();
                }
                if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
                    return assertionVisitor.enterArgument(controller);
                }
            } else if (currentNode.type === syntax.CallExpression) {
                var matcher = find(that.matchers, function (matcher) { return matcher.test(currentNode); });
                if (matcher) {
                    // entering target assertion
                    assertionVisitor = new AssertionVisitor(matcher, extend({
                        storage: storage,
                        currentScope: currentScope
                    }, that.options));
                    assertionVisitor.enter(controller);
                    return undefined;
                }
            }
            return undefined;
        },
        leave: function (currentNode, parentNode) {
            try {
                var controller = this;
                var resultTree = currentNode;
                var path = controller.path();
                var espath = path ? path.join('/') : '';
                if (storage.transformation.isTarget(espath)) {
                    storage.transformation.apply(espath, resultTree);
                    return resultTree;
                }
                if (!assertionVisitor) {
                    return undefined;
                }
                if (skipping) {
                    skipping = false;
                    return undefined;
                }
                if (assertionVisitor.isLeavingAssertion(controller)) {
                    assertionVisitor.leave(controller);
                    assertionVisitor = null;
                    return undefined;
                }
                if (!assertionVisitor.isCapturingArgument()) {
                    return undefined;
                }
                if (assertionVisitor.toBeCaptured(controller)) {
                    resultTree = assertionVisitor.captureNode(controller);
                }
                if (assertionVisitor.isLeavingArgument(controller)) {
                    return assertionVisitor.leaveArgument(resultTree);
                }
                return resultTree;
            } finally {
                if (/Function/.test(currentNode.type)) {
                    currentScope = currentScope.upper;
                }
            }
        }
    };
    if (this.options.visitorKeys) {
        visitor.keys = this.options.visitorKeys;
    }
    estraverse.replace(result, visitor);
    return result;
};

function isCalleeOfParentCallExpression (parentNode, currentKey) {
    return parentNode.type === syntax.CallExpression && currentKey === 'callee';
}

function verifyAstPrerequisites (ast, options) {
    var errorMessage;
    if (typeof ast.loc === 'undefined') {
        errorMessage = 'ECMAScript AST should contain location information.';
        if (options.path) {
            errorMessage += ' path: ' + options.path;
        }
        throw new EspowerError(errorMessage, verifyAstPrerequisites);
    }
}

function verifyOptionPrerequisites (options) {
    if (typeName(options.destructive) !== 'boolean') {
        throw new EspowerError('options.destructive should be a boolean value.', verifyOptionPrerequisites);
    }
    if (typeName(options.patterns) !== 'Array') {
        throw new EspowerError('options.patterns should be an array.', verifyOptionPrerequisites);
    }
}

module.exports = Instrumentor;
