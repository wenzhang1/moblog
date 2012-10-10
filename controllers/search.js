/*
 * search.js 搜索管理
 * author: moskito
 * create_time: 2012-09-25
 * */
 
var config = require('../config').config;
var models = require('../models');
var EventProxy = require('eventproxy').EventProxy;
var articleCtrl = require('./article');
var userCtrl = require('./user');
var tagCtrl = require('./tag');
var replyCtrl = require('./reply');
var url = require('url');
var Util = require('../libs/utils');

exports.search_list = function(req, res, next){
	var current_page = parseInt(req.query.page, 10) || 1;
	var pathname = url.parse(req.url).pathname;
	//单页显示文章数量
	var limit = 15;
	
	//搜索关键字
	var keyword = req.query.q || '';
	if (Array.isArray(keyword)) {
    	keyword = keyword.join(' ');
  	}
  	keyword = keyword.trim();
  	var where = {};
  	keyword = keyword.replace(/[\*\^\&\(\)\[\]\+\?\\]/g, '');
    where.title = new RegExp(keyword, 'i');
    var opt = { skip: (current_page - 1) * limit, limit: limit, sort: [ ['create_time', 'desc'], ['last_reply_at', 'desc'] ]};
	
	var render = function (articles, pages){
		res.render('search_list', {
			articles: articles,
			current_page: current_page,
			pages: pages,
			base_url: pathname,
			keyword: keyword
		});
	}
	
	var proxy = new EventProxy();
	proxy.assign('articles', 'pages', render);
	
	articleCtrl.get_articles_by_query(where, opt, function(err, articles){
		if(err) return next(err);
		
		Util.article_tran(articles);
		
		proxy.trigger('articles', articles);
	});
	
	articleCtrl.get_article_counts(where, function(err, article_count){
		if(err) return next(err);
		
		var pages = Math.ceil(article_count / limit);
		proxy.trigger('pages', pages);
	});
}