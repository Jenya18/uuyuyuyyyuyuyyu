const { src, dest, watch, series, parallel } = require('gulp');
const scss = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const uglify = require('gulp-uglify-es').default;
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();
const clean = require('gulp-clean');
const fonter = require('gulp-fonter');
const ttf2woff2 = require('gulp-ttf2woff2');
const avif = require('gulp-avif');
const webp = require('gulp-webp');
const imagemin = require('gulp-imagemin');
const newer = require('gulp-newer');
const gulpIf = require('gulp-if');
const path = require('path');
var plumber = require('gulp-plumber'); 
const fs = require('fs');
const versionNumber = require('gulp-version-number');
const fileInclude = require('gulp-file-include');

function convertTTFtoWOFF() {
  return src(['src/fonts/*.ttf', 'src/fonts/*.otf'])
    .pipe(plumber())
    .pipe(fonter({ formats: ['woff'] }))
    .pipe(ttf2woff2())
    .pipe(newer('dist/fonts'))
    .pipe(dest('dist/fonts'));
}
function convertTTFtoWOFF2() {
  return src('src/fonts/*.ttf')
    .pipe(plumber())
    .pipe(fonter({ formats: ['ttf'] }))
    .pipe(ttf2woff2())
    .pipe(newer('dist/fonts'))
    .pipe(dest('dist/fonts'));
}
function fontsStyle() {
  let fontsFile = 'src/scss/fonts.scss';
  if (!fs.existsSync('src/fonts') || fs.readdirSync('src/fonts').length === 0) {
    console.log("Отсутствуют шрифты в каталоге src/fonts. Задача fontsStyle не будет выполнена.");
    return src('src');
  }
  let fontsFiles = fs.readdirSync('dist/fonts');
    if (fontsFiles && !fs.existsSync(fontsFile)) {
      fs.writeFileSync(fontsFile, '');
      let newFileOnly;
      for (var i = 0; i < fontsFiles.length; i++) {
        let fontFileName = fontsFiles[i].split('.')[0];
        if (newFileOnly !== fontFileName) {
          let fontName = fontFileName.split('-')[0] || fontFileName;
          let fontWeight = fontFileName.split('-')[1] || fontFileName;
          // Ваша логика преобразования fontWeight
          fs.appendFileSync(fontsFile, `@font-face{\n\tfont-family: '${fontName} ${fontWeight}';\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontFileName}.woff2") format("woff2"), url("../fonts/${fontFileName}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: normal;\n}\r\n`);
          newFileOnly = fontFileName;
        }
      }
    } else {
      console.log("Файл scss/fonts.scss уже существует. Для обновления файла нужно его удалить!");
    }  
    return src('src');
}
function styles() {
  return (
    src('src/scss/*.scss')
      .pipe(autoprefixer({ overrideBrowserslist: ['last 20 version'] }))
      .pipe(concat('style.min.css'))
      .pipe(scss({ outputStyle: 'compressed' }))
      .pipe(dest('dist/css'))
      .pipe(browserSync.stream())
  );
}
function scripts() {
  return src('src/js/**/*.js')
    .pipe(concat('main.min.js'))
    .pipe(uglify())
    .pipe(dest('dist/js'))
    .pipe(browserSync.stream());
}
function html() {
  return src(['src/*.html', '!src/htmlBlocks/**/*.*'])
  .pipe(dest('dist'))
  .pipe(browserSync.stream());
}
function cleanDist() {
  return src('dist')
  .pipe(clean())
}
function imageOptimization() {
  return src(['src/media/image/**/*.*', '!src/media/image/**/*.svg'])
  .pipe(avif({quality: 50}))
  .pipe(src('src/media/image/**/*.*'))
  .pipe(webp())
  .pipe(src('src/media/image/**/*.*'))
  .pipe(imagemin())
  .pipe(dest('dist/media/image'))
}
function files() {
  return src(['src/files/**/*.*'])
  .pipe(dest('dist/files'))
}
function mediaFiles() {
  return src('src/media/**/*.*')
    .pipe(gulpIf(file => {
      const ext = path.extname(file.path).toLowerCase();
      if (['.jpg', '.png', '.svg'].includes(ext)) {
        return true;
      } else if (['.mp4', '.webm'].includes(ext)) {
        return true;
      } else if (ext === '.gif') {
        return true;
      } else if (ext === '.mp3') {
        return true;
      }
      return false;
    }, dest(file => {
      const ext = path.extname(file.path).toLowerCase();
      if (['.jpg', '.png', '.svg'].includes(ext)) {
        return 'dist/media';
      } else if (['.mp4', '.webm'].includes(ext)) {
        return 'dist/media';
      } else if (ext === '.gif') {
        return 'dist/media';
      } else if (ext === '.mp3') {
        return 'dist/media';
      }
    })))
    .pipe(browserSync.stream());
}
function versionNumberProject() {
  return src(['dist/**/*.css', 'dist/**/*.js', 'dist/**/*.html'])
    .pipe(versionNumber({
      'value': '%DT%',
      'append': {
        'key': '_v',
        'cover': 0,
        'to': ['css', 'js', 'html']
      },
      'output': {
        'file': 'dist/version.json'
      }
    }))
    .pipe(dest('dist'));
}
function includeFile() {
  return src('src/*.html') 
  .pipe(fileInclude({
    prefix: '@@',
    basepath: 'src/htmlBlocks'
  }))
  .pipe(dest('dist'))
  .pipe(browserSync.stream())
}
function browsersync() {
  browserSync.init({
    server: {
      baseDir: 'dist',
    },
  });
}
function watching() {
  watch(['src/scss/style.scss'], styles);
  watch(['src/scss/mediaQueries.scss'], styles);
  watch(['src/js/main.js'], scripts);
  watch('src/media/**/*.*', mediaFiles);
  watch('src/htmlBlocks/**/*.html', includeFile, html );
  watch(['src/*.html'],  includeFile, html).on('change', browserSync.reload);
}
exports.styles = styles;
exports.scripts = scripts;
exports.browsersync = browsersync;
exports.watching = watching;
exports.html = html;
exports.imageOptimization = imageOptimization;
exports.files = files;
exports.fontsStyle = fontsStyle;
exports.mediaFiles = mediaFiles;
exports.convertTTFtoWOFF = convertTTFtoWOFF;
exports.convertTTFtoWOFF2 = convertTTFtoWOFF2;
exports.versionNumberProject = versionNumberProject;
exports.includeFile = includeFile;
exports.build = series(cleanDist, html, includeFile, mediaFiles, files,  imageOptimization, series( convertTTFtoWOFF, convertTTFtoWOFF2,  fontsStyle, styles), versionNumberProject,  scripts);
// exports.default = parallel( html, includeFile, mediaFiles, files, series( convertTTFtoWOFF, convertTTFtoWOFF2,  fontsStyle, styles), scripts,  browsersync, watching);
exports.default = series( html, includeFile, mediaFiles, files, convertTTFtoWOFF, convertTTFtoWOFF2,  fontsStyle, styles, scripts, parallel(browsersync, watching));