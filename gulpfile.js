var gulp = require("gulp");
var babel = require("gulp-babel");
var eslint = require("gulp-eslint");
var merge = require("merge-stream");
var browserSync = require("browser-sync");
var less = require("gulp-less");
var del = require("del");
var filter = require("gulp-filter");
var console = require("console");
var eagerPreload = require("gulp-ui5-eager-preload");
var ui5preload = eagerPreload.componentPreload;

var { join } = require("path");

var babelConfig = require("./.babelrc");

var packageJson = require("./package.json");

var SRC_ROOT = packageJson.ui5.build.src;
var DEST_ROOT = packageJson.ui5.build.dist;

var namespace = packageJson.ui5.namespace;
var resourceRoot = packageJson.ui5.build.resource;

var buildJs = () => {
  // use to avoid an error cause whole gulp failed
  var b = babel(babelConfig).on("error", e => {
    console.log(e.stack);
    b.end();
  });
  var rt = gulp.src([`${SRC_ROOT}/**/*.js`, `!${SRC_ROOT}/**/lib/*.js`]);
  rt = rt.pipe(b);
  return rt;
};

var buildCss = () => {
  return gulp
    .src(`${SRC_ROOT}/**/css/*.less`, { base: `${SRC_ROOT}` })
    .pipe(less());
};

var copy = () => {
  return merge(
    gulp.src(
      [
        `${SRC_ROOT}/**/*`,
        `!${SRC_ROOT}/**/*.js`,
        `!${SRC_ROOT}/index.html`,
        `!${SRC_ROOT}/**/*.less`
      ],
      { base: `${SRC_ROOT}` }
    ),
    gulp.src([`${SRC_ROOT}/**/lib/*`], { base: `${SRC_ROOT}` }),
    gulp.src("./package.json").pipe(
      eagerPreload({
        ui5ResourceRoot: resourceRoot,
        preload: false,
        offline: false,
        sourceDir: join(__dirname, "./src"),
        thirdpartyLibPath: "_thirdparty",
        projectNameSpace: namespace,
        library: true
      })
    )
  );
};

var build = () => {
  var tasks = merge(copy(), buildJs(), buildCss());
  return tasks
    .pipe(gulp.dest(DEST_ROOT))
    .pipe(
      filter([
        "**/*.js",
        "**/*.xml",
        "**/*.properties",
        "**/*.json",
        // remove offline files
        "!**/resources/**/*.*",
        // avoid preload file
        "!**/preload.js"
      ])
    )
    .pipe(ui5preload({ base: `${DEST_ROOT}`, namespace, isLibrary: true }));
};

gulp.task("clean", () => del(DEST_ROOT));

gulp.task("build", () => {
  return build().pipe(gulp.dest(DEST_ROOT));
});

// run gulp lint to auto fix src directory
gulp.task("lint", () => {
  return gulp
    .src([`${SRC_ROOT}/**/*.js`, "!node_modules/**"])
    .pipe(eslint({ fix: true, useEslintrc: true }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest(SRC_ROOT));
});

gulp.task("watch", () => {
  gulp.watch(`${SRC_ROOT}/**/*`, gulp.series(["build", "reload"]));
});

gulp.task("reload", done => {
  browserSync.reload();
  done();
});

gulp.task("build-js", buildJs);

gulp.task("build-css", buildCss);

gulp.task("copy", copy);
