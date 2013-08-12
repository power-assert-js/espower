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
        unit: {
            dir: ['test/**/*.js']
        },
    });


    grunt.registerTask('qunit-test', function() {
        var done = this.async(),
            QUnit = require("qunitjs");

        var tap = (function (qu) {
            var qunitTap = require("qunit-tap"),
                util = require('util');
            return qunitTap(qu, util.puts, {showSourceOnFailure: false});
        })(QUnit);
        
        function removeCallback (ary, element) {
            var index = ary.indexOf(element);
            if (index !== -1) {
                ary.splice(index, 1);
            }
        }

        var gruntQunitTaskDone = function gruntQunitTaskDone ( details ) {
            var succeeded = (details.failed === 0),
                message = details.total + " assertions in (" +
                    details.runtime + "ms), passed: " +
                    details.passed + ", failed: " + details.failed;
            if ( succeeded ) {
                grunt.log.ok(message);
            } else {
                grunt.log.error(message);
            }
            tap.unsubscribe();
            removeCallback(QUnit.config.done, gruntQunitTaskDone);
            done( succeeded );
        };
        QUnit.done(gruntQunitTaskDone);
        QUnit.config.autorun = false;
        QUnit.config.autostart = false;
        QUnit.config.updateRate = 0;
        if (QUnit.config.semaphore === 1) {
            QUnit.config.semaphore = 0;
        }
        QUnit.load();

        grunt.config.get('unit.dir').forEach(function (pattern) {
            grunt.log.ok('searching for ' + pattern + '...');
            grunt.file.glob(pattern, function (err, files) {
                if (err) {
                    grunt.log.error('error ' + err.message);
                    return;
                }
                files.forEach(function (file) {
                    grunt.log.write('require ' + file + '...').ok();
                    require('./' + file);
                });
            });
        });
    });


    grunt.registerTask('unit', ['qunit-test']);
};
