var require = {
    paths: {
        assert: '../bower_components/assert/assert',
        deepcopy: '../bower_components/deepcopy/deepcopy.min',
        escodegen: '../bower_components/escodegen/escodegen.browser',
        esprima: '../bower_components/esprima/esprima',
        estraverse: '../bower_components/estraverse/estraverse',
        mocha: '../bower_components/mocha/mocha',
        requirejs: '../bower_components/requirejs/require'
    },
    shim: {
        assert: {
            exports: 'assert'
        },
        deepcopy: {
            exports: 'deepcopy'
        },
        escodegen: {
            exports: 'escodegen'
        }
    }
};
