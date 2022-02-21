const http = require('http');
const path = require('path');
const multiparty = require('multiparty');

const fse = require('fs-extra');
const server = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, ".", "target");
// C:\xxx\file-breakpoint-continue\server\target 上传目录

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  // res.end("hello");

  if (req.url == '/') {
    // chunk ,  name 
    const multipart = new multiparty.Form();
    // console.log(multipart, 'multipart');
	//   _events: [Object: null prototype] { newListener: [Function (anonymous)] },
	//   _eventsCount: 1,
	//   _maxListeners: undefined,
	//   error: null,
	//   autoFields: false,
	//   autoFiles: false,
	//   maxFields: 1000,
	//   maxFieldsSize: 2097152,
	//   maxFilesSize: Infinity,
	//   uploadDir: 'C:\\Users\\xxx\\AppData\\Local\\Temp',
	//   encoding: 'utf8',
	//   bytesReceived: 0,
	//   bytesExpected: null,
	//   openedFiles: [],
	//   totalFieldSize: 0,
	//   totalFieldCount: 0,
	//   totalFileSize: 0,
	//   flushing: 0,
	//   backpressure: false,
	//   writeCbs: [],
	//   emitQueue: [],
	//   [Symbol(kCapture)]: false
	// } multipart

	// 当前的请求对象交给它
	// files上传的文件都会在解析的files里面
	// fields传过来的信息放到里面如名字啊
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        return ;
      }
	  // chunk: (binary)
	  // filename: 20210319003325-0
	  
      // console.log(files, 'files');
	  // {
	  //   chunk: [
	  //     {
	  //       fieldName: 'chunk',
	  //       originalFilename: 'blob',
	  //       path: 'C:\\Users\\xxx\\AppData\\Local\\Temp\\JFpkl-6G-m7ejhvCPBVu1L1M',
	  //       headers: [Object],
	  //       size: 69306
	  //     }
	  //   ]
	  // } files

      const [chunk] = files.chunk; //拿到了文件块
      const [filename] = fields.filename; //文件名 除了文件外其他数据
      // console.log(filename, 'filename');
	  // 20210319003325-0 filename
	  
	  // 目录名字
      const dir_name = filename.split('-')[0];
      const chunkDir = path.resolve(UPLOAD_DIR, dir_name);
      // console.log(chunkDir, 'chunkDir');
	  // C:\temp\file-breakpoint-continue\server\target\banner chunkDir

      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir);
      }
      // console.log(chunk.path, 'chunk.path');
	  // 临时的地方
	  // C:\Users\xxx\AppData\Local\Temp\lmoOdKPqKayxqYrnSZzMRkgJ chunk.path

      await fse.move(chunk.path, `${chunkDir}/${filename}`);
    })
  } else if (req.url == '/merge') {
    res.end('OK');
	// 触发链接生成
	const filename = 'banner';
	const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.png`);
	
	const pipeStream = (path, writeStream) =>
		new Promise(resolve => {
			// 创建一个可读流
			const readStrem = fse.createReadStream(path);
			readStrem.on("end", () => {
				// fse.unlinkSync(path); // 删除切片
				resolve();
			})
			readStrem.pipe(writeStream);
		})
	
	const mergeFileChunk = async (filePath, filename, size) => {
		const chunkDir = path.resolve(UPLOAD_DIR, filename);
		// C:\temp\file-breakpoint-continue\server\target\yb
		const chunkPaths = await fse.readdir(chunkDir);
		chunkPaths.sort((a,b) => a.splice('-')[1] - b.split('-')[1]);
		await Promise.all(
			chunkPaths.map((chunkPath, index) =>
				pipeStream(
					path.resolve(chunkDir, chunkPath),
					fse.createWriteStream(filePath, {
						start: index * size,
						end: (index + 1) * size
					})
				)
			)
		)
		console.log('文件合并成功');
	}
	mergeFileChunk(filePath, filename, 0.5*1024*1024);
  }
});

server.listen(3000, () => console.log("正在临听3000端口"));
