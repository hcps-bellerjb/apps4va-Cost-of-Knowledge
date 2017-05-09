import gulp from 'gulp';
import sass from 'gulp-sass';
import pug from 'gulp-pug';

import rollup from 'gulp-better-rollup';
import rollupCommonJS from 'rollup-plugin-commonjs';
import rollupNodeResolve from 'rollup-plugin-node-resolve';
import rollupBabel from 'rollup-plugin-babel';
import rollupUglify from 'rollup-plugin-uglify';

import postcss from 'gulp-postcss';
import uncss from 'postcss-uncss';
import autoprefixer from 'autoprefixer';

import cleanCSS from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'uglify-js-harmony';

import fs from 'fs';
import path from 'path';
import plumber from 'gulp-plumber';
import browserSync from 'browser-sync';

gulp.task('sass', () => {
  let plugins = [
    autoprefixer(),
    uncss({
      html: ['dev/*.html']
    })
  ];
  gulp.src('src/sass/**/*.sass')
    .pipe(plumber())
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dev'))
    .pipe(browserSync.stream());

  // Assets
  gulp.src('src/assets/img/**')
    .pipe(gulp.dest('dev/img'));
  gulp.src('src/assets/fonts/**/*.*')
    .pipe(gulp.dest('dev/fonts'));
  gulp.src('src/assets/csv/**')
    .pipe(gulp.dest('dev/data'));
});

gulp.task('pug', () => {
  return gulp.src(['src/pug/**/*.pug', '!src/pug/**/_*.pug'])
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('dev'));
});

gulp.task('javascript', () => {
  return gulp.src(['src/js/app.js'])
    .pipe(plumber())
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(rollup({
      plugins: [
        rollupCommonJS(),
        rollupNodeResolve(),
        rollupBabel({
          exclude: 'node_modules/**'
        })
      ]
    }, 'umd'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dev'));
});

gulp.task('serve', ['pug', 'sass', 'javascript'], () => {
  browserSync.init({
    server: "./dev"
  });
  gulp.watch("dev/**/*.html").on('change', browserSync.reload);
  gulp.watch("dev/**/*.js").on('change', browserSync.reload);
});

gulp.task('dev', ['serve'], () => {
  gulp.watch('src/sass/**/*.sass', ['sass']);
  gulp.watch('src/pug/**/*.pug', ['pug', 'sass']);
  gulp.watch('src/js/**/*.js', ['javascript']);
});

gulp.task('minSASS', () => {
  let plugins = [
    autoprefixer(),
    uncss({
      html: ['dist/*.html']
    })
  ];

  // Assets
  gulp.src('src/assets/img/**')
    .pipe(gulp.dest('dist/img'));
  gulp.src('src/assets/fonts/**/*.*')
    .pipe(gulp.dest('dist/fonts'));
  gulp.src('src/assets/csv/**')
    .pipe(gulp.dest('dist/data'));

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
  return gulp.src(['src/js/app.js'])
    .pipe(rollup({
      plugins: [
        rollupCommonJS(),
        rollupNodeResolve(),
        rollupBabel({
          exclude: 'node_modules/**'
        }),
        rollupUglify({}, uglify.minify)
      ]
    }, 'umd'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build', ['minPug', 'minSASS', 'minJavascript']);
