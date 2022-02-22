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
