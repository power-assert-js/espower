var require = {
    paths: {
        espower: '../build/espower',
        assert: '../bower_components/assert/assert',
        escodegen: '../build/escodegen',
        acorn: '../node_modules/acorn/dist/acorn',
        estraverse: '../build/estraverse',
        "source-map": '../build/source-map',
        mocha: '../bower_components/mocha/mocha',
        requirejs: '../bower_components/requirejs/require'
    },
    shim: {
        assert: {
            exports: 'assert'
        }
    }
};
