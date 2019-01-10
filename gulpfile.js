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
    test: {
        base: './test/',
        pattern: '**/*_test.js'
    }
};


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

gulp.task('lint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['clean_coverage']);

gulp.task('test', ['unit']);
