/*
 * upload.js 图片上传
 * author: moskito
 * create_time: 2012-08-06
 * */

var fs = require('fs');
var path = require('path');
var ndir = require('ndir');
var config = require('../config').config;

exports.upload_html = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '请登录后再操作'});
		return;
	}
	
	res.render('upload');
}

exports.uploadImg = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '请登录后再操作'});
		return;
	}
	var file = req.files && req.files.imgFile;
	if(!file){
		res.render('error', {error: '上传失败，没有文件或文件错误'});
		return;
	}
	var uid = req.session.user._id.toString();
	
	var filename = Date.now() + '_' + file.name;
	
	var userDir = path.join(config.upload_dir, uid);
	ndir.mkdir(userDir, function (err) {
	
		if (err) {
	      return next(err);
	    }
	    var savepath = path.join(userDir, filename);
	    fs.rename(file.path, savepath, function (err) {
		  if (err) {
		    return next(err);
		  }
		  var url = '/upload/' + uid + '/' + encodeURIComponent(filename);
		  
		  res.send({error: '0',url: url}, {"Content-Type": "text/html"});
	    });
  	});
}