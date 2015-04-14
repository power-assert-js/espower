var require = {
    paths: {
        espower: '../build/espower',
        assert: '../bower_components/assert/assert',
        escodegen: '../bower_components/escodegen/escodegen.browser',
        acorn: '../node_modules/acorn/dist/acorn',
        estraverse: '../bower_components/estraverse/estraverse',
        "source-map": '../build/source-map',
        mocha: '../bower_components/mocha/mocha',
        requirejs: '../bower_components/requirejs/require'
    },
    shim: {
        assert: {
            exports: 'assert'
        },
        escodegen: {
            exports: 'escodegen'
        }
    }
};
