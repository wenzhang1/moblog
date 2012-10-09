/*
 * site.js 首页路由
 * author: moskito
 * create_time: 2012-07-03
 * */

var config = require('../config').config;
var models = require('../models');
var EventProxy = require('eventproxy').EventProxy;
var articleCtrl = require('./article');
var userCtrl = require('./user');
var tagCtrl = require('./tag');
var replyCtrl = require('./reply');
var url = require('url');

exports.index = function(req, res, next){
	var current_page = parseInt(req.query.page, 10) || 1;
	var pathname = url.parse(req.url).pathname;
	//单页显示文章数量
	var limit = 15;
	
	var render = function (articles, pages){
		res.render('index', {
			articles: articles,
			current_page: current_page,
			pages: pages,
			base_url: pathname
		});
	}
	var proxy = new EventProxy();
	proxy.assign('articles', 'pages', render);
	var where = {};
	var opt = { skip: (current_page - 1) * limit, limit: limit, sort: [ ['create_time', 'desc'], ['last_reply_at', 'desc'] ]};
	articleCtrl.get_articles_by_query(where, opt, function(err, articles){
		if(err) return next(err);
		
		proxy.trigger('articles', articles);
	});
	articleCtrl.get_article_counts(where, function(err, article_count){
		if(err) return next(err);
		
		var pages = Math.ceil(article_count / limit);
		proxy.trigger('pages', pages);
	});
};

//输出侧边栏
exports.side_bar = function(req, res, next){
	var render = function(tags, hot_articles, last_replies){
		res.local('tags', tags);
		res.local('hot_articles', hot_articles);
		res.local('last_replies', last_replies);
		return next();
	}
	var proxy = new EventProxy();
	proxy.assign('tags', 'hot_articles', 'last_replies', render);
	
	tagCtrl.get_all_tags(function(err, tags){
		if(err) return next(err);
		
		proxy.trigger('tags', tags);
	});
	articleCtrl.get_articles_by_query({}, { limit: 5, sort: [ ['view_count', 'desc'] ]}, function(err, articles){
		if(err) return next(err);
		
		proxy.trigger('hot_articles', articles);
	});
	
	articleCtrl.get_articles_by_query({}, { limit: 5, sort: [ ['last_reply_at', 'desc'] ]}, function(err, articles){
		if(err) return next(err);
		
		proxy.trigger('last_replies', articles);
	});
}