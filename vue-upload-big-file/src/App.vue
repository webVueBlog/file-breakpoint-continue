<template>
  <div id="app">
	  <input type="file" @change="handleFileChange" />
	  <el-button @click="handleUpload">上传</el-button>
  </div>
</template>

<script>
const Status = {
	wait: "wait",
	pause: "pause",
	uploading: "uploading"
}
const SIZE = 0.5*1024*1024;

export default {
  name: 'App',
  data: () => ({
	  container: { // 将我们的任务放到一起
		  file: null,
		  hash: "", // 哈希
	  },
	  status: Status.waiting
  }),
 //  data() {
	// return() {
		
	// }  
 //  },
  methods: {
	  async calculateHash(fileChunkList) {
		  return new Promise(resolve => {
			  // 封装 花时间的任务
			  // web workers
			  // js 单线程 UI 主线程
			  // html5 web workers 单独开一个线程 独立于worker
			  // 回调 不会影响原来的UI
			  // hash.js负责计算hash
			  // 启动了一个线程 优化 图片的计算啊，等
			  this.container.worker = new Worker('/hash.js');
			  // 事件订阅的形式
			  this.container.worker.postMessage({ fileChunkList });
			  // 回调函数 onmessage打印出来
			  this.container.worker.onmessage = e => {
				  console.log(e.data);
			  }
		  })
	  },
	  async handleUpload(e) {
		  // 大量的任务
		  if (!this.container.file) return;
		  this.status = Status.uploading;
		  // 获取切片
		  const fileChunkList = this.createFileChunk(this.container.file);
		  // 点击上传的时候，状态为上传状态
		  console.log(fileChunkList, 'fileChunkList');
		  // 0:
		  // file: Blob {size: 69306, type: ''}
		  // [[Prototype]]: Object
		  // length: 1
		  // 计算hash
		  this.container.hash = await this.calculateHash(fileChunkList);
	  },
	  // es6可少传参数
	  createFileChunk(file, size = SIZE) {
		  const fileChunkList = []; // 切片的数组
		  let cur = 0;
		  while(cur < file.size) {
			  fileChunkList.push({
				  file: file.slice(cur, cur + size)
			  })
			  cur += size;
		  }
		  return fileChunkList;
	  },
	  handleFileChange(e) {
		  // 分割文件
		  const [file] = e.target.files; // 拿到第一个文件
		  // console.log(e.target.files);
		  this.container.file = file;
	  }
  },
  components: {
	  
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
