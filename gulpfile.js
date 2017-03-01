'use strict';

var babelify = require('babelify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var cheerio = require('cheerio');
var cp = require('child_process');
var del = require('del');
var derequire = require('gulp-derequire');
var eslint = require('gulp-eslint');
var exit = require('gulp-exit');
var gulp = require('gulp');
var fs = require('fs');
var insert = require('gulp-insert');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var tap = require('gulp-tap');
var uglify = require('gulp-uglify');

var pkg = require('./package');
var jsdoc = 'node_modules/jsdoc/jsdoc.js';

var tests = {
  lint: {
    files: [
      'lib/**/*.js',
      'gulpfile.js',
      '!lib/util/index.js',
      '!lib/util/jsondiff.js'
    ]
  },
  integration: {
    files: 'test/integration/**/*.js',
    index: 'test/integration/index.js'
  },
  unit: {
    files: 'test/unit/**/*.js',
    index: 'test/unit/index.js'
  }
};

var product = {
  source: {
    dir: 'src',
    name: pkg.name + '.js',
    lib: 'lib/**/*.js'
  },
  packaged: {
    dir: 'dist',
    name: pkg.name + '.js',
    minified: pkg.name + '.min.js'
  },
  bundled: {
    dir: 'src',
    name: pkg.name + '-bundle.js'
  },
  license: 'LICENSE'
};

var coverage = {
  dir: product.packaged.dir + '/coverage'
};

var docs = {
  dir: product.packaged.dir + '/docs',
  conf: 'jsdoc.json',
  files: [
    './lib/client.js',
    './lib/channel.js',
    './lib/member.js',
    './lib/message.js',
    './lib/userinfo.js',
    './lib/paginator.js',
    './lib/sessionerror.js',
    './lib/channeldescriptor.js'
  ],
  publicConstructors: ['Client'],
  privateConstructors: ['Channel', 'Member', 'Message', 'UserInfo', 'Paginator',
                        'ChannelDescriptor', 'SessionError']
};

gulp.task('default', function(done) {
  runSequence(
    'clean',
    'lint',
    'unit-test',
    'build',
    'package',
    'doc',
    done
  );
});

gulp.task('doc', function(done) {
  runSequence('generate-jsdoc', 'prettify-jsdoc', done);
});

gulp.task('build', function(done) {
  runSequence('bundle', 'license', done);
});

gulp.task('package', function(done) {
  runSequence('minify', done);
});

gulp.task('clean', function() {
  return del([
    product.packaged.dir + '/' + product.packaged.name,
    product.packaged.dir + '/' + product.packaged.minified,
    docs.dir,
    coverage.dir,
    product.bundled.dir + '/' + product.bundled.name
  ]);
});

gulp.task('lint', function() {
  return gulp.src(tests.lint.files)
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});

gulp.task('istanbul-setup', function() {
  return gulp.src([product.source.lib])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
});

gulp.task('integration-test', function() {
  return gulp.src(tests.integration.index, { read: false })
    .pipe(mocha({ reporter: 'spec', timeout: 10000 }))
    .pipe(exit());
});

gulp.task('unit-test', ['istanbul-setup'], function() {
  return gulp.src(tests.unit.index, { read: false })
    .pipe(mocha({ reporter: 'spec' }))
    .pipe(istanbul.writeReports({
      dir: coverage.dir,
      reporters: ['cobertura', 'lcov', 'text'],
      reportOpts: { dir: coverage.dir }
    }));
    // TODO Enforce a coverage of at least 90% (or X%) percents
    //.pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('bundle', function(done) {
  browserify({ debug: false, standalone: 'Twilio.Chat.Client', entries: ['./lib'] })
    .transform(babelify, {
      global: true,
      ignore: /\/node_modules\/(?!twilio-transport|twilio-notifications|twilsock\/)/,
      presets: ['es2015'],
      plugins: ['transform-runtime']
    })
    .bundle()
    .pipe(source(product.bundled.name))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(gulp.dest(product.bundled.dir))
    .once('error', exit)
    .once('end', done);
});

gulp.task('license', function() {
  var licenseContents = fs.readFileSync(product.license);
  return gulp.src(product.bundled.dir + '/' + product.bundled.name)
    .pipe(insert.prepend(
      '/* ' + pkg.name + '.js ' + pkg.version + '\n'
      + licenseContents
      + '*/\n\n'
    ))
    .pipe(rename(product.packaged.name))
    .pipe(gulp.dest(product.packaged.dir));
});


gulp.task('minify', function() {
  return gulp.src(product.packaged.dir + '/' + product.packaged.name)
    .pipe(uglify({
      output: {
        /* eslint-disable camelcase */
        ascii_only: true
        /* eslint-enable camelcase */
      },
      preserveComments: 'license'
    }))
    .pipe(rename(product.packaged.minified))
    .pipe(gulp.dest(product.packaged.dir));
});

gulp.task('generate-jsdoc', function(cb) {
  //cp.exec(['node', jsdoc, '-d', docs.dir, '-c', docs.conf, docs.files.join(' ')].join(' '), cb);
  cp.exec(['node', jsdoc,
          '-d', docs.dir,
          '-c', docs.conf,
          docs.files.join(' '),
          './README.md',
          '-t ./node_modules/ink-docstrap/template'].join(' '), cb);
});

gulp.task('prettify-jsdoc', function() {

  return gulp.src(docs.dir + '/*.html')
    .pipe(tap(function(file) {
      var $ = cheerio.load(file.contents.toString());

      var filename = file.path.slice(file.base.length);
      var className = filename.split('.html')[0];
      var div;

      // Prefix public constructors.
      if (docs.publicConstructors.indexOf(className) > -1) {
        div = $('.container-overview');
        var name = $('h4.name', div);
        name.html(name.html().replace(/new /, 'new <span style="color: #999">Twilio.Chat.</span>'));
      }

      // Remove private constructors.
      if (docs.privateConstructors.indexOf(className) > -1) {
        div = $('.container-overview');
        $('h2', div).remove();
        $('h4.name', div).remove();
        $('div.description', div).remove();
        $('h5:contains(Parameters:)', div).remove();
        $('table.params', div).remove();
      }

      // Rewrite navigation.
      var nav = $('.nav');
      nav.html([
        '<li class="dropdown">',
           '<a class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">Classes<b class="caret"></b></a>',
           '<ul class="dropdown-menu">',
             '<li><a href="Client.html"><span style="color: #999">Twilio.Chat.</span>Client</a>',
             '<li><a href="ChannelDescriptor.html">ChannelDescriptor</a></li>',
             '<li><a href="Channel.html">Channel</a></li>',
             '<li><a href="Member.html">Member</a></li>',
             '<li><a href="Message.html">Message</a></li>',
             '<li><a href="UserInfo.html">UserInfo</a></li>',
             '<li><a href="Paginator.html">Paginator</a></li>',
           '</ul>',
        '</li>',
        '<li class="dropdown">',
           '<a class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">Exceptions<b class="caret"></b></a>',
           '<ul class="dropdown-menu">',
             '<li><a href="SessionError.html">SessionError</a></li>',
           '</ul>',
        '</li>'
      ].join(''));

      file.contents = new Buffer($.html());
      return file;
    }))
  .pipe(gulp.dest(docs.dir));

});
