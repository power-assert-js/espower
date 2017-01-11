var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var mocha = require('gulp-mocha');
var del = require('del');
var path = require('path');
var fs = require('fs');
var through = require('through2');
var acorn = require('acorn');
var espurify = require('espurify');
var config = {
    jshint: {
        src: './lib/**/*.js'
    },
    coverage: {
        filename: 'coverage.lcov'
    },
    test: {
        base: './test/',
        pattern: '**/*_test.js'
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

gulp.task('watch', function () {
    gulp.watch('{lib,test}/**/*.js', runMochaSimply);
    runMochaSimply();
});

gulp.task('generate_recorder_json', function (done) {
    var filepath = path.join(__dirname, 'power-assert-recorder.js');
    var ast = acorn.parse(fs.readFileSync(filepath), { ecmaVersion: 6, locations: true });
    var callexp = espurify(ast).body[0].expression.right;
    fs.writeFileSync(path.join(__dirname, 'lib', 'power-assert-recorder.json'), JSON.stringify(callexp, null, 2));
    done();
});

gulp.task('unit', ['generate_recorder_json'], function () {
    return runMochaSimply();
});

gulp.task('clean_coverage', function () {
    del.sync([config.coverage.filename]);
});

gulp.task('coverage', ['clean_coverage'], function () {
    return runMochaWithBlanket();
});

gulp.task('lint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['clean_coverage']);

gulp.task('test', ['unit']);
