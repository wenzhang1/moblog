/*
 * reply.js 评论管理
 * author: moskito
 * create_time: 2012-08-23
 * */

var config = require('../config').config;
var models = require('../models');
var Reply = models.Reply;
var Article = models.Article;
var articleCtrl = require('./article');
var userCtrl = require('./user');
var EventProxy = require('eventproxy').EventProxy;
var check = require('validator').check,
	sanitize = require('validator').sanitize;
var Util = require('../libs/utils');

exports.reply_add = function(req, res, next){
	if(!req.session.user){
		res.render('login', {error: '请登录后再发表评论'});
		return;
	}
	
	var article_id = req.params.aid;
	var reply_content = sanitize(req.body.reply_content).trim();
	reply_content = sanitize(reply_content).xss();
	if(reply_content == ''|| reply_content =='<br />' || reply_content == '<br/>'){
		res.render('error', {error: '评论信息不能为空'});
		return;
	}

	var render = function(){
		res.redirect('/article_view/'+article_id);
	}
	var proxy = new EventProxy();
	proxy.assign('reply_saved', render);
	
	reply = new Reply();
	reply.reply_content = reply_content;
	reply.reply_at = Date.now();
	reply.article_id = article_id;
	reply.author_id = req.session.user._id;
	
	reply.save(function(err){
		if(err) return next(err);
		articleCtrl.get_article_by_query_once({_id: article_id}, function(err, article){
			if(err) return next(err);
			
			article.last_reply_at = Date.now();
			article.reply_count += 1;
			article.save();
			
			proxy.trigger('reply_saved');
		});
	});
	
	userCtrl.get_user_by_query_once({_id: reply.author_id}, function(err, user){
		user.reply_count += 1;
		user.save();
		req.session.user.reply_count += 1;
		proxy.trigger('user_saved');
	});
}

exports.reply2_add = function(req, res, next){
	if(!req.session.user){
		res.send('请登录后再发表评论');
		return;
	}
	
	var article_id = req.params.aid;
	if(article_id.length != 24){
		res.send('要评论的文章不存在或被删除');
		return;
	}
	
	var reply_id = req.body.reply_id;
	var reply2_content = req.body.r2_content;
	if(reply2_content == '' || reply2_content =='<br />' || reply2_content == '<br/>'){
		res.send('评论的内容不能为空');
		return;
	}
	
	var done = function(){
		get_reply_by_query_once({_id: reply._id}, function(err, reply){
			if(err) return next(err);
			
			res.partial('reply/reply2', {object: reply, as: 'reply'});
		});
	};
	
	var proxy = new EventProxy();
	proxy.assign('reply2_saved', done);
	
	var reply = new Reply();
	reply.reply_content = reply2_content;
	reply.reply_at = Date.now();
	reply.reply_id = reply_id;
	reply.article_id = article_id;
	reply.author_id = req.session.user._id;
	
	reply.save(function(err){
		if(err) return next(err);
		
		articleCtrl.get_article_by_query_once({_id: article_id}, function(err, article){
			if(err) return next(err);
			
			article.last_reply_at = Date.now();
			article.reply_count += 1;
			article.save();
			
			proxy.trigger('reply2_saved');
		})
	})
}

exports.reply_del = function(req, res, next){
	if(!req.session.user || !req.session.user.is_admin){
		res.render('error', {error: '对不起，你没有权限进行操作1'});
		return;
	}
	
	var reply_id = req.params.rid;
	if(reply_id.length != '24'){
		res.render('error', {error: '对不起，没有此回复或已被删除'});
		return;
	}
	
	if(req.session.user.is_admin){
	get_reply_by_query_once({_id: reply_id}, function(err, reply){
		if(err) return next(err);
		
		if(!reply){
			res.render('error', {error: '对不起，没有此回复或已被删除'});
			return;
		}
		
		var proxy = new EventProxy();
		var done = function(){
			res.render('error', {success: '评论已删除'});
			return;
		}
		proxy.assign('reply_removed', done);
		
		Article.findOne({_id: reply.article_id}, function(err, article){
			article.reply_count -= 1;
			article.save();
		});
		
		reply.author.reply_count -= 1;
		reply.author.save();
		
		reply.remove(function(err){
			if(err) return next(err);
			
			proxy.trigger('reply_removed');
		});
	});
	}else{
		res.render('error', {error: '对不起，你没有权限进行操作'});
		return;
	}
}

function get_reply_by_query_once(where, cb){
	Reply.findOne(where, function(err, reply){
		if(err) return cb(err);
		
		if(!reply){
			return cb(err, null);
		}
		
		userCtrl.get_user_by_query_once({_id: reply.author_id}, function(err, user){
			if(err) return cb(err);
			
			reply.author = user;
			reply.reply_content = Util.xss(reply.reply_content);
			reply.reply_time = Util.format_date(reply.reply_at);
			
			return cb(err, reply);
		});
	});
}

function get_reply_by_query(where, opt, cb){
	Reply.find(where,[], opt, function(err, replies){
		if(err) return cb(err);
		
		if(replies.length == 0){
			return cb(err, []);
		}
		
		var done = function(){
			var replies2 = [];
			
			for(var i = replies.length-1; i >= 0; i--){
				if(replies[i].reply_id){
					replies2.push(replies[i]);
					replies.splice(i, 1);
				}
			}
			
			for(var j = 0; j<replies.length; j++){
				replies[j].replies = [];
				for(var k = 0; k<replies2.length; k++){
					var id1 = replies[j]._id;
					var id2 = replies2[k].reply_id;
					if(id1.toString() === id2.toString()){
						replies[j].replies.push(replies2[k]);
					}
				}
				replies[j].replies.reverse();
			}
			return cb(err, replies);
		}
		var proxy = new EventProxy();
		proxy.after('reply_find', replies.length, done);
		
		for(var i = 0; i<replies.length; i++){
			(function(i){
				userCtrl.get_user_by_query_once({_id: replies[i].author_id}, function(err, user){
					if(err) return cb(err);
					
					replies[i].author = user;
					replies[i].reply_time = Util.format_date(replies[i].reply_at);
					replies[i].reply_content = Util.xss(replies[i].reply_content);
					
					proxy.trigger('reply_find');
				});
			})(i);
		}
	});
}

exports.get_reply_by_query_once = get_reply_by_query_once;
exports.get_reply_by_query = get_reply_by_query;