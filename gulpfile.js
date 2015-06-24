var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('javascript', function() {
    return gulp.src([
        '!./src//public/js/socketOn.js',
        './src//public/js/io.js',
        './src//public/js/moment-2.8.3.js',
        './src//public/js/*.js'
    ])
        .pipe(concat('all.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./src/public/js/'));
});

gulp.task('style', function() {
    return gulp.src([
        './src/public/stylesheets/new/*.css',
        './src/public/stylesheets/plugins/*.css'
    ])
        .pipe(concat('all.css'))
        .pipe(csso())
        .pipe(gulp.dest('./src//public/stylesheets/'));
});