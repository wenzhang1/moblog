/*
 * replies.js 评论数据库管理
 * author: moskito
 * create_time: 2012-08-23
 * */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId= Schema.ObjectId;

var ReplySchema = new Schema({
	reply_content : {type : String},
	article_id : {type : ObjectId},
	author_id : {type : ObjectId},
	reply_id: {type: ObjectId},
	reply_at : {type : Date, default : Date.now}
});

mongoose.model('Reply', ReplySchema); 