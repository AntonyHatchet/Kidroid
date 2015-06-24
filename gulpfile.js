var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');
var watch = require('gulp-watch');
var del = require('del');
var vinylPaths = require('vinyl-paths');


gulp.task('build', function() {
    var js = [
        '!./src//public/js/socketOn.js',
        './src//public/js/io.js',
        './src//public/js/moment-2.8.3.js',
        './src//public/js/*.js'
    ];
    return gulp.src(js)
        .pipe(concat('all.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./src/public/js/'));
});

gulp.task('js', function() {
    var src = [
        '!./src/public/js/src/socketOn.js',
        './src/public/js/src/io.js',
        './src/public/js/src/moment-2.8.3.js',
        './src/public/js/src/*.js'
    ];
    del.sync('./src/public/js/all.js');
    return gulp.src(src)
        .pipe(concat('all.js'))
        // .pipe(uglify())
        .pipe(gulp.dest('./src/public/js/'));
});

gulp.task('style', function() {
    var src = [
        './src/public/stylesheets/new/*.css',
        './src/public/stylesheets/plugins/*.css'
    ];
    del.sync('./src/public/stylesheets/all.js');
    return gulp.src(src)
        .pipe(concat('all.css'))
        .pipe(csso())
        .pipe(gulp.dest('./src//public/stylesheets/'));
});

gulp.task('default', function () {
    gulp.start('watcher');
});

gulp.task('watcher', function () {
    var src = [
        './src/public/stylesheets/new/*.css',
        './src/public/stylesheets/plugins/*.css',
        './src/public/js/src/*.js'
    ];
    watch(src, function () {
        gulp.src(src)
            .pipe(watch(src,gulp.start('style')))
            .pipe(watch(src,gulp.start('js')))
    });
});