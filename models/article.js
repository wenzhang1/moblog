/*
 * article.js 文章管理数据库
 * author: moskito
 * create time: 2012-07-14
 * */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var articleData = {
    author_id : {type : ObjectId},
    title : {type : String},
    content : {type : String},
    view_count : {type : Number, default : 0},
    create_time: {type : Date, default : Date.now},
    update_at: {type : Date, default : Date.now},
    last_reply_at: {type : Date},
    reply_count: {type : Number, default : 0},
    edit_id: {type : ObjectId}
}
var articleSchema = new Schema(articleData);

mongoose.model('Article',articleSchema);
