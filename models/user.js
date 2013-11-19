/*
 * user.js 用户管理数据库
 * author: moskito
 * create time: 2012-07-14
 * */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var userSchema = new Schema({
    user_name : {type : String},
    password : {type : String},
    create_time : {type : Date, default : Date.now},
    update_at : {type: Date, default : Date.now},
    email : {type : String},
    edit_id: {type : ObjectId},
    reply_count: {type : Number, default : 0},
    article_count: {type : Number, default : 0}
});

mongoose.model('User',userSchema);
