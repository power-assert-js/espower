module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: pkg,
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
        jshint: {
            files: [
                'lib/**/*.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        mochaTest: {
            unit: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/**/*.js']
            },
            coverage: {
                options: {
                    reporter: 'mocha-lcov-reporter',
                    require: 'coverage/blanket',
                    quiet: true,
                    captureFile: 'coverage.lcov'
                },
                src: ['test/**/*.js']
            }
        },
        watch: {
            unit: {
                files: ['test/**/*.js', 'lib/**/*.js'],
                tasks: ['test']
            }
        }
    });

    grunt.registerTask('test', ['jshint', 'mochaTest:unit']);
    grunt.registerTask('coverage', ['mochaTest:coverage']);
};
