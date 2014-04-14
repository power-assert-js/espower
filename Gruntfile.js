module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    require('jit-grunt')(grunt, {
        bower: 'grunt-bower-requirejs'
    });

    grunt.initConfig({
        pkg: pkg,
        bower: {
            all: {
                rjsConfig: 'test/rjsconfig.js',
                options: {
                    baseUrl: 'test'
                }
            }
        },
        bump: {
            options: {
                files: ['package.json', 'bower.json'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: '%VERSION%',
                commitFiles: ['package.json', 'bower.json'], // '-a' for all files
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: '%VERSION%',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
            }
        },
        connect: {
            server: {
                options: {
                    port: 9001,
                    base: '.',
                    keepalive: true
                }
            }
        },
        jshint: {
            files: [
                'lib/**/*.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        mocha: {
            browser: {
                src: ['test/test-browser.html'],
                options: {
                    run: true
                }
            },
            amd: {
                src: ['test/test-amd.html'],
                options: {
                    run: false
                }
            }
        },
        mochaTest: {
            unit: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/**/*_test.js']
            },
            coverage: {
                options: {
                    reporter: 'mocha-lcov-reporter',
                    require: 'coverage/blanket',
                    quiet: true,
                    captureFile: 'coverage.lcov'
                },
                src: ['test/**/*_test.js']
            }
        },
        watch: {
            unit: {
                files: ['test/**/*.js', 'lib/**/*.js'],
                tasks: ['unit']
            }
        }
    });

    grunt.registerTask('unit', ['jshint', 'mochaTest:unit']);
    grunt.registerTask('test', ['jshint', 'mochaTest:unit', 'mocha:browser', 'mocha:amd']);
    grunt.registerTask('coverage', ['mochaTest:coverage']);
};
