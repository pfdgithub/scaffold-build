let gulp = require('gulp');
let util = require('gulp-util');
let fs = require('fs');
let del = require('del');
let glob = require('glob');
let yargs = require('yargs');
let ignore = require('ignore');
let shell = require('shelljs');
let iconv = require('iconv-lite');

let distRootDir = 'dist'; // 构建根目录——全部项目构建文件的目录
let projRootDir = 'projects'; // 项目根目录——全部项目所在的目录
let projIgFile = `${projRootDir}/.buildignore`; // 配置忽略项目——明确过滤不参与构建的项目
let fixMessyCode = false; // 处理乱码（Windows 下 CMD 默认使用 GBK 代码页）

shell.config.silent = true; // 禁用 shelljs 控制台输出
let envEnum = { // 环境枚举
  dev: 'dev',
  test: 'test',
  prod: 'prod'
};
let npmCommand = (yargs.argv.npm && typeof (yargs.argv.npm) === 'string') ? yargs.argv.npm : 'cnpm'; // 默认 npm 命令
let validDay = (yargs.argv.day && typeof (yargs.argv.day) === 'number') ? yargs.argv.day : 30; // 有效时间间隔（天）——在此时间段内的修改过的项目认为有效

// 输出日志
let log = (name, ...message) => {
  util.log(`Log in plugin '[ROOT] ${name}'`, '\nMessage:\n    ', ...message);
};

// 获取错误
let getError = (name, message) => {
  return new util.PluginError(`[ROOT] ${name}`, message, {
    // showStack: true
  });
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

// 获取忽略项目名
let getIgnoreProjects = () => {
  let str = fs.readFileSync(projIgFile).toString();

  let ig = ignore().add(str);
  log('getIgnoreProjects', ig);

  return ig;
};

// 获取全部项目名
let getAllProjects = () => {
  let projects = glob.sync(`${projRootDir}/*/`);
  log('getAllProjects', projects);

  return projects;
};

// 检查项目 git 日志
let checkProjectGitLog = (project) => {
  let pass = false;
  let date = new Date(Date.now() - (validDay * 24 * 60 * 60 * 1000)).toISOString();
  let command = `git log -1 --pretty=format:"%H(%ai)" --after="${date}" -- "${project}"`;

  log('checkProjectGitLog', project, command);

  let shellObj = shell.exec(command, {
    encoding: fixMessyCode ? 'base64' : 'utf8'
  });

  let code = shellObj.code;
  let stderr = shellObj.stderr;
  let stdout = shellObj.stdout;
  if (code !== 0 && stderr.length > 0) {
    stderr = fixMessyCode ? iconv.decode(iconv.encode(stderr, 'base64'), 'GBK') : stderr;
    throw getError('checkProjectGitLog', stderr);
  }
  else if (stdout.length > 0) {
    pass = true;
    stdout = fixMessyCode ? iconv.decode(iconv.encode(stdout, 'base64'), 'GBK') : stdout;
    log('checkProjectGitLog', project, stdout);
  }
  else {
    log('checkProjectGitLog', project, 'No output');
  }

  return pass;
};

// 获取有效项目
let getValidProjects = () => {
  let validProjects = [];
  let ig = getIgnoreProjects();
  let projects = getAllProjects();
  let filterProjects = projects.filter(ig.createFilter());
  filterProjects.forEach((project) => {
    let pass = checkProjectGitLog(project);
    pass && validProjects.push(project);
  });

  log('getValidProjects', validProjects);

  return validProjects;
};

// 检查 npm 和 gulp 配置
let checkNpmGulpCfg = (project) => {
  let pkgfile = `${project}package.json`;
  let gulpfile = `${project}gulpfile.js`;
  let exists = {
    pkgfile: fs.existsSync(pkgfile),
    gulpfile: fs.existsSync(gulpfile)
  };

  log('checkNpmGulpCfg', project, exists);

  return exists;
};

// 安装 npm 依赖
let npmInstall = (project) => {
  let command = `${npmCommand} install`;

  log('npmInstall', project, command);

  let shellObj = shell.exec(command, {
    cwd: project,
    encoding: fixMessyCode ? 'base64' : 'utf8'
  });

  let code = shellObj.code;
  let stderr = shellObj.stderr;
  let stdout = shellObj.stdout;
  if (code !== 0 && stderr.length > 0) {
    stderr = fixMessyCode ? iconv.decode(iconv.encode(stderr, 'base64'), 'GBK') : stderr;
    throw getError('npmInstall', stderr);
  }
  else if (stdout.length > 0) {
    stdout = fixMessyCode ? iconv.decode(iconv.encode(stdout, 'base64'), 'GBK') : stdout;
    log('npmInstall', project, stdout);
  }
  else {
    log('npmInstall', project, 'No output');
  }
};

// 执行 npm 脚本
let npmScript = (project, script, args) => {
  let command = `npm run ${script || ''} -- ${args || ''}`;

  log('npmScript', project, command);

  let shellObj = shell.exec(command, {
    cwd: project,
    encoding: fixMessyCode ? 'base64' : 'utf8'
  });

  let code = shellObj.code;
  let stderr = shellObj.stderr;
  let stdout = shellObj.stdout;
  if (code !== 0 && stderr.length > 0) {
    stderr = fixMessyCode ? iconv.decode(iconv.encode(stderr, 'base64'), 'GBK') : stderr;
    throw getError('npmScript', stderr);
  }
  else if (stdout.length > 0) {
    stdout = fixMessyCode ? iconv.decode(iconv.encode(stdout, 'base64'), 'GBK') : stdout;
    log('npmScript', project, stdout);
  }
  else {
    log('npmScript', project, 'No output');
  }
};

// 执行 gulp 任务
let gulpTask = (project, task, args) => {
  let command = `gulp ${task || ''} ${args || ''}`;

  log('gulpTask', project, command);

  let shellObj = shell.exec(command, {
    cwd: project,
    encoding: fixMessyCode ? 'base64' : 'utf8'
  });

  let code = shellObj.code;
  let stderr = shellObj.stderr;
  let stdout = shellObj.stdout;
  if (code !== 0 && stderr.length > 0) {
    stderr = fixMessyCode ? iconv.decode(iconv.encode(stderr, 'base64'), 'GBK') : stderr;
    throw getError('gulpTask', stderr);
  }
  else if (stdout.length > 0) {
    stdout = fixMessyCode ? iconv.decode(iconv.encode(stdout, 'base64'), 'GBK') : stdout;
    log('gulpTask', project, stdout);
  }
  else {
    log('gulpTask', project, 'No output');
  }
};

// 复制 project 目录
let copyProject = (project) => {
  let projName = project.split('/')[1];
  let src = [`${project}**`, `!${project}**/node_modules`, `!${project}**/node_modules/**/*`];
  let dest = `${distRootDir}/${projName}/`;

  log('copyProject', project, src, dest);

  return gulp.src(src).pipe(gulp.dest(dest));
};

// 复制构建目录
let copyDist = (project) => {
  let projName = project.split('/')[1];
  let src = [`${project}${distRootDir}/**`, `!${project}${distRootDir}/**/node_modules`, `!${project}${distRootDir}/**/node_modules/**/*`];
  let dest = `${distRootDir}/${projName}/`;

  log('copyDist', project, src, dest);

  return gulp.src(src).pipe(gulp.dest(dest));
};

// 清理构建文件
let cleanBuild = (cb) => {
  del([`${distRootDir}/**`, `${projRootDir}/*/${distRootDir}/**`], {
    dryRun: false
  }).then((paths) => {
    log('cleanBuild', paths.join('\n'));
    cb();
  }).catch((err) => {
    let gErr = getError('cleanBuild', err);
    cb(gErr);
  });
};

// 项目状态
let projectState = () => {
  let validProjects = getValidProjects();
  validProjects.forEach((project) => {
    let exists = checkNpmGulpCfg(project);

    if (exists.pkgfile || exists.gulpfile) {
      if (exists.pkgfile) {
        log('projectState', project, 'Call [npmInstall]');
      }
      if (exists.gulpfile) {
        log('projectState', project, 'Call [gulpTask]');
      }
      log('projectState', project, 'Call [copyDist]');
    }
    else {
      log('projectState', project, 'Call [copyProject]');
    }
  });
};

// 构建项目
let buildProject = () => {
  let env = getProcessEnv();
  let args = `--env=${env}`;

  let validProjects = getValidProjects();
  validProjects.forEach((project) => {
    let exists = checkNpmGulpCfg(project);

    if (exists.pkgfile || exists.gulpfile) {
      if (exists.pkgfile) {
        npmInstall(project);
      }
      if (exists.gulpfile) {
        gulpTask(project, 'build', args);
      }
      copyDist(project);
    }
    else {
      copyProject(project);
    }
  });
};

gulp.task('clean', (cb) => {
  cleanBuild(cb);
});

gulp.task('state', ['clean'], () => {
  projectState();
});

gulp.task('build', ['clean'], () => {
  buildProject();
});

gulp.task('default', () => {
  log('default', 'Please use npm script');
});
