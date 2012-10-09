/**
 * Module dependencies.
 */
var express = require('express');
var path = require('path');
var config = require('./config').config;
var routes = require('./routes');
var ndir = require('ndir');
//创建服务器
var app = module.exports = express.createServer();
// 定义共享环境
config.upload_dir = config.upload_dir || path.join(__dirname, 'public', 'upload', 'imgaes');
ndir.mkdir(config.upload_dir, function (err) {
  if (err) {
    throw err;
  }
});
app.configure(function(){
  //设定模板目录
  var viewsRoot = path.join(__dirname, 'views');
  //设置模板引擎
  app.set('view engine', 'html');
  app.set('views', viewsRoot);
  //使用ejs渲染html模板引擎
  app.register('.html', require('ejs'));
  //app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser({
	  uploadDir: config.upload_dir
  }));
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.session_secret
  }));
  //检测用户中间件
  app.use(require('./controllers/user').auth_user);
  //输出侧边栏
  app.use(require('./controllers/site').side_bar);
  var csrf = express.csrf();
  app.use(function(req, res, next){
    if(req.body && req.body.user_action === 'uploadImg'){
	return next();
    }
    csrf(req, res, next);
  });
});
//定义locals变量
app.helpers({
    config: config
});
app.dynamicHelpers({
    _csrf: function(req, res){
	return req.session ? req.session._csrf : '';
    }
});
var maxAge = 1000 * 60; 
app.use('/upload/', express.static(config.upload_dir, { maxAge: maxAge }));
// old image url: http://host/user_data/images/xxxx
app.use('/user_data/', express.static(path.join(__dirname, 'public', 'user_data'), { maxAge: maxAge }));
var staticDir = path.join(__dirname, 'public');
//定义开发环境
app.configure('development', function(){
  app.use(express.static(staticDir));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
//定义生产环境
app.configure('production', function(){
  app.use(express.static(staticDir, {maxAge: maxAge}));
  app.use(express.errorHandler());
  app.use('view cache',true);
});
// Routes
routes(app);
var port = config.port;
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
