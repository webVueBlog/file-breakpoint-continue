## 实现大文件上传和断点续传实践经验总结

实现文件上传，大文件，以及如何断点续传等技术实现细节，我会每个细节，每个代码都写出来，一起调试，一起跟着步骤一一实现。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1913f810083f4f74aa7063fa1bbe2cad~tplv-k3u1fbpfcp-watermark.image?)

## 大文件上传技术要点分析

技术要点分析：

- `e6`文件对象，`ajax`上传，`async await promise`，后台文件存储，流操作（写入到服务器里面去）。
- 一个文件传统上传 `8M`，现在文件上传一般很大的文件，就要考虑切片问题，实现大文件上传。
- `js` 在 `es6` 文件对象 `file node stream` 有所增强。任何文件都是二进制，分隔`blob`（文件的一种类型）。
- 一个大的文件可以分解为从哪个位置开始 `start`，每一块多小`size，offset`。
- `http`请求，`n`个切片可以并发上传。核心利用 `Blob.prototype.slice` 方法，调用的`slice`方法可以返回 原文件的某个切片。（速度更快，改善了体验）
- 预先设置好的切片最大数量将文件切分为一个个切片，然后借助`http`的可并发性，同时上传多个切片，这样从原本传一个大文件，变成了同时传多个小的文件切片，可以大大减少上传时间。
- 由于是并发，传输到服务器的顺序可能会发生变化，所以我们还需要给每个切片记录顺序。(前端的切片上传，让`http`并发带来上传大文件的快感。

## 大文件上传前端

创建`big_file_upload`目录文件，初始化`node`的项目： `npm init -y`，生成`package.json`文件。创建`file_slice.html`文件，模拟文件上传，切片的过程，以及说明代码的意义。

`live-server`启动一下我们本地的服务器，它是`npm`的一个包，可以下载`npm i -g live-server`。也可以下载`vs code`里`live server`插件。启动`.html`文件。

## file_slice文件

`file_slice.html`代码：

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title></title>
	</head>
	<body>
		<input type="file" id="file">
		<script>
			document.getElementById('file')
			.addEventListener('change', (event) => {
				const file = event.target.files[0]; // es6 文件对象
				// console.log(file);
				// console.log(Object.prototype.toString.call(file)); // [object File]
				// console.log(Object.prototype.toString.call(file.slice(0, 102400))); // [object Blob]
				let cur = 0, size = 1024*1024; // 1M
				// blob等待上传的对象，所有的切片上传完
				const fileChunkList = []; // blob数组
				while(cur < file.size) {
					fileChunkList.push({
						// cur start offset end
						file: file.slice(cur, cur + size)
					});
					cur += size;
				}
				console.log(fileChunkList)
			})
		</script>
	</body>
</html>
```

- `file.slice`完成切片，`blob`类型文件切片，`js`二进制文件类型的`blob`协议。在文件上传到服务器之前就可以提前预览。

```js
返回文档最后修改的日期和时间  lastModified: xxxx891269598
返回文档最后修改的日期和时间  lastModifiedDate: Tue Feb 15 xxxx 10:14:29 GMT+0800 (中国标准时间) {}
名字  name: "JavaScript高级程序设计（第4版）.pdf"
大小  size: 14355650
类型  type: "application/pdf"
网络工具包相对路径  webkitRelativePath: ""
```

```js
size: 102400
type: ""
[[Prototype]]: Blob
```

```js
(14) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
0: {file: Blob}
1: {file: Blob}
2: {file: Blob}
3: {file: Blob}
4: {file: Blob}
5: {file: Blob}
6: {file: Blob}
7: {file: Blob}
8: {file: Blob}
9: {file: Blob}
10: {file: Blob}
11: {file: Blob}
12: {file: Blob}
13: {file: Blob}
length: 14
```

## Blob.slice

`Blob.slice()` 方法用于创建一个包含源 `Blob` 的指定字节范围内的数据的新 `Blob` 对象。

> 返回值

一个新的 `Blob` 对象，它包含了原始 `Blob` 对象的某一个段的数据。

## blob文件

同目录下创建 `blob.html`文件，代码：

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title></title>
	</head>
	<body>
		<img src="" alt="" id="pic" width="350px">
		<input type="file" id="file" />
		<script>
			// es6 file对象 blob blob:// 在文件上传解决的问题。
			// 传统es5时代文件只有上传到服务器后，静态服务提供一个远程地址给我们，才能够看到我们上传的这张图片。
			// es6在本地客户端操作文件的能力  file对象。
			// blob 协议在本地就把它立马显示出来，配上上传进度，更好的用户体验。
			document.getElementById('file').addEventListener('change', (e) => {
				const file = e.target.files[0];
				const URL = window.URL;
				const objectUrl = URL.createObjectURL(file);
				console.log(objectUrl);

				const pic = document.getElementById('pic');
				pic.src = objectUrl;
				pic.onload = function() {
					URL.revokeObjectURL(objectUrl); // 协议地址 释放
				}
			})
		</script>
	</body>
</html>
```

预览效果：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df5d7a13063649b1b264f5d6b57297d0~tplv-k3u1fbpfcp-watermark.image?)

## 思路步骤

切片，`target`目标后端文件下以名字为目录的文件；服务器端，如恶化将这些切片，合并成一个，并且显示原来的图片，对于服务器端`node`流 `stream` 的概念。

开始在`big_file_upload`文件下创建`server`目录，初始化一下`npm init -y`，生成`package.json`文件，添加一下我们的入口文件，`index.js`文件。

创建文件目录：

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a118a7e0c5d54e8a8c6f0f3a9f1b0954~tplv-k3u1fbpfcp-watermark.image?)

说明：`server`后端服务，`target`存储文件，某文件下等

`server`目录下的`index.js`文件代码：

```js
const path = require('path'); // 路径
const fse = require('fs-extra'); // fs扩展包
// 上传目录
const UPLOAD_DIR = path.resolve(__dirname, ".", "target"); // server/target
// console.log(UPLOAD_DIR);
const filename = 'da';
const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.mp3`); // 路径
console.log(filePath); // 根目录下

const pipeStream = (path, writeStream) =>
 new Promise(resolve => {
  const readStream = fse.createReadStream(path);
  readStream.on('end',() => {
   fse.unlinkSync(path); // 移除
   resolve();
  })
  readStream.pipe(writeStream);
 })

const mergeFileChunk = async (filePath, filename, size) => {
 // console.log(filePath, filename, size)
 // 大文件上传时，设计后端思想时每个要上传的文件，先以文件名，
 // 为target目录名，把分文件blob，放入这个目录
 // 文件blob上传前要加上index
 // node 文件合并肯定可以的，stream
 const chunkDir = path.resolve(UPLOAD_DIR, filename);
 // console.log(chunkDir);
 const chunkPaths = await fse.readdir(chunkDir);
 // console.log(chunkPaths); // 路径下的数组文件名
 chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
 // console.log(chunkPaths, '++');
 // 每块内容写入最后的文件，promise
 await Promise.all(
  chunkPaths.map((chunkPath, index) =>
   pipeStream(
    // 回流的方法
    path.resolve(chunkDir, chunkPath),
    fse.createWriteStream(filePath, {
     start: index * size,
     end: (index + 1) * size
    })
   )
  )
 )
 // console.log('文件合并成功');
 fse.rmdirSync(chunkDir); // 删除
}

mergeFileChunk(filePath, filename, 0.5*1024*1024);
```

- `fs`提供文件的读写，删除，文件的移动，文件的目录，文件的目录查看等等
- `yarn add fs-extra`
- `yarn global add nodemon`
- `stream`流
- 可读流，可写流
- `chunk`都是一个二进制流文件
- `Promise.all` 来包装每个`chunk`的写入
- `start end` `fse createWriteStream`
- 每个`chunk`写入 先创建可读流，再`pipe`给可写流的过程。

思路：以原文件做为文件夹的名字，在上传`blobs`到这个文件夹，前且每个`blob` 都以文件-`index`的命名方式来存储。

## http并发上传大文件切片

修改`file_slice.html`文件：

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title></title>
	</head>
	<body>
		<input type="file" id="file">
		<script>
			// 请求封装
			// http并发文件上传 blob上传 chunk POST
			// 当blob Promise.All 再发送一个merge的请求 /merge
			function request({
				url,
				method = 'POST',
				data,
				headers = {},
				requestList // 上传的文件列表
			}) {
				return new Promise(resolve => {
					const xhr = new XMLHttpRequest(); // js ajax 对象
					xhr.open(method, url); // 请求
					Object.keys(headers).forEach(key => {
						xhr.setRequestHeader(key, headers[key]) // 请求加头信息
					})
					xhr.send(data);
					xhr.onload = e => {
						// 事件监听
						resolve({
							data: e.target.response
						})
					}
				})
			}

			document.getElementById('file')
			.addEventListener('change', async (event) => {
				const file = event.target.files[0]; // es6 文件对象
				// console.log(file);
				const file_name = file.name.split('.')[0];
				// console.log(Object.prototype.toString.call(file)); // [object File]
				// console.log(Object.prototype.toString.call(file.slice(0, 102400))); // [object Blob]
				let cur = 0, size = 1024*1024; // 1M
				// blob等待上传的对象，所有的切片上传完
				const fileChunkList = []; // blob数组
				while(cur < file.size) {
					fileChunkList.push({
						// cur start offset end
						file: file.slice(cur, cur + size)
					});
					cur += size;
				}
				console.log(fileChunkList)
				const requestList = fileChunkList.map(({file}, index) => {
					// 请求的数组
					const formData = new FormData(); // js post form
					formData.append('chunk', file);
					formData.append('filename', `${file_name}-${index}`);
					return {
						formData
					};
				})
				.map(async ({ formData }) => request({
					 url: 'http://localhost:3000', // 前后端的api
						data: formData
					}))
				await Promise.all(requestList); // 并发吧
				// console.log(requestList);
			})
		</script>
	</body>
</html>
```

`server`目录下，创建`main.js`文件，处理提交:

- 下载`yarn add multiparty`

```js
const http = require('http');
const path = require('path');
const multiparty = require('multiparty');
const fse = require('fs-extra');
const server = http.createServer();

const UPLOAD_DIR = path.resolve(__dirname, '.', 'target');

server.on('request', async (req, res) => {
 res.setHeader("Access-Control-Allow-Origin", "*");
 res.setHeader("Access-Control-Allow-Headers", "*");
 // res.end("hello");

 if (req.url == '/') {
  // chunk, name
  const multipart = new multiparty.Form();
  // console.log(multipart)
  multipart.parse(req, async (err, fields, files) => {
   if (err) {
    return;
   }
   // console.log(files);

   const [chunk] = files.chunk; // 拿到了文件块
   const [filename] = fields.filename; // 文件名
   // 块名
   // console.log(filename);

   const dir_name = filename.split('-')[0];
   const chunkDir = path.resolve(UPLOAD_DIR, dir_name);
   if (!fse.existsSync(chunkDir)) {
    await fse.mkdirs(chunkDir)
   }
   // chunk.path
   // 把chunk放入目录
   await fse.move(chunk.path, `${chunkDir}/${filename}`);
  })
 } else if (req.url == '/merge/') {
  // 合并
  res.end('OK');
 }
})

server.listen(3000, () => console.log('正在监听3000端口'))
```

```js
Form {
  _writableState: WritableState {
    objectMode: false,
    highWaterMark: 16384,
    finalCalled: false,
    needDrain: false,
    ending: false,
    ended: false,
    finished: false,
    destroyed: false,
    decodeStrings: true,
    defaultEncoding: 'utf8',
    length: 0,
    writing: false,
    corked: 0,
    sync: true,
    bufferProcessing: false,
    onwrite: [Function: bound onwrite],
    writecb: null,
    writelen: 0,
    afterWriteTickInfo: null,
    buffered: [],
    bufferedIndex: 0,
    allBuffers: true,
    allNoop: true,
    pendingcb: 0,
    prefinished: false,
    errorEmitted: false,
    emitClose: false,
    autoDestroy: true,
    errored: null,
    closed: false
  },
  _events: [Object: null prototype] { newListener: [Function (anonymous)] },
  _eventsCount: 1,
  _maxListeners: undefined,
  error: null,
  autoFields: false,
  autoFiles: false,
  maxFields: 1000,
  maxFieldsSize: 2097152,
  maxFilesSize: Infinity,
  uploadDir: 'C:\\Users\\xxx\\xxx\\Local\\xxx',
  encoding: 'utf8',
  bytesReceived: 0,
  bytesExpected: null,
  openedFiles: [],
  totalFieldSize: 0,
  totalFieldCount: 0,
  totalFileSize: 0,
  flushing: 0,
  backpressure: false,
  writeCbs: [],
  emitQueue: [],
  [Symbol(kCapture)]: false
}
```

## 断点续传

1. 服务器端返回，告知我从那开始
2. 浏览器端自行处理

> 缓存处理

1. 在切片上传的`axios`成功回调中，存储已上传成功的切片
2. 在切片上传前，先看下`localstorage`中是否存在已上传的切片,并修改`uploaded`
3. 构造切片数据时，过滤掉`uploaded`为`true`的

> 垃圾文件清理

1. 前端在localstorage设置缓存时间，超过时间就发送请求通知后端清理碎片文件，同时前端也要清理缓存。
2. 前后端都约定好，每个缓存从生成开始，只能存储12小时，12小时后自动清理

1. 为每个文件切割块添加不同的标识, `hash`
2. 当上传成功后，记录上传成功的标识
3. 当我们暂停或者发送失败后，可以重新发送没有上传成功的切割文件

创建vue项目：`vue create vue-upload-big-file`.

```js
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

在`main.js`中引入`element-ui`,代码如下：

```js
import Vue from 'vue
import App from './App.vue'
import ElementUI from 'element-ui
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI);

Vue.config.productionTip = false

new Vue({
 render: h => h(App),
 }).$mount('#app')
```

`App.vue`代码清理如下：

```js
<template>
 <div id="app">
 </div>
</template>

<script>
export default {
 name: 'app',
 components: {
 }
}
</script>
```

`App.vue`代码实现：

```js
async calculateHash (fileChunkList) {
 return new Promise(resolve => {
  // 需要花时间的任务
  // web workers
  // js 单线程的 UI 线程
  // html5 web workers 单独开一个线程 独立于 worker
  // 回调
  this.container.worker = new Worker('/hash.js');
  this.container.worker.postMessage({ fileChunkList });
  this.container.worker.onmessage = e => {
   console.log(e.data);
  }
 })
}

async handleUpload (e) {
 // 大量的任务
 if (!this.container.file) return;
 this.status = Status.uploading;
 const fileChunkList = this.createFileCHunk(this.container,file);
 this.container.hash = await this.calculateHash(fileChunkList);
}

createFileCHunk (file, size = SIZE) {
 const fileChunkList = [];
 let cur = 0;
 while (cur < file.size) {
  fileChunkList.push({
   file: file.slice(cur, cur + size)
  });
  cur += size;
 }
 return fileChunkList;
}

handleFileChange(e) {
 // 分隔文件
 const [ file ] = e.target.files; // 拿到第一个文件
 // console.log(e.target.files);
 this.container.file = file;
}
```

无论时前端还是后端，要考虑传输文件，特别是大文件，有可能发生丢失文件的情况，网速卡顿，服务器超时，如何避免丢失的情况。`hash`

当点击上传按钮时候，调用`createFileChunk`将文件进行切片，切片数量通过文件大小控制，这里设置默认值大小，进行默认值大小的进行切片

`createFileChunk`内使用`while`循环和`slice`方法将切片放入`fileChunkList`数组中返回

在生成文件切片时，需要给每个切片一个标识作为`hash`，这里使用文件名+下标，这样后端可以知道切片是第几个切片，用于之后的合并切片

## FormData.append()

发送数据用到了 `FormData`

`formData.append(name, value, filename)`，其中 `filename` 为可选参数，是传给服务器的文件名称， 当一个 `Blob 或 File` 被作为第二个参数的时候， `Blob` 对象的默认文件名是 `"blob"`。 

## 什么叫hash呢

什么叫`hash`呢？文件名，并不是唯一的，`1.jpg`图片，`1.jpg`图片，或 `2.jpg`图片 一样的内容。- 不同名的图片，内容是一样的。针对文件内容进行 `hash`计算。丢失重传。

随后调用`uploadChunks`上传所有的文件切片，将文件切片，切片`hash`，以及文件名放入`FormData`中，再调用上一步的 `request` 函数返回一个 `promise`，最后调用 `Promise.all`并发上传所有的切片

`spark-md5.min.js`:

```js
(function(factory){if(typeof exports==="object"){module.exports=factory()}else if(typeof define==="function"&&define.amd){define(factory)}else{var glob;try{glob=window}catch(e){glob=self}glob.SparkMD5=factory()}})(function(undefined){"use strict";var add32=function(a,b){return a+b&4294967295},hex_chr=["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32(a<<s|a>>>32-s,b)}function md5cycle(x,k){var a=x[0],b=x[1],c=x[2],d=x[3];a+=(b&c|~b&d)+k[0]-680876936|0;a=(a<<7|a>>>25)+b|0;d+=(a&b|~a&c)+k[1]-389564586|0;d=(d<<12|d>>>20)+a|0;c+=(d&a|~d&b)+k[2]+606105819|0;c=(c<<17|c>>>15)+d|0;b+=(c&d|~c&a)+k[3]-1044525330|0;b=(b<<22|b>>>10)+c|0;a+=(b&c|~b&d)+k[4]-176418897|0;a=(a<<7|a>>>25)+b|0;d+=(a&b|~a&c)+k[5]+1200080426|0;d=(d<<12|d>>>20)+a|0;c+=(d&a|~d&b)+k[6]-1473231341|0;c=(c<<17|c>>>15)+d|0;b+=(c&d|~c&a)+k[7]-45705983|0;b=(b<<22|b>>>10)+c|0;a+=(b&c|~b&d)+k[8]+1770035416|0;a=(a<<7|a>>>25)+b|0;d+=(a&b|~a&c)+k[9]-1958414417|0;d=(d<<12|d>>>20)+a|0;c+=(d&a|~d&b)+k[10]-42063|0;c=(c<<17|c>>>15)+d|0;b+=(c&d|~c&a)+k[11]-1990404162|0;b=(b<<22|b>>>10)+c|0;a+=(b&c|~b&d)+k[12]+1804603682|0;a=(a<<7|a>>>25)+b|0;d+=(a&b|~a&c)+k[13]-40341101|0;d=(d<<12|d>>>20)+a|0;c+=(d&a|~d&b)+k[14]-1502002290|0;c=(c<<17|c>>>15)+d|0;b+=(c&d|~c&a)+k[15]+1236535329|0;b=(b<<22|b>>>10)+c|0;a+=(b&d|c&~d)+k[1]-165796510|0;a=(a<<5|a>>>27)+b|0;d+=(a&c|b&~c)+k[6]-1069501632|0;d=(d<<9|d>>>23)+a|0;c+=(d&b|a&~b)+k[11]+643717713|0;c=(c<<14|c>>>18)+d|0;b+=(c&a|d&~a)+k[0]-373897302|0;b=(b<<20|b>>>12)+c|0;a+=(b&d|c&~d)+k[5]-701558691|0;a=(a<<5|a>>>27)+b|0;d+=(a&c|b&~c)+k[10]+38016083|0;d=(d<<9|d>>>23)+a|0;c+=(d&b|a&~b)+k[15]-660478335|0;c=(c<<14|c>>>18)+d|0;b+=(c&a|d&~a)+k[4]-405537848|0;b=(b<<20|b>>>12)+c|0;a+=(b&d|c&~d)+k[9]+568446438|0;a=(a<<5|a>>>27)+b|0;d+=(a&c|b&~c)+k[14]-1019803690|0;d=(d<<9|d>>>23)+a|0;c+=(d&b|a&~b)+k[3]-187363961|0;c=(c<<14|c>>>18)+d|0;b+=(c&a|d&~a)+k[8]+1163531501|0;b=(b<<20|b>>>12)+c|0;a+=(b&d|c&~d)+k[13]-1444681467|0;a=(a<<5|a>>>27)+b|0;d+=(a&c|b&~c)+k[2]-51403784|0;d=(d<<9|d>>>23)+a|0;c+=(d&b|a&~b)+k[7]+1735328473|0;c=(c<<14|c>>>18)+d|0;b+=(c&a|d&~a)+k[12]-1926607734|0;b=(b<<20|b>>>12)+c|0;a+=(b^c^d)+k[5]-378558|0;a=(a<<4|a>>>28)+b|0;d+=(a^b^c)+k[8]-2022574463|0;d=(d<<11|d>>>21)+a|0;c+=(d^a^b)+k[11]+1839030562|0;c=(c<<16|c>>>16)+d|0;b+=(c^d^a)+k[14]-35309556|0;b=(b<<23|b>>>9)+c|0;a+=(b^c^d)+k[1]-1530992060|0;a=(a<<4|a>>>28)+b|0;d+=(a^b^c)+k[4]+1272893353|0;d=(d<<11|d>>>21)+a|0;c+=(d^a^b)+k[7]-155497632|0;c=(c<<16|c>>>16)+d|0;b+=(c^d^a)+k[10]-1094730640|0;b=(b<<23|b>>>9)+c|0;a+=(b^c^d)+k[13]+681279174|0;a=(a<<4|a>>>28)+b|0;d+=(a^b^c)+k[0]-358537222|0;d=(d<<11|d>>>21)+a|0;c+=(d^a^b)+k[3]-722521979|0;c=(c<<16|c>>>16)+d|0;b+=(c^d^a)+k[6]+76029189|0;b=(b<<23|b>>>9)+c|0;a+=(b^c^d)+k[9]-640364487|0;a=(a<<4|a>>>28)+b|0;d+=(a^b^c)+k[12]-421815835|0;d=(d<<11|d>>>21)+a|0;c+=(d^a^b)+k[15]+530742520|0;c=(c<<16|c>>>16)+d|0;b+=(c^d^a)+k[2]-995338651|0;b=(b<<23|b>>>9)+c|0;a+=(c^(b|~d))+k[0]-198630844|0;a=(a<<6|a>>>26)+b|0;d+=(b^(a|~c))+k[7]+1126891415|0;d=(d<<10|d>>>22)+a|0;c+=(a^(d|~b))+k[14]-1416354905|0;c=(c<<15|c>>>17)+d|0;b+=(d^(c|~a))+k[5]-57434055|0;b=(b<<21|b>>>11)+c|0;a+=(c^(b|~d))+k[12]+1700485571|0;a=(a<<6|a>>>26)+b|0;d+=(b^(a|~c))+k[3]-1894986606|0;d=(d<<10|d>>>22)+a|0;c+=(a^(d|~b))+k[10]-1051523|0;c=(c<<15|c>>>17)+d|0;b+=(d^(c|~a))+k[1]-2054922799|0;b=(b<<21|b>>>11)+c|0;a+=(c^(b|~d))+k[8]+1873313359|0;a=(a<<6|a>>>26)+b|0;d+=(b^(a|~c))+k[15]-30611744|0;d=(d<<10|d>>>22)+a|0;c+=(a^(d|~b))+k[6]-1560198380|0;c=(c<<15|c>>>17)+d|0;b+=(d^(c|~a))+k[13]+1309151649|0;b=(b<<21|b>>>11)+c|0;a+=(c^(b|~d))+k[4]-145523070|0;a=(a<<6|a>>>26)+b|0;d+=(b^(a|~c))+k[11]-1120210379|0;d=(d<<10|d>>>22)+a|0;c+=(a^(d|~b))+k[2]+718787259|0;c=(c<<15|c>>>17)+d|0;b+=(d^(c|~a))+k[9]-343485551|0;b=(b<<21|b>>>11)+c|0;x[0]=a+x[0]|0;x[1]=b+x[1]|0;x[2]=c+x[2]|0;x[3]=d+x[3]|0}function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24)}return md5blks}function md5blk_array(a){var md5blks=[],i;for(i=0;i<64;i+=4){md5blks[i>>2]=a[i]+(a[i+1]<<8)+(a[i+2]<<16)+(a[i+3]<<24)}return md5blks}function md51(s){var n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i,length,tail,tmp,lo,hi;for(i=64;i<=n;i+=64){md5cycle(state,md5blk(s.substring(i-64,i)))}s=s.substring(i-64);length=s.length;tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];for(i=0;i<length;i+=1){tail[i>>2]|=s.charCodeAt(i)<<(i%4<<3)}tail[i>>2]|=128<<(i%4<<3);if(i>55){md5cycle(state,tail);for(i=0;i<16;i+=1){tail[i]=0}}tmp=n*8;tmp=tmp.toString(16).match(/(.*?)(.{0,8})$/);lo=parseInt(tmp[2],16);hi=parseInt(tmp[1],16)||0;tail[14]=lo;tail[15]=hi;md5cycle(state,tail);return state}function md51_array(a){var n=a.length,state=[1732584193,-271733879,-1732584194,271733878],i,length,tail,tmp,lo,hi;for(i=64;i<=n;i+=64){md5cycle(state,md5blk_array(a.subarray(i-64,i)))}a=i-64<n?a.subarray(i-64):new Uint8Array(0);length=a.length;tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];for(i=0;i<length;i+=1){tail[i>>2]|=a[i]<<(i%4<<3)}tail[i>>2]|=128<<(i%4<<3);if(i>55){md5cycle(state,tail);for(i=0;i<16;i+=1){tail[i]=0}}tmp=n*8;tmp=tmp.toString(16).match(/(.*?)(.{0,8})$/);lo=parseInt(tmp[2],16);hi=parseInt(tmp[1],16)||0;tail[14]=lo;tail[15]=hi;md5cycle(state,tail);return state}function rhex(n){var s="",j;for(j=0;j<4;j+=1){s+=hex_chr[n>>j*8+4&15]+hex_chr[n>>j*8&15]}return s}function hex(x){var i;for(i=0;i<x.length;i+=1){x[i]=rhex(x[i])}return x.join("")}if(hex(md51("hello"))!=="5d41402abc4b2a76b9719d911017c592"){add32=function(x,y){var lsw=(x&65535)+(y&65535),msw=(x>>16)+(y>>16)+(lsw>>16);return msw<<16|lsw&65535}}if(typeof ArrayBuffer!=="undefined"&&!ArrayBuffer.prototype.slice){(function(){function clamp(val,length){val=val|0||0;if(val<0){return Math.max(val+length,0)}return Math.min(val,length)}ArrayBuffer.prototype.slice=function(from,to){var length=this.byteLength,begin=clamp(from,length),end=length,num,target,targetArray,sourceArray;if(to!==undefined){end=clamp(to,length)}if(begin>end){return new ArrayBuffer(0)}num=end-begin;target=new ArrayBuffer(num);targetArray=new Uint8Array(target);sourceArray=new Uint8Array(this,begin,num);targetArray.set(sourceArray);return target}})()}function toUtf8(str){if(/[\u0080-\uFFFF]/.test(str)){str=unescape(encodeURIComponent(str))}return str}function utf8Str2ArrayBuffer(str,returnUInt8Array){var length=str.length,buff=new ArrayBuffer(length),arr=new Uint8Array(buff),i;for(i=0;i<length;i+=1){arr[i]=str.charCodeAt(i)}return returnUInt8Array?arr:buff}function arrayBuffer2Utf8Str(buff){return String.fromCharCode.apply(null,new Uint8Array(buff))}function concatenateArrayBuffers(first,second,returnUInt8Array){var result=new Uint8Array(first.byteLength+second.byteLength);result.set(new Uint8Array(first));result.set(new Uint8Array(second),first.byteLength);return returnUInt8Array?result:result.buffer}function hexToBinaryString(hex){var bytes=[],length=hex.length,x;for(x=0;x<length-1;x+=2){bytes.push(parseInt(hex.substr(x,2),16))}return String.fromCharCode.apply(String,bytes)}function SparkMD5(){this.reset()}SparkMD5.prototype.append=function(str){this.appendBinary(toUtf8(str));return this};SparkMD5.prototype.appendBinary=function(contents){this._buff+=contents;this._length+=contents.length;var length=this._buff.length,i;for(i=64;i<=length;i+=64){md5cycle(this._hash,md5blk(this._buff.substring(i-64,i)))}this._buff=this._buff.substring(i-64);return this};SparkMD5.prototype.end=function(raw){var buff=this._buff,length=buff.length,i,tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],ret;for(i=0;i<length;i+=1){tail[i>>2]|=buff.charCodeAt(i)<<(i%4<<3)}this._finish(tail,length);ret=hex(this._hash);if(raw){ret=hexToBinaryString(ret)}this.reset();return ret};SparkMD5.prototype.reset=function(){this._buff="";this._length=0;this._hash=[1732584193,-271733879,-1732584194,271733878];return this};SparkMD5.prototype.getState=function(){return{buff:this._buff,length:this._length,hash:this._hash}};SparkMD5.prototype.setState=function(state){this._buff=state.buff;this._length=state.length;this._hash=state.hash;return this};SparkMD5.prototype.destroy=function(){delete this._hash;delete this._buff;delete this._length};SparkMD5.prototype._finish=function(tail,length){var i=length,tmp,lo,hi;tail[i>>2]|=128<<(i%4<<3);if(i>55){md5cycle(this._hash,tail);for(i=0;i<16;i+=1){tail[i]=0}}tmp=this._length*8;tmp=tmp.toString(16).match(/(.*?)(.{0,8})$/);lo=parseInt(tmp[2],16);hi=parseInt(tmp[1],16)||0;tail[14]=lo;tail[15]=hi;md5cycle(this._hash,tail)};SparkMD5.hash=function(str,raw){return SparkMD5.hashBinary(toUtf8(str),raw)};SparkMD5.hashBinary=function(content,raw){var hash=md51(content),ret=hex(hash);return raw?hexToBinaryString(ret):ret};SparkMD5.ArrayBuffer=function(){this.reset()};SparkMD5.ArrayBuffer.prototype.append=function(arr){var buff=concatenateArrayBuffers(this._buff.buffer,arr,true),length=buff.length,i;this._length+=arr.byteLength;for(i=64;i<=length;i+=64){md5cycle(this._hash,md5blk_array(buff.subarray(i-64,i)))}this._buff=i-64<length?new Uint8Array(buff.buffer.slice(i-64)):new Uint8Array(0);return this};SparkMD5.ArrayBuffer.prototype.end=function(raw){var buff=this._buff,length=buff.length,tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],i,ret;for(i=0;i<length;i+=1){tail[i>>2]|=buff[i]<<(i%4<<3)}this._finish(tail,length);ret=hex(this._hash);if(raw){ret=hexToBinaryString(ret)}this.reset();return ret};SparkMD5.ArrayBuffer.prototype.reset=function(){this._buff=new Uint8Array(0);this._length=0;this._hash=[1732584193,-271733879,-1732584194,271733878];return this};SparkMD5.ArrayBuffer.prototype.getState=function(){var state=SparkMD5.prototype.getState.call(this);state.buff=arrayBuffer2Utf8Str(state.buff);return state};SparkMD5.ArrayBuffer.prototype.setState=function(state){state.buff=utf8Str2ArrayBuffer(state.buff,true);return SparkMD5.prototype.setState.call(this,state)};SparkMD5.ArrayBuffer.prototype.destroy=SparkMD5.prototype.destroy;SparkMD5.ArrayBuffer.prototype._finish=SparkMD5.prototype._finish;SparkMD5.ArrayBuffer.hash=function(arr,raw){var hash=md51_array(new Uint8Array(arr)),ret=hex(hash);return raw?hexToBinaryString(ret):ret};return SparkMD5});
```

```js
('/hash.js') // 放在根目录 public
```

`web workers` 优化我们的前端性能，将要花大量时间的，复杂的，放到一个新的线程中去计算，文件上传通过`hash`计算。


`hash.js`代码:

```js
// 通过内容计算md5值
self.importScripts('/spark-md5.min.js')

self.onmessage = e => {
	// self.postMessage({
	// 	"msg": "您好"
	// })
	const { fileChunkList } = e.data;
	const spark = new self.SparkMD5.ArrayBuffer();
	let percentage = 0;
	let count = 0;
	// console.log(fileChunkList, 'worker fileChunkList');
	// 计算出hash
	const loadNext = index => {
		const reader = new FileReader(); // 文件阅读对象
		reader.readAsArrayBuffer(fileChunkList[index].file);
		reader.onload = e => { // 事件
			count++;
			spark.append(e.target.result);
			if (count === fileChunkList.length)
			{
				self.postMessage({
					percentage: 100,
					hash: spark.end()
				});
				self.close(); // 关闭当前线程
			} else {
				// 还没读完
				percentage += 100/fileChunkList.length;
				self.postMessage({
					percentage
				});
				loadNext(count);
			}
		}
	}
	loadNext(0)
} // this 当前的线程
```

## 大文件上传

1. 将大文件转换为二进制流的格式
2. 利用流可以切割的属性，将二进制流切割成多份
3. 组装和分割块同等数量的请求块，并行或串行的形式发出请求
4. 再给服务器端发出一个合并的信息

## App.vue

```js
<template>
	<div id="app">
		<div>
			<input type="file" :disabled="status !== Status.wait" @change="handleFileChange" />
			<el-button @click="handleUpload" :disabled="uploadDisabled">上传</el-button>
			<el-button @click="handleResume" v-if="status === Status.pause">恢复</el-button>
			<el-button v-else :disabled="status !== Status.uploading || !container.hash" @click="handlePause">暂停
			</el-button>
		</div>
		<div>
			<div>计算文件hash</div>
			<el-progress :percentage="hashPercentage"></el-progress>
			<div>总进度</div>
			<!-- 每个blob 进度 计算出来？ 
      1. 每块blob 上传  值percentage 变的， watch 
      2. 计算属性 computed -->
			<el-progress :percentage="fakeUploadPercentage"></el-progress>
		</div>
		<!-- 多个切片  -->
		<!-- [{a:1}] -->
		<el-table :data="data">
			<el-table-column prop="hash" label="切片hash" align="center">
			</el-table-column>
			<el-table-column label="大小(kb)" align="center" width="120">
				<template v-slot="{row}">
					{{row.size | transformByte}}
				</template>
			</el-table-column>
			<el-table-column label="进度" align="center">
				<template v-slot="{row}">
					<el-progress :percentage="row.percentage" color="#909399">
					</el-progress>
				</template>
			</el-table-column>
		</el-table>
	</div>
</template>

<script>
	const SIZE = 10 * 1024 * 1024; // 切片大小
	const Status = {
		wait: "wait",
		pause: "pause",
		uploading: "uploading"
	};

	export default {
		name: 'app',
		filters: {
			transformByte(val) {
				return Number((val / 1024).toFixed(0))
			}
		},
		computed: {
			uploadDisabled() {
				return (
					!this.container.file || [Status.pause, Status.uploading].includes(this.status)
				);
			},
			uploadPercentage() {
				if (!this.container.file || !this.data.length) return 0;
				const loaded = this.data
					.map(item => item.size * item.percentage)
					.reduce((acc, cur) => acc + cur);
				return parseInt((loaded / this.container.file.size).toFixed(2));
			}
		},
		watch: {
			uploadPercentage(now) {
				if (now > this.fakeUploadPercentage) {
					this.fakeUploadPercentage = now;
				}
			}
		},
		data: () => ({
			Status,
			container: {
				file: null,
				hash: "",
				worker: null
			},
			hashPercentage: 0,
			data: [],
			requestList: [],
			status: Status.wait,
			// 当暂停时会取消 xhr 导致进度条后退
			// 为了避免这种情况，需要定义一个假的进度条
			fakeUploadPercentage: 0
		}),
		methods: {
			async handleResume() {
				this.status = Status.uploading;
				const {
					uploadedList
				} = await this.verifyUpload(
					this.container.file.name,
					this.container.hash
				)
				await this.uploadChunks(uploadedList);
			},
			handlePause() {
				this.status = Status.pause; // 状态停
				this.resetData();
			},
			resetData() {
				this.requestList.forEach(xhr => xhr.abort())
				this.requestList = [];
				if (this.container.worker) { //hash 计算过程中
					this.container.worker.onmessage = null;
				}
			},
			// xhr
			request({
				url,
				method = "post",
				data,
				headers = {},
				onProgress = e => e,
				requestList
			}) {
				return new Promise(resolve => {
					const xhr = new XMLHttpRequest();
					xhr.upload.onprogress = onProgress;
					xhr.open(method, url);
					Object.keys(headers).forEach(key =>
						xhr.setRequestHeader(key, headers[key])
					);
					xhr.send(data);
					xhr.onload = e => {
						// 将请求成功的 xhr 从列表中删除
						if (requestList) {
							const xhrIndex = requestList.findIndex(item => item === xhr);
							requestList.splice(xhrIndex, 1);
						}
						resolve({
							data: e.target.response
						});
					};
					// 暴露当前 xhr 给外部
					requestList?.push(xhr);
				});
			},
			async calculateHash(fileChunkList) {
				return new Promise(resolve => {
					// 封装花时间的任务
					// web workers   
					// js 单线程的 UI 主线程 
					// html5 web workers 单独开一个线程 独立于 worker
					// 回调 不会影响原来的UI 
					// html5 带来的优化， 
					this.container.worker = new Worker("/hash.js");
					this.container.worker.postMessage({
						fileChunkList
					});
					this.container.worker.onmessage = e => {
						// console.log(e.data);
						const {
							percentage,
							hash
						} = e.data;
						console.log(percentage, '----');
						this.hashPercentage = percentage;
						if (hash) {
							resolve(hash);
						}

					}
				})
			},
			async handleUpload(e) {
				// 大量的任务
				if (!this.container.file) return;
				this.status = Status.uploading;
				const fileChunkList = this.createFileChunk(this.container.file);
				console.log(fileChunkList);
				this.container.hash = await this.calculateHash(fileChunkList);
				// 文件 hash  没必要上传同一个文件多次
				const {
					shouldUpload,
					uploadedList
				} = await this.verifyUpload( //上传， 验证
					this.container.file.name,
					this.container.hash
				);
				console.log(shouldUpload, uploadedList);
				if (!shouldUpload) {
					this.$message.success("秒传：上传成功");
					this.status = Status.wait;
					return;
				}
				this.data = fileChunkList.map(({
					file
				}, index) => ({
					fileHash: this.container.hash, //文件的hash
					index,
					hash: this.container.hash + "-" + index, //每个块都有自己的index 在内的hash, 可排序， 可追踪
					chunk: file,
					size: file.size,
					percentage: uploadedList.includes(index) ? 100 : 0 //当前切片是否已上传过
				}));
				await this.uploadChunks(uploadedList); //上传切片
			},
			// 上传切片，同时过滤已上传的切片
			async uploadChunks(uploadedList = []) {
				// console.log(this.data);
				// 数据数组this.data => 请求数组 =》 并发
				const requestList = this.data
					.filter(({
						hash
					}) => !uploadedList.includes(hash))
					.map(({
						chunk,
						hash,
						index
					}) => {
						const formData = new FormData();
						formData.append("chunk", chunk);
						formData.append("hash", hash);
						formData.append("filename", this.container.file.name);
						formData.append("fileHash", this.container.hash);
						return {
							formData,
							index
						};
					})
					.map(async ({
							formData,
							index
						}) =>
						this.request({
							url: "http://localhost:3000",
							data: formData,
							onProgress: this.createProgressHandler(this.data[index]),
							requestList: this.requestList
						}));
				await Promise.all(requestList);
				// 之前上传的切片数量+本次上传的切片数量=所有切片数量
				if (uploadedList.length + requestList.length == this.data.length) {
					await this.mergeRequest();
				}
				console.log('可以发送合并请求了');
			},
			async mergeRequest() {
				await this.request({
					url: 'http://localhost:3000/merge',
					headers: {
						"content-type": "application/json"
					},
					data: JSON.stringify({
						size: SIZE,
						fileHash: this.container.hash,
						filename: this.container.file.name
					})
				})
				this.$message.success('上传成功');
				this.status = Status.wait;
			},
			// 用闭包保存每个 chunk 的进度数据
			createProgressHandler(item) {
				return e => {
					item.percentage = parseInt(String((e.loaded / e.total) * 100));
					console.log(e.loaded, e.total, '----------');
				}
			},
			// 根据 hash 验证文件是否曾经已经被上传过
			// 没有才进行上传
			async verifyUpload(filename, fileHash) {
				const {
					data
				} = await this.request({
					url: 'http://localhost:3000/verify',
					headers: {
						"content-type": "application/json"
					},
					data: JSON.stringify({ // 字符串化
						filename,
						fileHash
					})
				})
				return JSON.parse(data);
			},
			// es6的特性你和代码是如何结合的？ 少传这个参数
			createFileChunk(file, size = SIZE) {
				const fileChunkList = [];
				let cur = 0;
				while (cur < file.size) {
					fileChunkList.push({
						file: file.slice(cur, cur + size)
					})
					cur += size;
				}
				return fileChunkList;
			},
			handleFileChange(e) {
				const [file] = e.target.files;
				if (!file) return;
				this.resetData();
				Object.assign(this.$data, this.$options.data());
				this.container.file = file;
			},
		},
		components: {

		}
	}
</script>

<style>
	#app {
		font-family: 'Avenir', Helvetica, Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-align: center;
		color: #2c3e50;
		margin-top: 60px;
	}
</style>
```

## 秒传

原理：计算整个文件的`hash`，在执行上传操作前，向服务端发送请求，传递`MD5`值，后端进行文件检索。若服务器中已存在该文件，便不进行后续的任何操作，上传也便直接结束。

大文件上传 + 断点续传的解决方案就完成了

## 总结

- 前端上传大文件时使用 `Blob.prototype.slice` 将文件切片，并发上传多个切片，最后发送一个合并的请求通知服务端合并切片
- 后端进行合并到最终文件,  原生 `XMLHttpRequest` 的 `upload.onprogress` 对切片上传进度的监听
- 使用 `spark-md5` 根据文件内容算出文件 `hash`, 通过 `hash` 可以判断服务端是否已经上传该文件，从而直接提示用户上传成功（秒传）
- 前端在计算文件hash时，能否异步并实现进度响应
- 文件切片使用持久化或者内存存储导致溢出怎么办？
- “继续下载”方案是否还有优化空间？
- 分片上传、接收、存储、合并，这些步骤抽象成一个文件上传协议是否更理想
- 上传状态由服务端动态获取，前端只做两个事：hash和切片。这个前提下，多切片并发上传、多文件并发上传，复杂度会提高很多，当然主要是后端复杂度。

## 源代码

- **[file-breakpoint-continue](https://github.com/webVueBlog/file-breakpoint-continue)**

## 参与

-   我正在参与掘金技术社区创作者签约计划招募活动，[点击链接报名投稿](https://juejin.cn/post/7112770927082864653 "https://juejin.cn/post/7112770927082864653")。