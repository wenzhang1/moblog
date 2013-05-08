/*
 * tag.js 标签管理
 * author: moskito
 * create_time: 2012-08-06
 * */
 
var config = require('../config').config;
var models = require('../models');
var articleCtrl = require('./article');
var userCtrl = require('./user');
var Tag = models.Tag;
var ArticleTag = models.ArticleTag;
var EventProxy = require('eventproxy').EventProxy;
var check = require('validator').check,
    sanitize = require('validator').sanitize;
var Util = require('../libs/utils');
var url = require('url');


//浏览标签对应的文章列表
exports.article_list = function(req, res, next){
	var tag_id = req.params.tid;
	//单页显示文章数
	var limit = 3;
	var current_page = parseInt(req.query.page, 10) || 1;
	var pathname = url.parse(req.url).pathname;
	
	ArticleTag.find({tag_id: tag_id}, function(err, articles_tag){
		if(err) return next(err);
		
		var render = function(articles, pages){
			res.render('article_list', {
				articles: articles,
				current_page: current_page,
				pages: pages,
				base_url: pathname
			});
		}
		
		var proxy = new EventProxy();
		proxy.assign('articles', 'pages', render);
		
		
		var articles_ids = [];
		for(var i = 0; i<articles_tag.length; i++){
			articles_ids.push(articles_tag[i].article_id);
		}
		
		var opt = { skip: (current_page - 1) * limit, limit: limit, sort:[ ['create_time', 'desc'], ['last_reply_at', 'desc'] ]};
		
		articleCtrl.get_articles_by_query({_id:{'$in': articles_ids}}, opt, function(err, articles){
			if(err) return next(err);
			
			if(!articles){
				res.render('tag_list', {error: '此标签下暂无文章'});
				return;
			}
			
			Util.article_tran(articles);
			
			proxy.trigger('articles', articles);
		});
		
		articleCtrl.get_article_counts({_id:{'$in': articles_ids}}, function(err, article_count){
			if(err) return next(err);
			
			var pages = Math.ceil(article_count / limit);
			
			proxy.trigger('pages', pages);
		})
	});
}

//标签列表
exports.tags_list = function(req, res, next){
	if(!req.session || !req.session.user || !req.session.user.is_admin){
		res.render('error', {error: '对不起，你没有权限这么做'});
		return;
	}else{
		var limit = 10;
	    var current_page = parseInt(req.query.page, 10) || 1;
		var pathname = url.parse(req.url).pathname;
		var render = function(tags, pages){
	    	res.render('tags',{
	    		tags: tags,
				current_page: current_page,
				pages: pages,
				base_url: pathname
	    	});
	    }
	    
	    var proxy = new EventProxy();
	    var opt = {skip: (current_page - 1) * limit, limit: limit, sort: [ ['create_at', 'asc'] ]};
	    proxy.assign('tags', 'pages', render);
		
		Tag.find({}, [], opt, function(err,tags){
			if(err) return cb(err, []);
			proxy.trigger('tags', tags);
		}); 
		
		Tag.count({}, function(err, tag_count){
			if(err) return next(err);
			
			var pages = Math.ceil(tag_count / limit);
			proxy.trigger('pages', pages);
		});
	}
}

//创建标签
exports.tag_create = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var method = req.method.toLowerCase();
	if(method == 'get'){
		if(req.session.user.is_admin){
			res.render('tag_edit');
			return;
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
	
	if(method == 'post'){
		if(req.session.user.is_admin){
			var name = sanitize(req.body.name).trim();
			name = sanitize(name).xss();
			var order = sanitize(req.body.order).trim();
			order = sanitize(order).xss();
			var description = req.body.description;
			
			if(name == ''){
				res.render('tag_edit', {error: '标签名称不能为空', order: order, description: description});
				return;
			}
			
			try{
				check(order, '不正确的排序值').isNumeric();
			}catch(e){
				res.render('tag_edit', {error: e.message, name: name, order: order, description: description});
				return;
			}
			
			Tag.find({name: name},function(err, tags){
				if(err) return next(err);
				
				if(tags.length>0){
					res.render('tag_edit', {errpr: '这个标签已存在', name: name, order: order, description: description});
					return;
				}
				
				tag = new Tag();
				tag.name = name;
				tag.order = order;
				tag.description = description;
				tag.save(function(err){
					if(err) return next(err);
					res.redirect('/tags');
				});
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
};

//编辑标签
exports.tag_edit = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var tag_id = req.params.tid;
	var method = req.method.toLowerCase();
	
	if(tag_id.length != 24){
		res.render('error', {error: '对不起，此标签已被删除或不存在'});
		return;
	}
	
	if(method == 'get'){
		if(req.session.user.is_admin){
			var where = {_id: tag_id};
			get_tag_by_query_once(where, function(err, tag){
				if(err) return next(err);
				
				if(!tag){
					res.render('error', {error: '对不起，此标签已被删除或不存在'});
					return;
				}
				
				res.render('tag_edit', {action: 'tag_edit', tag_id: tag._id, name: tag.name, order: tag.order, description: tag.description});
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
	
	if(method == 'post'){
		if(req.session.user.is_admin){
			var name = sanitize(req.body.name).trim();
			name = sanitize(name).xss();
			var order = sanitize(req.body.order).trim();
			order = sanitize(order).xss();
			var description = req.body.description;
			
			if(name == ''){
				res.render('tag_edit', {error: '标题太少或太多'});
				return;
			}
			
			try{
				check(order, '不正确的排序值').isNumeric();
			}catch(e){
				res.render('tag_edit', {error: e.message, name: name, order: order, description: description});
				return;
			}
			
			var where = {_id: tag_id};
			get_tag_by_query_once(where, function(err, tag){
				if(err) return next(err);
				
				if(!tag){
					res.render('error', {error: '对不起，此标签已被删除或不存在'});
					return;
				}
				
				tag.name = name;
				tag.order = order;
				tag.description = description;
				tag.save(function(err){
					if(err) return next(err);
					
					res.redirect('/tags');
				})
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
};

//删除标签
exports.tag_del = function(req, res, next){
	if(!req.session || !req.session.user || !req.session.user.is_admin){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var tag_id = req.params.tid;
	if(tag_id.length != 24){
		res.render('error', {error: '对不起，此标签已被删除或不存在'});
		return;
	}
	
	var where = {_id: tag_id};
	get_tag_by_query_once(where, function(err, tag){
		if(err) return next(err);
		
		if(!tag){
			res.render('error', {error: '对不起，此标签已被删除或不存在'});
			return;
		}
		
		var proxy = new EventProxy();
		var done = function(){
			tag.remove(function(err){
				if(err) return next(err);
			})
			res.redirect('/tags');
		}
		proxy.assign('article_tag_removed', done);
		
		where = {tag_id: tag._id};
		ArticleTag.remove(where, function(err){
			if(err) return next(err);
			
			proxy.trigger('article_tag_removed');
		});
	});
}

function get_all_tags(cb){
	Tag.find({}, [], {sort:[['order','asc']]}, function(err,tags){
		if(err) return cb(err, []);
		return cb(err, tags);
	}); 
}

function get_tag_by_query_once(where, cb){
	Tag.findOne(where, function(err, tag){
		if(err) return cb(err, null);
		return cb(err, tag);
	});
}

function get_tags_by_query(where, opt, cb){
	Tag.find(where, [], opt, function(err, tags){
		if(err) return cb(err);
		return cb(err, tags)
	});
}

exports.get_all_tags = get_all_tags;
exports.get_tag_by_query_once = get_tag_by_query_once;
exports.get_tags_by_query = get_tags_by_query;