
/*
 * routes/index.js 路由配置页面
 * author: moskito
 * create time: 2012-07-15
 */

var site = require('../controllers/site');
var article = require('../controllers/article');
var user = require('../controllers/user');
var upload = require('../controllers/upload');
var tag = require('../controllers/tag');
var reply = require('../controllers/reply');
var search = require('../controllers/search');

module.exports = function(app){
    //index
    app.get('/', site.index);

    //create
    app.get('/article_create', article.article_create);
    app.post('/article_create', article.article_create);
    
    //view
    app.get('/article_view/:aid', article.article_view);
    
    //edit
    app.get('/article_edit/:aid', article.article_edit);
    app.post('/article_edit/:aid', article.article_edit);
    
    //del
    app.get('/article_del/:aid', article.article_del);

    //user
    app.get('/user_views', user.user_views);
    app.get('/user_add', user.add_html);
    app.post('/useradd', user.add_action);
    app.get('/login', user.login);
    app.post('/login', user.login);
    app.get('/login_out', user.login_out);
    app.get('/change_password/:uid', user.change_password);
    app.post('/change_password/:uid', user.change_password);
    app.get('/del_user/:uid', user.del_user);
    app.get('/user_view/:uname', user.user_view);
    
    //upload
    app.get('/upload', upload.upload_html);
    app.post('/uploadImg', upload.uploadImg);
    
    //tag
    app.get('/tag_create', tag.tag_create);
    app.post('/tag_create', tag.tag_create);
    app.get('/tag_edit/:tid', tag.tag_edit);
    app.post('/tag_edit/:tid', tag.tag_edit);
    app.get('/tag_del/:tid', tag.tag_del);
    app.get('/tag/:tid', tag.article_list);
    app.get('/tags', tag.tags_list);
    
    //reply
    app.post('/:aid/reply', reply.reply_add);
    app.post('/:aid/reply_2', reply.reply2_add);
    app.get('/reply_del/:rid', reply.reply_del);
    
    //search
    app.get('/search', search.search_list);
}
