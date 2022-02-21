# file-breakpoint-continue

Vue 大文件上传和断点续传(帮忙点赞star谢谢，感谢♥)

文件上传是开发中的难点， 大文件上传及断点续传 难点中的细节及核心技术点。

面试官在考察es6文件对象、ajax 上传， async await promise 、后台文件存储、
流操作等全面的全栈技能的同时， 提升难度到大文件和断点续传， 
通过个主题，就可以较好的考察面试者全面解决问题的能力和技术细节。

移动时代图片成为社交的主流，短视屏时代铁定是大文件 ， 所以在上岗后， 
这个题的知识点是必须掌握清楚点， 所以这是一道非常实在的好考题。

大文件  上传   8M   size 1M  8份
 
## 切片 

1. js 在es6 文件对象file node file stream 有所增强。

任何文件都是二进制， 分割blob 

start,  size, offset  

http请求可并发  n个切片并发上传 速度更快， 改善了体验。

- 前端的切片，让http并发带来上传大文件的快感。

1. file.slice 完成切片， blob 类型文件切片， js 二进制文件类型的 blob协议 
2. 在文件上传到服务器之前就可以提前预览。 
  
- 服务器端

1. 如何将这些切片， 合交成一个， 并且能显示原来的图片
2. stream 流 
3. 可读流， 可写流
4. chunk 都是一个二进制流文件， 
5. Promise.all 来包装每个chunk 的写入
6. start end   fse.createWriteStream 
7. 每个chunk写入 先创建可读流，再pipe给可写流的过程 

思路： 以原文件做为文件夹的名字，在上传blobs到这个文件夹， 
前且每个blob 都以文件-index的命名方式来存储

- http并发上传大文件切片 
- vue 实现上传文件的细节

无论是前端还是后端， 传输文件， 特别是大文件，有可能发生丢失文件的情况，网速， 服务器超时， 

> 如何避免丢失呢？ 

- hash，文件名 并不是唯一的， 不同名的图片 内容是一样， 针对文件内容进行hash 计算
- hash  前端算一个， 单向
- 后端拿到内容算hash 
- 一样， 
- 不一样 重传
- html5特性你怎么理解， localStorage ...

Web Workers  优化我们的前端性能， 将要花大量时间的， 复杂的，放到一个新的线程中去计算

文件上传通过hash 计算， 文件没有问题

- es6 哪些特性， 你怎么用的

函数参数赋默认值 

- 给用户快速感知， 用户体验是核心
- 并发http 前后端体验， 
- 断点续传

? 上传 
hash 
abort 
恢复

```js
yarn init -y

yarn add -g live-server

// web http方式
lastModified: 1644549553742
lastModifiedDate: Fri Feb 11 20xx 11:19:13 GMT+0800 (中国标准时间) {}
name: "banner.png"
size: 138424
type: "image/png"
webkitRelativePath: ""j
```

```js
yarn add multiparty
// 表单文件上传

$ vue --version
@vue/cli 4.5.13
vue create vue-upload-big-file

$ vue create vue-upload-big-file
? Please pick a preset: (Use arrow keys)
? Please pick a preset: Manually select features
? Check the features needed for your project: (Press <space> to select, <a> to t
? Check the features needed for your project: Choose Vue version, Babel
? Choose a version of Vue.js that you want to start the project with (Use arrow
? Choose a version of Vue.js that you want to start the project with 2.x
? Where do you prefer placing config for Babel, ESLint, etc.? (Use arrow keys)
> In dedicated config files
? Where do you prefer placing config for Babel, ESLint, etc.? In package.json
? Save this as a preset for future projects? (y/N) n

yarn add element-ui
```













