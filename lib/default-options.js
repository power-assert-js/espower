'use strict';

module.exports = function defaultOptions () {
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
};
