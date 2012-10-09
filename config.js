/*
 * config.js 网站配置文件
 * author: mosktio
 * create time: 2012-07-14
 * */
var path = require('path');

exports.config = {
    webname : 'New Node',
    port : 3000,
    upload_dir : path.join(__dirname, 'public', 'upload', 'imgaes'),
    
    session_secret: 'newnode',
    auth_cookie_name: 'newnode',
    //超级管理员
	admins: {admin: true},
    db : 'mongodb://KtBiw8anWTRL:V4Wu6lmW93@127.0.0.1:20088/GuxIp2vrktmE'
}
