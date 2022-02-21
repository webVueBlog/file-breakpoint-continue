// 入口文件 - 根据此文件在目录下生成 yb.jpeg

const path = require('path'); // 路径
const fse = require('fs-extra'); // fs扩展包

// 合并文件块
// 上传目录 __dirname项目根目录超级变量
const UPLOAD_DIR = path.resolve(__dirname, ".", "target");
console.log(UPLOAD_DIR, '上传目录');
// C:\xxx\file-breakpoint-continue\server\target 上传目录

// 文件路径
const filename = 'yb';
const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.jpeg`);
console.log(filePath, '文件路径');
// C:\xxx\file-breakpoint-continue\server 文件路径
// C:\XXX\file-breakpoint-continue\server\yb.jpeg 文件路径

const pipeStream = (path, writeStream) =>
	new Promise(resolve => {
		// 创建一个可读流
		const readStream = fse.createReadStream(path); 
		readStream.on("end", () => {
			resolve();
		})
		readStream.pipe(writeStream);
	})

const mergeFileChunk = async (filePath, filename, size) => {
	// console.log(filePath, filename, size);
	// C:\xxx\file-breakpoint-continue\server\yb.jpeg yb 524288
	
	const chunkDir = path.resolve(UPLOAD_DIR, filename);
	// console.log(chunkDir);
	// C:\temp\file-breakpoint-continue\server\target\yb
	
	const chunkPaths = await fse.readdir(chunkDir);
	// console.log(chunkPaths);
	// [ 'yb-0', 'yb-1', 'yb-2' ]
	// 升序排序，前面减后面的
	chunkPaths.sort((a,b) => a.split('-')[1] - b.split('-')[1]);
	console.log(chunkPaths, 'sort');
	
	// 每块内容写入最后的文件，promise
	await Promise.all(
	// [ 'yb-0', 'yb-1', 'yb-2' ]
		chunkPaths.map((chunkPath, index) => 
			pipeStream(
				path.resolve(chunkDir, chunkPath),
				fse.createWriteStream(filePath, {
					// 写入
					start: index * size,
					end: (index+1)*size
				})
			)
		)
	)
	console.log('文件合并成功');
}

mergeFileChunk(filePath, filename, 0.5*1024*1024);
