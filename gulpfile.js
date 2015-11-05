var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var mocha = require('gulp-mocha');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var webserver = require('gulp-webserver');
var del = require('del');
var path = require('path');
var source = require('vinyl-source-stream');
var through = require('through2');
var browserify = require('browserify');
var licensify = require('licensify');
var dereserve = require('gulp-dereserve');
var derequire = require('gulp-derequire');
var config = {
    jshint: {
        src: './lib/**/*.js'
    },
    bundle: {
        standalone: 'espower',
        srcFile: './index.js',
        destDir: './build',
        destName: 'espower.js'
    },
    assert_bundle: {
        standalone: 'assert',
        require: 'assert',
        destDir: './build',
        destName: 'assert.js'
    },
    escodegen_bundle: {
        standalone: 'escodegen',
        srcFile: './node_modules/escodegen/escodegen.js',
        destDir: './build',
        destName: 'escodegen.js'
    },
    estraverse_bundle: {
        standalone: 'estraverse',
        srcFile: './node_modules/estraverse/estraverse.js',
        destDir: './build',
        destName: 'estraverse.js'
    },
    source_map_bundle: {
        standalone: 'sourceMap',
        srcFile: './node_modules/source-map/source-map.js',
        destDir: './build',
        destName: 'source-map.js'
    },
    acorn_es7_plugin_bundle: {
        standalone: 'acornEs7Plugin',
        require: 'acorn-es7-plugin',
        destDir: './build',
        destName: 'acorn-es7-plugin.js'
    },
    coverage: {
        filename: 'coverage.lcov'
    },
    test: {
        base: './test/',
        pattern: '**/*_test.js',
        amd: 'test/test-amd.html',
        browser: 'test/test-browser.html'
    }
};
var BUILDS = ['assert', 'escodegen', 'estraverse', 'source_map', 'acorn_es7_plugin'];


function captureStdout (filespec) {
    var orig, log = '';
    function spy (str) {
        log += str;
    }
    function pass (file, encoding, callback) {
        this.push(file);
        callback();
    }
    return {
        start: through.obj(pass, function (callback) {
            orig = process.stdout.write;
            process.stdout.write = spy;
            callback();
        }),
        finish: through.obj(pass, function (callback) {
            var file = new gutil.File(filespec);
            file.contents = new Buffer(log);
            this.push(file);
            process.stdout.write = orig;
            log = '';
            orig = null;
            callback();
        })
    };
}

function runMochaWithBlanket() {
    var blanket = require('./coverage/blanket');
    var capt = captureStdout({
        cwd: __dirname,
        base: __dirname,
        path: __dirname + '/' + config.coverage.filename
    });
    return gulp
        .src(config.test.base + config.test.pattern, {read: false})
        .pipe(capt.start)
        .pipe(mocha({
            ui: 'bdd',
            reporter: 'mocha-lcov-reporter'
        }))
        .pipe(capt.finish)
        .pipe(gulp.dest('.'))
        .on('error', gutil.log);
}

function runMochaSimply() {
    return gulp
        .src(config.test.base + config.test.pattern, {read: false})
        .pipe(mocha({
            ui: 'bdd',
            reporter: 'dot'
        }))
        .on('error', gutil.log);
}

gulp.task('serve', function() {
    gulp.src(__dirname)
        .pipe(webserver({
            port: 9001,
            directoryListing: true
        }));
});

gulp.task('watch', function () {
    gulp.watch('{lib,test}/**/*.js', runMochaSimply);
    runMochaSimply();
});

gulp.task('clean_bundle', function () {
    del.sync([path.join(config.bundle.destDir, config.bundle.destName)]);
});

gulp.task('bundle', ['clean_bundle'], function() {
    var b = browserify({entries: config.bundle.srcFile, standalone: config.bundle.standalone});
    b.plugin(licensify);
    var bundleStream = b.bundle();
    return bundleStream
        .pipe(source(config.bundle.destName))
        .pipe(dereserve())
        .pipe(derequire())
        .pipe(gulp.dest(config.bundle.destDir));
});

BUILDS.forEach(function (name) {
    gulp.task('clean_' + name + '_bundle', function () {
        del.sync([path.join(config[name + '_bundle'].destDir, config[name + '_bundle'].destName)]);
    });
    gulp.task(name + '_bundle', ['clean_' + name + '_bundle'], function() {
        var b = browserify({standalone: config[name + '_bundle'].standalone});
        if (config[name + '_bundle'].srcFile) {
            b.add(config[name + '_bundle'].srcFile);
        }
        if (config[name + '_bundle'].require) {
            b.require(config[name + '_bundle'].require);
        }
        return b.bundle()
            .pipe(source(config[name + '_bundle'].destName))
            .pipe(derequire())
            .pipe(gulp.dest(config[name + '_bundle'].destDir));
    });
});
gulp.task('clean_deps', BUILDS.map(function (name) { return 'clean_' + name + '_bundle'; }));
gulp.task('build_deps', BUILDS.map(function (name) { return name + '_bundle'; }));

gulp.task('unit', function () {
    return runMochaSimply();
});

gulp.task('clean_coverage', function () {
    del.sync([config.coverage.filename]);
});

gulp.task('coverage', ['clean_coverage'], function () {
    return runMochaWithBlanket();
});

gulp.task('test_amd', ['bundle', 'build_deps'], function () {
    return gulp
        .src(config.test.amd)
        .pipe(mochaPhantomJS({reporter: 'dot'}));
});

gulp.task('test_browser', ['bundle', 'build_deps'], function () {
    return gulp
        .src(config.test.browser)
        .pipe(mochaPhantomJS({reporter: 'dot'}));
});

gulp.task('lint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['clean_coverage', 'clean_bundle', 'clean_deps']);

gulp.task('test', ['unit','test_browser','test_amd']);
