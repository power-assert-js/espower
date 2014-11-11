var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    mocha = require('gulp-mocha'),
    mochaPhantomJS = require('gulp-mocha-phantomjs'),
    webserver = require('gulp-webserver'),
    del = require('del'),
    path = require('path'),
    source = require('vinyl-source-stream'),
    through = require('through2'),
    browserify = require('browserify'),
    derequire = require('gulp-derequire'),
    config = {
        jshint: {
            src: './lib/**/*.js'
        },
        bundle: {
            standalone: 'espower',
            srcFile: './index.js',
            destDir: './build',
            destName: 'espower.js'
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
    var blanket = require('./coverage/blanket'),
        capt = captureStdout({
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
    var bundleStream = browserify({entries: config.bundle.srcFile, standalone: config.bundle.standalone}).bundle();
    return bundleStream
        .pipe(source(config.bundle.destName))
        .pipe(derequire())
        .pipe(gulp.dest(config.bundle.destDir));
});

gulp.task('clean_source_map_bundle', function (done) {
    del([path.join(config.source_map_bundle.destDir, config.source_map_bundle.destName)], done);
});

gulp.task('source_map_bundle', ['clean_source_map_bundle'], function() {
    var bundleStream = browserify({entries: config.source_map_bundle.srcFile, standalone: config.source_map_bundle.standalone}).bundle();
    return bundleStream
        .pipe(source(config.source_map_bundle.destName))
        .pipe(derequire())
        .pipe(gulp.dest(config.source_map_bundle.destDir));
});

gulp.task('unit', function () {
    return runMochaSimply();
});

gulp.task('clean_coverage', function (done) {
    del([config.coverage.filename], done);
});

gulp.task('coverage', ['clean_coverage'], function () {
    return runMochaWithBlanket();
});

gulp.task('test_amd', ['bundle', 'source_map_bundle'], function () {
    return gulp
        .src(config.test.amd)
        .pipe(mochaPhantomJS({reporter: 'dot'}));
});

gulp.task('test_browser', ['bundle', 'source_map_bundle'], function () {
    return gulp
        .src(config.test.browser)
        .pipe(mochaPhantomJS({reporter: 'dot'}));
});

gulp.task('lint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['clean_coverage', 'clean_bundle', 'clean_source_map_bundle']);

gulp.task('test', ['unit','test_browser','test_amd']);
