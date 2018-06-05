let gulp = require('gulp');
let gLog = require('fancy-log');
let gError = require('plugin-error');
let through = require('through2');
let filter = require("gulp-filter");
let uglify = require("gulp-uglify");
let replace = require("gulp-replace");
let sourcemaps = require('gulp-sourcemaps');
let minifyCss = require("gulp-minify-css");
let minifyHtml = require("gulp-minify-html");
let del = require('del');
let yargs = require('yargs');
let glob = require('glob');
let shell = require('shelljs');

let pkg = require('./package.json');

// 环境枚举
let envEnum = {
  dev: 'dev',
  test: 'test',
  prod: 'prod'
};
let src = 'src'; // 源文件目录
let dist = 'dist'; // 构建文件目录
let map = 'sourceMap'; // sourceMap 目录
let maxRecursiveDepth = 3; // 最大递归深度
let validDay = (yargs.argv.day && typeof (yargs.argv.day) === 'number') ? yargs.argv.day : 30; // 有效时间间隔（天）——在此时间段内的修改过的项目认为有效
shell.config.silent = true; // 禁用 shelljs 控制台输出

// 过滤第三方库
let thirdparty = filter(['**', `!${src}/lib/**`, `!${src}/**/jquery*`, `!${src}/**/echarts/**`], {
  restore: true
});
// 过滤 js 文件
let jsFilter = filter([`${src}/**/*.js`], {
  restore: true
});
// 过滤 css 文件
let cssFilter = filter([`${src}/**/*.css`], {
  restore: true
});
// 过滤 html 文件
let htmlFilter = filter([`${src}/**/*.html`], {
  restore: true
});

// 输出日志
let log = (name, ...message) => {
  gLog(`Log in plugin '${name}'`, '\nMessage:\n    ', ...message);
};

// 获取错误
let getError = (name, message) => {
  return new gError(`${name}`, message, {
    // showStack: true
  });
};

// 获取 package 中版本号
let getPkgVersion = () => {
  let ver = pkg && pkg.version;

  log('getPkgVersion', ver);

  return ver;
};

// 获取环境参数
let getProcessEnv = () => {
  let env = undefined;
  let argv = yargs.argv;

  if (argv.env && envEnum[argv.env]) {
    env = envEnum[argv.env];
  }

  if (env) {
    log('getProcessEnv', env);
  }
  else {
    throw getError('getProcessEnv', 'Invalid environment type (e.g. --env=prod)');
  }

  return env;
};

// 获取子路径
let getSubPaths = (path) => {
  let subPaths = glob.sync(`${path}*/`);

  // log('getSubPaths', subPaths);

  return subPaths;
};

// 检查 git 日志
let checkGitLog = (dir) => {
  let pass = false;
  let date = new Date(Date.now() - (validDay * 24 * 60 * 60 * 1000)).toISOString();
  let command = `git log -1 --pretty=format:"%H(%ai)" --after="${date}" -- "${dir}"`;

  // log('checkGitLog', dir, command);

  let shellObj = shell.exec(command);

  let code = shellObj.code;
  let stderr = shellObj.stderr;
  let stdout = shellObj.stdout;
  if (code !== 0 && stderr.length > 0) {
    throw getError('checkGitLog', stderr);
  }
  else if (stdout.length > 0) {
    pass = true;
    // log('checkGitLog', dir, stdout);
  }
  else {
    // log('checkGitLog', dir, 'No output');
  }

  return pass;
};

// 获取有效路径
let recursiveDepth = 0; // 当前递归深度
let getValidPaths = (path) => {
  recursiveDepth++; // 深度增加
  let validSubPaths = [];
  let pass = checkGitLog(path);

  // log('getValidPaths', recursiveDepth, path, pass);

  if (pass) { // 当前路径有效
    if (recursiveDepth < maxRecursiveDepth) { // 下一级路径不能太深
      let subPaths = getSubPaths(path); // 获取子路径
      subPaths.forEach((subPath) => { // 遍历子路径
        let subPathObj = getValidPaths(subPath); // 递归调用
        validSubPaths.push(subPathObj);
      });
    }
  }

  recursiveDepth--; // 深度减少
  return {
    path: path, // 当前路径名
    hasLog: pass, // 当前路径是否有 git 日志
    subPaths: validSubPaths // 有效下级路径列表
  };
};

// 获取待处理来源
let getSourcePaths = (pathObj) => {
  let sourcePaths = [];

  if (pathObj.hasLog) { // 有 git 日志，认为该目录下文件有效
    if (pathObj.subPaths.length == 0) { // 没有子路径，有可能是没有子目录，也有可能是超出了递归深度。
      sourcePaths.push(`${pathObj.path}**`); // 获取该路径下所有文件和文件夹。
    }
    else { // 有子路径
      sourcePaths.push(`${pathObj.path}*`); // 获取该路径下所有文件。

      pathObj.subPaths.forEach((subPathObj) => { // 遍历子路径
        let sourceSubPaths = getSourcePaths(subPathObj); // 递归调用
        sourcePaths = sourcePaths.concat(sourceSubPaths);
      });
    }
  }

  return sourcePaths;
};

// 获取来源
let getSource = () => {
  let validPathObj = getValidPaths(`${src}/`);

  log('getSource', JSON.stringify(validPathObj));

  let sourcePaths = getSourcePaths(validPathObj);

  log('getSource', JSON.stringify(sourcePaths));

  return sourcePaths;
};

// 路径状态
let pathState = () => {
  getSource();
};

// 替换预定义文本
let defineText = () => {
  let ver = getPkgVersion();

  let defineObj = {
    '__WD_DEFINE_VER__': JSON.stringify(ver)
  };

  return replace(/__WD_(\w+)__/g, function (match, p1, offset, string) {
    let file = this.file.relative;
    let text = defineObj[match] || match;

    log('defineText', `${match} is replaced by ${text} in file ${file}`);

    return text;
  }, { skipBinary: true });
};

// 复制文件
let copy = () => {
  let ver = getPkgVersion();
  let targetPath = `${dist}/${ver}/`;

  let sourcePaths = getSource();
  // let sourcePaths = [`${src}/**`];

  return gulp.src(sourcePaths, {
    base: src
  }).pipe(thirdparty) // 过滤第三方库
    .pipe(defineText()) // 替换字符串
    .pipe(thirdparty.restore) // 复制其他文件
    .pipe(gulp.dest(targetPath));
};

// 压缩文件
let minify = (debug) => {
  let ver = getPkgVersion();
  let targetPath = `${dist}/${ver}/`;

  let sourcePaths = getSource();
  // let sourcePaths = [`${src}/**`];

  return gulp.src(sourcePaths, {
    base: src
  }).pipe(thirdparty) // 过滤第三方库
    .pipe(defineText()) // 替换字符串
    .pipe(jsFilter) // 压缩 js 文件
    .pipe(debug ? sourcemaps.init() : through.obj()) // 生成 sourceMap
    .pipe(uglify())
    .pipe(debug ? sourcemaps.write(map) : through.obj())
    .pipe(jsFilter.restore)
    .pipe(cssFilter) // 压缩 css 文件
    .pipe(minifyCss())
    .pipe(cssFilter.restore)
    // .pipe(htmlFilter) // 压缩 html 文件
    // .pipe(minifyHtml())
    // .pipe(htmlFilter.restore)
    .pipe(thirdparty.restore) // 复制其他文件
    .pipe(gulp.dest(targetPath));
};

// 清理构建文件
let cleanBuild = (cb) => {
  let buildOutput = [`${dist}/**`];
  del(buildOutput, {
    dryRun: false
  }).then((paths) => {
    log('cleanBuild', `${buildOutput} has been cleaned`);
    cb();
  }).catch((err) => {
    let gErr = getError('cleanBuild', err);
    cb(gErr);
  });
};

// 构建项目
let buildProject = () => {
  let env = getProcessEnv();

  if (env == envEnum.prod) { // 生产环境压缩
    return minify();
  }
  else if (env == envEnum.test) { // 测试生成 sourceMap
    return minify(true);
  }
  else { // 其他环境直接复制
    return copy();
  }
};

// 清理目录
gulp.task('clean', (cb) => {
  cleanBuild(cb);
});

// 测试有效目录
gulp.task('state', ['clean'], () => {
  pathState();
});

// 构建项目
gulp.task('build', ['clean'], () => {
  return buildProject();
});

// 默认任务
gulp.task('default', () => {
  log('default', 'Please use npm script');
});
