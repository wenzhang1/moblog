/*
 * index.js 数据库配置索引页面
 * author : moskito
 * create time: 2012-07-15
 * */

var mongoose = require('mongoose');
var config = require('../config').config;

mongoose.connect(config.db, function(err){
    if(err){
	console.log('Connect Is Error: ', config.db, err.message);
	process.exit(1);
    }
});

//models
require('./article');
require('./user');
require('./tag');
require('./article_tag');
require('./reply');

exports.Article = mongoose.model('Article');
exports.User = mongoose.model('User');
exports.Tag = mongoose.model('Tag');
exports.ArticleTag = mongoose.model('ArticleTag');
exports.Reply = mongoose.model('Reply');
