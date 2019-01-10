var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
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

gulp.task('clean_coverage', function () {
    del.sync([config.coverage.filename]);
});

gulp.task('lint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['clean_coverage']);
