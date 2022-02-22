# 确保脚本抛出遇到的错误
set -e

# 打包生成静态文件
yarn build
printf "打包成功\n"

# 进入打包好的文件夹
cd dist

# 静态页面上传
# 创建git的本地仓库，提交修改
git init
git checkout -b dist
git add -A
git commit -m 'deploy'
printf "本地提交成功\n"
git push -f https://github.com/webVueBlog/file-breakpoint-continue.git dist

printf "dist目录上传成功\n"
