# 项目说明

脚手架，不同业务类型的构建方案。  

# 分支说明

activity 活动类型的构建方案。  
legacy 遗留项目的构建方案。  
simple 最简化的构建方案。  

# 方案说明

最简化方案，只提供压缩和多版本支持，其他功能需自行定制。  

# 目录结构

dist/ 项目构建目录。  
dist/1.0.0/ 项目构建版本目录。  
src/ 项目源文件目录。  
gulpfile.js 项目 gulp 配置文件。  
package.json 项目 npm 配置文件。  

# 常用命令

建议以 package.json 文件的 scripts 节点作为命令行入口。  

npm run clean 清理项目构建目录。  
npm run server 启动本地静态服务器。  
npm run build:dev 构建项目（开发环境）。  
npm run build:test 构建项目（测试环境）。  
npm run build:prod 构建项目（生产环境）。  

# 构建流程

1. 根据环境参数 --env 的值，获取当前构建环境。  
2. 生产环境混淆，测试环境混淆并生成 sourceMap 文件，开发环境直接复制文件。  
3. 从 package.json 中获取项目版本，作为构建版本目录。  
4. 混淆或复制来源目录中文件和文件夹，至项目构建版本目录。  
