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
