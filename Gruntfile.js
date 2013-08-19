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
        mochaTest: {
            unit: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/**/*.js']
            }
        }
    });

    grunt.registerTask('test', ['mochaTest:unit']);
};
