# 项目说明

脚手架，不同业务类型的构建方案。  

# 分支说明

activity 活动类型的构建方案。  
legacy 遗留项目的构建方案。  
simple 最简化的构建方案。  

# 方案说明

活动类型，构建方案。  
活动的特点是高频率，低技术要求，短生命周期，会产生大量废弃项目。  
针对这些特点，该方案只处理有效项目，不限定每个项目的技术选型，只需按照约定放置构建脚本和输出文件即可。  
项目需要放置于 projects/ 目录中，可使用 projects/.buildignore 忽略指定项目目录。  
若项目不需要 npm 和 gulp 处理，则可直接将文件放置于 projects/XXX/ 目录中。构建后该目录中文件（夹）将被复制到 dist/XXX/ 目录。  
若项目需要 npm 和 gulp 处理，则必须存在 projects/XXX/gulpfile.js 和 projects/XXX/package.json 文件。构建后 projects/XXX/dist/ 中文件（夹），将被复制到 dist/XXX/ 目录   

# 目录结构

dist/ [多]项目构建根目录。  
dist/XXX/ [单]项目构建目录。  

projects/ [多]项目源文件根目录。  
projects/.buildignore 明确过滤不参与构建的项目。  

gulpfile.js [多]项目 gulp 配置文件。  
package.json [多]项目 npm 配置文件。  

projects/XXX/ [单]项目源文件目录。  
projects/XXX/dist/ [单]项目构建目录。  
projects/XXX/gulpfile.js [单]项目 gulp 配置文件。  
projects/XXX/package.json [单]项目 npm 配置文件。  

# 常用命令

建议以 package.json 文件的 scripts 节点作为命令行入口。  

npm run clean 清理[多]项目构建根目录和[单]项目构建目录。  
npm run state 检查可参与构建的有效项目列表。  
npm run server 启动本地静态服务器。  
npm run build:dev 构建项目（开发环境）。  
npm run build:test 构建项目（测试环境）。  
npm run build:prod 构建项目（生产环境）。  

# 构建流程

1. 检查环境参数 --env 的值，准备传递给有效项目的构建脚本。  
2. 解析 projects/.buildignore 文件，获取不参与构建的项目列表。  
3. 获取 projects/ 目录下的子目录列表，作为全部项目列表。  
4. 在全部项目列表中排除被忽略的项目，得到过滤后的项目列表。  
5. 遍历过滤后的项目列表，检查该项目目录在最近几天的 Git 日志，有记录才认为有效，得到有效项目列表。  
6. 遍历有效项目列表，检查是否存在 projects/XXX/gulpfile.js 和 projects/XXX/package.json 文件。  
7. 如果不存在，直接复制 projects/XXX/ 中文件（夹），至 dist/XXX/ 目录。  
8. 如果存在，在该项目目录先执行 cnpm install 安装 npm 依赖，再执行 gulp build --env=<dev|test|prod> 调用构建任务，最后复制 projects/XXX/dist/ 中文件（夹），至 dist/XXX/ 目录。  
9. 重复每个有效项目的构建流程，直至全部结束。  
