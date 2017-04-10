import gulp from 'gulp';
import sass from 'gulp-sass';
import pug from 'gulp-pug';
import babel from 'gulp-babel';

import postcss from 'gulp-postcss';
import uncss from 'postcss-uncss';
import autoprefixer from 'autoprefixer';

import cleanCSS from 'gulp-clean-css';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import sourcemaps from 'gulp-sourcemaps';
import modernizr from 'gulp-modernizr';

import fs from 'fs';
import path from 'path';
import browserSync from 'browser-sync';

gulp.task('sass', () => {
  let plugins = [
    autoprefixer(),
    uncss({
      html: ['dev/*.html']
    })
  ];
  gulp.src('src/sass/**/*.sass')
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dev'))
    .pipe(browserSync.stream());
});

gulp.task('pug', () => {
  return gulp.src(['src/pug/**/*.pug', '!src/pug/**/_*.pug'])
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('dev'));
});

gulp.task('javascript', () => {
  gulp.src(['src/js/**/*.js'])
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(modernizr())
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dev'));
  browserSync.reload();
});

gulp.task('serve', ['pug', 'sass', 'javascript'], () => {
  browserSync.init({
    server: "./dev"
  });
  gulp.watch("dev/**/*.html").on('change', browserSync.reload);
});

gulp.task('dev', ['serve'], () => {
  gulp.watch('src/sass/**/*.sass', ['sass']);
  gulp.watch('src/pug/**/*.pug', ['pug']);
});

gulp.task('minSASS', () => {
  let plugins = [
    autoprefixer(),
    uncss({
      html: ['dist/*.html']
    })
  ];
  gulp.src('src/sass/**/*.sass')
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(cleanCSS())
    .pipe(gulp.dest('dist'));
});

gulp.task('minPug', () => {
  return gulp.src(['src/pug/**/*.pug', '!src/pug/**/_*.pug'])
    .pipe(pug())
    .pipe(gulp.dest('dist'));
});

gulp.task('minJavascript', () => {
  gulp.src(['src/js/**/*.js'])
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(modernizr())
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('build', ['minPug', 'minSASS', 'minJavascript']);
