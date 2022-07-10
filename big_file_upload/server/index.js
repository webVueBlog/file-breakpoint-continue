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
