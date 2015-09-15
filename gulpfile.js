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
        srcFile: './node_modules/source-map/lib/source-map.js',
        destDir: './build',
        destName: 'source-map.js'
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
var BUILDS = ['source_map', 'escodegen', 'estraverse'];


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

gulp.task('clean_bundle', function (done) {
    del([path.join(config.bundle.destDir, config.bundle.destName)], done);
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
    gulp.task('clean_' + name + '_bundle', function (done) {
        del([path.join(config[name + '_bundle'].destDir, config[name + '_bundle'].destName)], done);
    });

    gulp.task(name + '_bundle', ['clean_' + name + '_bundle'], function() {
        var bundleStream = browserify({entries: config[name + '_bundle'].srcFile, standalone: config[name + '_bundle'].standalone}).bundle();
        return bundleStream
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

gulp.task('clean_coverage', function (done) {
    del([config.coverage.filename], done);
});

gulp.task('coverage', ['clean_coverage'], function () {
    return runMochaWithBlanket();
});

gulp.task('test_amd', ['build_deps'], function () {
    return gulp
        .src(config.test.amd)
        .pipe(mochaPhantomJS({reporter: 'dot'}));
});

gulp.task('test_browser', ['build_deps'], function () {
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
