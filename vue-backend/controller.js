

const path = require('path');
const fs = require("fs-extra");
const UPLOAD_DIR = path.resolve(__dirname, '..', 'target');

const extractExt = filename =>
	filename.slice(filename.lastIndexOf("."), filename.length)

const resolvePost = req =>
	new Promise(resolve => {
		// post 慢慢的来的
		let chunk = "";
		req.on("data", data => {
			chunk += data; // 二进制
		})
		req.on("end", () => {
			console.log("end", chunk)
			// end {"filename":"一生一世.doc","fileHash":"4e8e430afea6bc8881c838364472c21a"}

			resolve(JSON.parse(chunk))
		})
	})

module.exports = class {
	async handleVerifyUpload (req, res) {
		// res.end('vurify')
		// 服务器端没有这个文件
		// 拿到post 的data, bodyParser
		const data = await resolvePost(req);
		const { fileHash, filename } = data;
		// 通过文件名拿后缀
		const ext = extractExt(filename);
		console.log(ext);
		const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);
		console.log(filePath);
		
		if (fse.existsSync(filePath)) {
			res.end(
				JSON.stringify({
					shouldUpload: false
				})
			)
		} else {
			res.end(
				JSON.stringify({
					shouldUpload: true,
					uploadedList: []
				})
			)
		}
	}
}