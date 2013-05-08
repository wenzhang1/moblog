/*
 * article.js 文件管理
 * author: moskito
 * create_time: 2012-07-03
 * */

var config = require('../config').config;
var models = require('../models');
var Article = models.Article;
var ArticleTag = models.ArticleTag;
var Reply = models.Reply;
var userCtrl = require('./user');
var tagCtrl = require('./tag');
var replyCtrl = require('./reply');
var EventProxy = require('eventproxy').EventProxy;
var check = require('validator').check,
    sanitize = require('validator').sanitize;
var Util = require('../libs/utils');

//create article
exports.article_create = function(req, res, next){
    if(!req.session.user){
    	res.redirect('/login');
    	return;
    }
    var method = req.method.toLowerCase();
    if(method == 'get'){
    	var render = function(tags){
    		res.render('article_edit', {
    			tags: tags
    		});
    		return;
    	}
    	
    	var proxy = new EventProxy();
    	proxy.assign('tags', render);
    	tagCtrl.get_all_tags(function(err, tags){
	    	if(err) return next(err);
	    	
	    	proxy.trigger('tags', tags);
    	});
    }
    
    if(method == 'post'){
    	var title = sanitize(req.body.title).trim();
    	title = sanitize(title).xss();
    	var tags_ids = req.body.tags_ids;
    	var tags_id_array = [];
    	if(tags_ids && tags_ids != ''){
	    	tags_ids = sanitize(tags_ids).trim();
	    	tags_ids = sanitize(tags_ids).xss();
    		tags_id_array = tags_ids.split(',');
    	}
		var content = req.body.content;
		if(title == ''){
			tagCtrl.get_all_tags(function(err, tags){
				if(err) return next(err);
				for(var i = 0; i<tags_id_array.length; i++){
					for(var j = 0; j<tags.length; j++){
						if(tags_id_array[i] == tags[j]._id){
							tags[j].is_selected = true;
						}
					}
				}
				
				res.render('article_edit', {error: '标题不能为空', content: content, tags: tags});
				return;
			});
		}else if(content == '' || content == '<br />' || content == '<br/>'){
			tagCtrl.get_all_tags(function(err, tags){
				if(err) return next(err);
				for(var i = 0; i<tags_id_array.length; i++){
					for(var j = 0; j<tags.length; j++){
						if(tags_id_array[i] == tags[j]._id){
							tags[j].is_selected = true;
						}
					}
				}
				
				res.render('article_edit', {error: '内容不能为空',title: title, tags: tags});
				return;
			});
		}else{
			article = new Article();
			article.content = content;
			article.title = title;
			article.create_time = Date.now();
			article.author_id = req.session.user._id;
			
			article.save(function(err){
				if(err) return next(err);
				
				var render = function(){
					res.redirect('/article_view/'+article._id);
				}
				
				var proxy = new EventProxy();
				proxy.assign('articles_tag_saved', render);
				if(tags_id_array.length == 0){
					proxy.trigger('articles_tag_saved');
				}
				
				var article_tag_save_done = function(){
					proxy.trigger('articles_tag_saved');
				}
				
				userCtrl.get_user_by_query_once({_id: article.author_id}, function(err, user){
					user.article_count += 1;
					user.save();
					req.session.user.article_count += 1;
				});
				proxy.after('article_tag_saved', tags_id_array.length, article_tag_save_done);
				
				for(var i = 0; i<tags_id_array.length; i++){
					(function(i){
						var article_tag = new ArticleTag();
						article_tag.article_id = article._id;
						article_tag.tag_id = tags_id_array[i];
						article_tag.save(function(err){
							if(err) return next(err);
							
							proxy.trigger('article_tag_saved');
						});
						tagCtrl.get_tag_by_query_once({_id: tags_id_array[i]},function(err,tag){
			              if(err) return next(err);
			              tag.artcile_count += 1;
			              tag.save();
			            });
					})(i);
				}
			});
		}
    }
};

//view article
exports.article_view = function(req, res, next){
	var article_id = req.params.aid;
	
	var render = function(article){
		res.render('article_view', {article: article});
		return;
	}

	var proxy = new EventProxy();
	proxy.assign('article', render);
	
	var where = {_id: article_id}
	get_article_by_query_full(where, function(err, article, author, edit, tags, replies){
		if(err) return next(err);
		if(!article){
			res.render('error', {error: '无此信息或已被删除'});
			return;
		}
		article.author = author;
		article.edit = edit;
		article.tags = tags;
		article.content = Util.xss(article.content);
		article.replies = replies;
		article.create_at = Util.format_date(article.create_time);
		article.update_time = Util.format_date(article.update_at);
		article.view_count += 1;
		article.save(function(err){
			if(err) return next(err);
		});
		proxy.trigger('article', article);
	});
}

//edit article
exports.article_edit = function(req, res, next){
	if(!req.session.user){
		res.redirect('/login');
		return;
	}
	var article_id = req.params.aid;
	var method = req.method.toLowerCase();
	if(method == 'get'){
		if(article_id.length != 24){
			res.render('error', {error: '无此信息或已被删除'});
			return;
		}
		var where = {_id: article_id}
		get_article_by_query_once(where, function(err, article, author, edit, tags){
			if(!article){
				res.render('error', {error: '无此信息或已被删除'});
				return;
			}
			if(article.author_id == req.session.user._id || req.session.user.is_admin){
				tagCtrl.get_all_tags(function(err, all_tags){
					if(err) return next(err);
					for(var i = 0; i<tags.length; i++){
						for(var j = 0; j<all_tags.length; j++){
							if(tags[i].id == all_tags[j].id){
								all_tags[j].is_selected = true;
							}
						}
					}
					res.render('article_edit', {action: 'article_edit', article_id: article._id, title: article.title, content: article.content, tags: all_tags});
				})
			}else{
				res.render('error', {error: '对不起，你不能编辑此话题'});
				return;
			}
		});
	}

	if(method == 'post'){
		if(article_id.length != 24){
			res.render('error', {error: '无此信息或已被删除'});
			return;
		}
		var where = {_id: article_id}
		get_article_by_query_once(where, function(err, article){
			if(!article){
				res.render('error', {error: '无此信息或已被删除'});
				return;
			}
			if(article.author_id == req.session.user._id || req.session.user.is_admin){
				var title = sanitize(req.body.title).trim();
				title = sanitize(title).xss();		    	
		    	var tags_ids = req.body.tags_ids;
		    	var tags_id_array = [];
		    	if(tags_ids && tags_ids != ''){
			    	tags_ids = sanitize(tags_ids).trim();
			    	tags_ids = sanitize(tags_ids).xss();
		    		tags_id_array = tags_ids.split(',');
		    	}
				var content = req.body.content;
				if(title == ''){
					tagCtrl.get_all_tags(function(err, tags){
						if(err) return next();
						
						for(var i = 0; i<tags_id_array.length; i++){
							for(var j = 0; j<tags.length; j++){
								if(tags_id_array[i] = tags[j]._id){
									tags[j].is_selected = true;
								}
							}
						}
						
						res.render('article_edit', {error: '标题不能为空', content: content, tags: tags});
						return;
					});
				}
				if(content == ''){
					tagCtrl.get_all_tags(function(err, tags){
						if(err) return next();
						
						for(var i = 0; i<tags_id_array.length; i++){
							for(var j = 0; j<tags.length; j++){
								if(tags_id_array[i] = tags[j]._id){
									tags[j].is_selected = true;
								}
							}
						}
						
						res.render('article_edit', {error: '内容不能为空', title: title, tags: tags});
						return;
					});
				}
				
				article.title = title;
				article.content = content;
				article.update_at = Date.now();
				article.edit_id = req.session.user._id;
				
				article.save(function(err){
					if(err) return next(err);
					
					var render = function(){
						res.redirect('/');
					}
					var proxy = new EventProxy();
					proxy.assign('articles_tag_saved', 'articles_tag_removed', render);
										
					var article_tag_remove_done = function(){
						proxy.trigger('articles_tag_removed');
					}
					ArticleTag.find({article_id: article._id}, function(err, articleTags){
						if(articleTags.length == 0){
							proxy.trigger('articles_tag_removed');
						}else{
							proxy.after('article_tag_removed', articleTags.length, article_tag_remove_done);
							
							for(var i = 0; i<articleTags.length; i++){
								(function(i){
									articleTags[i].remove(function(err){
										if(err) return next(err);
										tagCtrl.get_tag_by_query_once({_id: articleTags[i].tag_id},function(err,tag){
							              if(err) return next(err);
							              tag.artcile_count -= 1;
							              tag.save();
							              proxy.trigger('article_tag_removed');
							            });
									});
								})(i);
							}
						}
					});
					
					var article_tag_save_done = function(){
						proxy.trigger('articles_tag_saved');
					}
					
					if(tags_id_array.length == 0){
						proxy.trigger('articles_tag_saved');
					}else{
						proxy.after('article_tag_saved', tags_id_array.length, article_tag_save_done);
						
						for(var i = 0; i<tags_id_array.length; i++){
							(function(i){
								var article_tag = new ArticleTag();
								article_tag.article_id = article._id;
								article_tag.tag_id = tags_id_array[i];
								article_tag.save(function(err){
									if(err) return next(err);
									
									proxy.trigger('article_tag_saved');
								});
								tagCtrl.get_tag_by_query_once({_id: tags_id_array[i]},function(err,tag){
					              if(err) return next(err);
					              tag.artcile_count += 1;
					              tag.save();
					            });
							})(i);
						}
					}
				});
			}else{
				res.render('error', {error: '对不起，你不能编辑此话题'});
				return;
			}
		});
	}
};

//delete article
exports.article_del = function(req, res, next){
	if(!req.session.user){
		res.redirect('/login');
		return;
	}
	
	var article_id = req.params.aid;
	if(article_id.length != 24){
		res.render('error', {error: '无此信息或已被删除'});
		return;
	}
	var where = {_id: article_id}
	get_article_by_query_once(where, function(err, article){
		if(err) return cb(err);
		if(!article){
			res.render('error', {error: '无此信息或已被删除'});
			return;
		}
		
		var proxy = new EventProxy();
		var render = function(){
			res.render('error', {success: '信息已删除'});
			return;
		}
		proxy.assign('article_remove', render);
		article.remove(function(err){
			if(err) return next(err);
			proxy.trigger('article_remove');
		});
	});
}

//根据条件查询单条信息数据
function get_article_by_query_once(query, cb){
	var proxy = new EventProxy();
	var done = function(article, author, edit, tags, replies){
	    return cb(null, article, author, edit, tags, replies);
	};
	
	proxy.assign('article', 'author', 'edit', 'tags', 'replies', done);
	
	Article.findOne(query, function(err, article){
		if(err) return cb(err);
		if(!article){
			proxy.trigger('article', null);
			proxy.trigger('author', null);
			proxy.trigger('tags', []);
			proxy.trigger('edit', null);
			proxy.trigger('replies', null);
			return;
		}
		
		proxy.trigger('article', article);
		
		var user_where = {_id: article.author_id};
		userCtrl.get_user_by_query_once(user_where, function(err, author){
			if(err) return cb(err);
			proxy.trigger('author', author);
		});
		user_where = {_id: article.edit_id};
		userCtrl.get_user_by_query_once(user_where, function(err, edit){
			if(err) return cb(err);
			proxy.trigger('edit', edit);
		});
		
		Reply.find({article_id: article._id}, [], {limit: 1, sort: [ ['reply_at', 'desc'] ]}, function(err, replies){
			if(err) return cb(err);
			if(replies.length > 0){
				userCtrl.get_user_by_query_once({_id: replies[replies.length-1].author_id}, function(err, user){
					if(err) return cb(err);
					
					replies[replies.length-1].author = user;
					replies[replies.length-1].reply_time = Util.format_date(replies[replies.length-1].reply_at);
					
					proxy.trigger('replies', replies[0]);
				});
			}else{
				proxy.trigger('replies', null);
			}
		});
		
		ArticleTag.find({article_id: article._id}, function(err, articleTags){
			if(err) return cb(err);
			
			var tags_ids = [];
			for(var i = 0; i<articleTags.length; i++){
				tags_ids.push(articleTags[i].tag_id);
			}
			
			tagCtrl.get_tags_by_query({_id:{'$in': tags_ids}}, function(err, tags){
				if(err) return cb(err);
				proxy.trigger('tags', tags);
			})
		})
	});
}

//获得所有文章信息，所有评论
function get_article_by_query_full(query, cb){
	var proxy = new EventProxy();
	var done = function(article, author, edit, tags, replies){
	    return cb(null, article, author, edit, tags, replies);
	};
	
	proxy.assign('article', 'author', 'edit', 'tags', 'replies', done);
	
	Article.findOne(query, function(err, article){
		if(err) return cb(err);
		if(!article){
			proxy.trigger('article', null);
			proxy.trigger('author', null);
			proxy.trigger('tags', []);
			proxy.trigger('edit', null);
			proxy.trigger('replies', null);
			return;
		}
		
		proxy.trigger('article', article);
		
		var user_where = {_id: article.author_id};
		userCtrl.get_user_by_query_once(user_where, function(err, author){
			if(err) return cb(err);
			proxy.trigger('author', author);
		});
		user_where = {_id: article.edit_id};
		userCtrl.get_user_by_query_once(user_where, function(err, edit){
			if(err) return cb(err);
			proxy.trigger('edit', edit);
		});
		var reply_where = {article_id: article._id};
		replyCtrl.get_reply_by_query(reply_where,{sort: [['reply_at', 'asc']]}, function(err, replies){
			if(err) return cb(err);
			proxy.trigger('replies', replies);
		});
		
		ArticleTag.find({article_id: article._id}, function(err, articleTags){
			if(err) return cb(err);
			
			var tags_ids = [];
			for(var i = 0; i<articleTags.length; i++){
				tags_ids.push(articleTags[i].tag_id);
			}
			
			tagCtrl.get_tags_by_query({_id:{'$in': tags_ids}}, function(err, tags){
				if(err) return cb(err);
				proxy.trigger('tags', tags);
			})
		})
	});
}

//指明查询条件查询多条信息
function get_articles_by_query(where, opt, cb){
	Article.find(where,['_id'], opt, function(err, docs){
		if(err) return cb(err, null);
		if(docs.length == 0) return cb(err, []);
		
		var articles_id = [];
		for(i = 0; i<docs.length; i++){
			articles_id.push(docs[i]._id);
		}
		
		var proxy = new EventProxy();
		var done = function(){
			return cb(null, articles);
		}
		
		var articles = [];
		proxy.after('articles.ready', articles_id.length, done);
		var where = {};
		for(i = 0; i<articles_id.length; i++){
			(function(i){
				where = {_id: articles_id[i]}
				get_article_by_query_once(where, function(err, article, author, edit, tags, replies){
					if(err) return cb(err);
					article.author = author;
					article.edit = edit;
					article.create_at = Util.format_date(article.create_time);
					article.update_time = Util.format_date(article.update_at);
					article.tags = tags;
					article.reply = replies;
					if(article.last_reply_at){
						article.last_reply_time = Util.format_date(article.last_reply_at);
					}
					articles[i] = article;
					proxy.trigger('articles.ready');
				});
			})(i);
		}
	});
}

function get_article_counts(where, cb){
	Article.count(where, function(err, count){
		if(err) return cb(err);
		return cb(err, count);
	});
}

exports.get_article_by_query_once = get_article_by_query_once;
exports.get_articles_by_query = get_articles_by_query;
exports.get_article_counts = get_article_counts;