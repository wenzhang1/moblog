/*
 * user.js 用户编辑和添加
 * author: moskito
 * create time: 2012-07-14
 * */

var config = require('../config').config;
var models = require('../models');
var crypto = require('crypto');
var check = require('validator').check,
    sanitize = require('validator').sanitize;
var User = models.User;
var EventProxy = require('eventproxy').EventProxy;
var Util = require('../libs/utils');
var articleCtrl = require('./article');
var Reply = models.Reply;
var url = require('url');

//add view
exports.add_html = function(req, res, next){
    res.render('user_add');
};

//user list view
exports.user_views = function(req, res, next){
    if(!req.session.user || !req.session.user.is_admin){
    	res.render('error', {error: '对不起,你没有权限这么做'});
    	return;
    }else{
	    var limit = 10;
	    var current_page = parseInt(req.query.page, 10) || 1;
		var pathname = url.parse(req.url).pathname;

	    var render = function(users, pages){
	    	res.render('user_views',{
	    		users: users,
				current_page: current_page,
				pages: pages,
				base_url: pathname
	    	});
	    }
	    var proxy = new EventProxy();
	    var where = {};
	    var opt = {skip: (current_page - 1) * limit, limit: limit, sort: [ ['create_time', 'asc'] ]};
	    var once_where = {};
		proxy.assign('users', 'pages', render);
	    get_user_by_query(where, opt, function(err, users){
	    	if(err) return next(err);
	    	
	    	var user_done = function(userRow){
	    		proxy.trigger('users', userRow);
	    	}
	    	
	    	proxy.after('usersRow', users.length, user_done);
	    	for(var i = 0; i<users.length; i++){
	    		(function(i){
	    			once_where = {_id: users[i].edit_id};
	    			get_user_by_query_once(once_where, function(err, edit){
	    				if(err) return next(err);
	    				users[i].edit = edit;
	    				users[i].create_at = Util.format_date(users[i].create_time);
	    				users[i].update_time = Util.format_date(users[i].update_at);
	    				proxy.trigger('usersRow', users[i]);
	    			});
	    		})(i);
	    	}
	    });
	    
	    User.count(where, function(err, user_count){
	    	if(err) return next(err);
	    	
	    	var pages = Math.ceil(user_count / limit);
	    	proxy.trigger('pages', pages);
	    });
    }
};

exports.user_view = function(req, res, next){
	var user_name = req.params.uname;
	
	var render = function(user, new_articles, new_replies){
		res.render('user_view',{
			user: user,
			new_articles: new_articles,
			new_replies: new_replies
		});
	}
	
	var proxy = new EventProxy();
	proxy.assign('user', 'new_articles', 'new_replies', render);
	get_user_by_query_once({user_name: user_name}, function(err, user){
		if(err) return next(err);
		
		user.create_at = Util.format_date(user.create_time);
		proxy.trigger('user', user);
		
		articleCtrl.get_articles_by_query({author_id: user._id},{limit: 5, sort: [ ['create_time', 'desc'] ]}, function(err, articles){
			if(err) return next(err);
			
			Util.article_tran(articles);
			
			proxy.trigger('new_articles', articles);
		});
		
		Reply.find({author_id: user._id}, [], {limit: 5, sort: [ ['reply_at', 'desc'] ]}, function(err, replies){
			if(err) return next(err);
			
			var article_ids = [];
			for(var i = 0; i < replies.length; i++){
				article_ids.push(replies[i].article_id);
			}
			var where = {_id: {'$in': article_ids}};
			articleCtrl.get_articles_by_query(where, {}, function(err, articles){
				if(err) return next(err);
				
				Util.article_tran(articles);
				
				proxy.trigger('new_replies', articles);
			});
		});
	});
}

//add user action
exports.add_action = function(req, res, next){
    var user_name = sanitize(req.body.user_name).trim();
    user_name = sanitize(user_name).xss();
    var password = sanitize(req.body.password).trim();
    password = sanitize(password).xss();
    var email = sanitize(req.body.email).trim();
    email = sanitize(email).xss();
    if(user_name == '' || email == '' || password == ''){
    	res.render('user_add', {error: '信息不能为空', user_name: user_name, email: email});
    	return;
    }
    //验证用户名
    try{
    	check(user_name, '用户名只能使用字母和数字').isAlphanumeric();
    }catch(e){
    	res.render('user_add',{error: e.message, user_name: user_name, email: email});
    	return;
    }
    //验证电子邮箱
    try{
    	check(email, '不正确的电子邮箱').isEmail();
    }catch(e){
    	res.render('user_add',{error: e.message, user_name: user_name, email: email});
    	return;
    }
    
    User.find({'$or':[{'user_name': user_name},{'email': email}]}, function(err, userRow){
		if(err){
		    return next(err);
		}
		if(userRow.length > 0){
		    res.render('user_add', {error: '用户名或邮箱已被使用,请重新输入',user_name: user_name,email: email});
		    return;
		}
		
		password = md5(password);
		user = new User();
		user.user_name = user_name;
		user.password = password;
		user.email = email;
		user.create_time = Date.now();
		
		user.save(function(err){
			if(err) return next(err);
			
			User.findOne({'user_name': user_name}, function(err, userRow){
				if(err) return next(err);
				
				if(userRow){
					gen_session(userRow, res, req);
					
					res.redirect('/');
				}else{
					res.render('login',{error: '没有此用户，或已被删除'});
	    			return;
				}
			});
		});
    });

}

//login
exports.login = function(req, res, next){
   var method = req.method.toLowerCase();
   if(method === 'get'){
       res.render('login');
       return;
   }
   if(method === 'post'){
       var user_name = sanitize(req.body.user_name).trim();
       user_name = sanitize(user_name).xss();
       var password = sanitize(req.body.password).trim();
       password = sanitize(password).xss();

       if(!user_name || !password){
	   res.render('login',{error: '信息不完整'});
	   return;
       }
       User.findOne({'user_name': user_name},function(err, userRow){
	    if(err){
		return next(err);
	    }
	    if(!userRow){
	    	res.render('login',{error: '没有此用户，或已被删除'});
	    	return;
	    }
	    password = md5(password);
	    if(password != userRow.password){
		res.render('login',{error: '密码错误'});
		return;
	    }

	    //设置cookie
	    gen_session(userRow, res, req);
	    
	    res.redirect('/');

       })
   }
}

//logout
exports.login_out = function(req, res, next){
    req.session.destroy();
    res.clearCookie(config.auth_cookie_name, {path: '/'});
    res.redirect('/');
}

//change password
exports.change_password = function(req, res, next){
	if(!req.session.user){
		res.redirect('/login');
		return;
	}
	var user_id = req.params.uid;
	var method = req.method.toLowerCase();
	if(method == 'get'){
		if(user_id.length != 24){
			res.render('error', {error: '没有此用户，或已被删除'});
			return;
		}
		var where = {_id: user_id};
		get_user_by_query_once(where, function(err, user){
			if(err) return next(err);
			
			if(!user){
				res.render('error', {error: '没有此用户，或已被删除'});
				return;
			}
			
			if(user._id == req.session.user._id || req.session.user.is_admin){
				res.render('change_password', {action: 'change_password', user: user});
				return;
			}else{
				res.render('change_password', {error: '对不起，你没有权限修改此用户'});
				return;
			}
		})
	}
	
	if(method == 'post'){
		if(user_id.length != 24){
			res.render('error', {error: '没有此用户，或已被删除'});
			return;
		}
		var where = {_id: user_id};
		get_user_by_query_once(where, function(err, user){
			if(err) return next(err);
			
			if(!user){
				res.render('error', {error: '没有此用户，或已被删除'});
				return;
			}
			
			if(user._id == req.session.user._id || req.session.user.is_admin){
				var old_password = sanitize(req.body.old_password).trim();
				old_password = sanitize(old_password).xss();
				old_password = md5(old_password);
				if(old_password != user.password){
					res.render('change_password', {error: '旧密码输入错误！', action: 'change_password', user: user});
					return;
				}
				
				var new_password = sanitize(req.body.new_password).trim();
				new_password = sanitize(new_password).xss();
				var re_password = sanitize(req.body.re_password).trim();
				re_password = sanitize(re_password).xss();
				if(new_password == '' || re_password == ''){
					res.render('change_password', {error: '新密码不能为空', action: 'change_password', user: user});
					return;
				}
				if(new_password != re_password){
					res.render('change_password', {error: '两次密码输入不同', action: 'change_password', user: user});
					return;
				}
				
				user.password = md5(new_password);
				user.update_at = Date.now();
				user.edit_id = req.session.user._id;
				user.save(function(err){
					if(err) return next(err);
					
					if(req.session.user._id != user._id && req.session.user.is_admin){
						res.redirect('/user_views');
						return;
					}else{
					    res.redirect('/login_out');
					    return;
					}
				})
			}else{
				res.render('change_password', {error: '对不起，您不能修改此用户的密码'});
				return;
			}
		})
	}
}

//delete user
exports.del_user = function(req, res, next){
	if(!req.session.user){
		res.redirect('/login');
		return;
	}
	
	var user_id = req.params.uid;

	if(user_id.length != 24){
		res.render('error', {error: '没有此用户，或已被删除'});
		return;
	}
	if(user_id == req.session.user._id){
		res.render('error', {error: '对不起，您不能删除自己的账户'});
		return;
	}
	var where = {_id: user_id}
	get_user_by_query_once(where, function(err, user){
		if(err) return next(err);
		
		if(!user){
			res.render('error', {error: '没有此用户，或已被删除'});
			return;
		}
		
		var proxy = new EventProxy();
		var render = function(){
			res.redirect('/user_views');
			return;
		}
		proxy.assign('user_remove', render);
		if(user._id != req.session.user._id && req.session.user.is_admin){
			var where = {author_id: user._id};
			var opt = {};
			articleCtrl.get_articles_by_query(where, opt, function(err, articles){
				for(var i = 0; i<articles.length; i++){
					articles[i].remove(function(err){
						if(err) return next(err);
					});
				}
				user.remove(function(err){
					if(err) return next(err);
					proxy.trigger('user_remove');
				});
			});
		}else{
			res.render('error', {error: '对不起，您没有权限删除用户'});
			return;
		}
	});
}
//检测用户中间件
exports.auth_user = function(req,res,next){
  if(req.session.user){
  	//如果存在session,直接调用
	if(config.admins[req.session.user.user_name]){
	  	req.session.user.is_admin = true;
	}else{
		req.session.user.is_admin = false;
	}
   	res.local('current_user',req.session.user);
   	return next();
  }else{
  	//如果不存在session,从cookie中调用并设置session
    var cookie = req.cookies[config.auth_cookie_name];
    if(!cookie) return next();

    var auth_token = decrypt(cookie, config.session_secret);
    var auth = auth_token.split('\t');
    var user_id = auth[0];
    User.findOne({_id:user_id},function(err,user){
      if(err) return next(err);
      if(user){
          user.is_admin = config.admins[user.user_name] ? true : false;
      req.session.user = user;
      req.session.cookie.maxAge = 1000 * 60 * 60;
      res.local('current_user',req.session.user);
      return next();
      }else{
        return next();  
      }
    }); 
  }
};


//设置缓存函数
function gen_session(user, res, req){
    var auth_token = encrypt(user._id + '\t' + user.user_name + '\t' + user.password + '\t' + user.email, config.session_secret);
    res.cookie(config.auth_cookie_name, auth_token, {path: '/',maxAge: 1000 * 60 * 60}); //cookie 有效期１个小时
    req.session.user = user;
    req.session.cookie.maxAge = 1000 * 60 * 60;
}

//对称加密函数
function encrypt(str, secret){
    var cipher = crypto.createCipher('aes192', secret);
    var enc = cipher.update(str, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
}

function decrypt(str, secret){
    var decipher = crypto.createDecipher('aes192', secret);
    var dec = decipher.update(str, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

function md5(str) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
}


function get_user_by_query_once(where, cb){
	User.findOne(where, cb);
}
function get_user_by_query(where, opt, cb){
	User.find(where, [], opt, cb);
}

exports.get_user_by_query_once = get_user_by_query_once;
exports.get_user_by_query = get_user_by_query;