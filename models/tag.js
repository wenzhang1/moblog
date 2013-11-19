/*
 * tag.js 标签管理数据库
 * author: moskito
 * create time: 2012-08-07
 * */
 
 var mongoose = require('mongoose');
 var Schema = mongoose.Schema;
 
 var TagSchema = new Schema({
 	name : {type : String},
 	description : {type : String},
 	creat_at : {type : Date, default : Date.now},
 	order : {type : Number, default : 0},
 	artcile_count : {type : Number, default : 0}
 });
 
 mongoose.model('Tag', TagSchema);