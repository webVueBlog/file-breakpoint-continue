self.onmessage = e => {
	self.postMessage({
		"msg": "您好"
	})
} // this 当前的线程