

const path = require('path');
const UPLOAD_DIR = path.resolve(__dirname, '..', 'target');

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
	}
}