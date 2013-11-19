/*
 * artciel_tag.js 文章对应标签管理数据库
 * author: moskito
 * create time: 2012-08-07
 * */
 
 var mongoose = require('mongoose');
 var Schema = mongoose.Schema;
 var ObjectId = Schema.ObjectId;
 
 var ArticleTagSchema = new Schema({
 	article_id : {type : ObjectId},
 	tag_id : {type : ObjectId},
 	create_at : {type : Date, default : Date.now}
 });
 
 mongoose.model('ArticleTag', ArticleTagSchema);