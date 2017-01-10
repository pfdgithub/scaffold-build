let gulp = require('gulp');
let replace = require("gulp-replace");
let uglify = require("gulp-uglify");
let minifyCss = require("gulp-minify-css");
let minifyHtml = require("gulp-minify-html");

let ver = '_=' + new Date().getTime();
let src = 'src';
let dest = 'dist';

gulp.task('minify:js', () => {
  return gulp.src(`${src}/**/*.js`)
    .pipe(replace(/_VER_/g, ver))
    .pipe(uglify())
    .pipe(gulp.dest(dest));
});

gulp.task('minify:css', () => {
  return gulp.src(`${src}/**/*.css`)
    .pipe(replace(/_VER_/g, ver))
    .pipe(minifyCss())
    .pipe(gulp.dest(dest));
});

gulp.task('minify:html', () => {
  return gulp.src(`${src}/**/*.html`)
    .pipe(replace(/_VER_/g, ver))
    .pipe(minifyHtml())
    .pipe(gulp.dest(dest));
});

gulp.task('copy', () => {
  return gulp.src([`${src}/**`, `!${src}/**/*.{js,css,html}`])
    .pipe(gulp.dest(dest));
});

gulp.task('build', ['minify:js', 'minify:css', 'minify:html', 'copy'], () => {
});

gulp.task('default', () => {
});