module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    (function () {
        var taskName;
        for(taskName in pkg.devDependencies) {
            if(taskName.substring(0, 6) === 'grunt-') {
                grunt.loadNpmTasks(taskName);
            }
        }
    })();

    grunt.initConfig({
        pkg: pkg,
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
};
