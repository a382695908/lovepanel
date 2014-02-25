var mongodb = require('./mongodb');

var replySchema = new mongodb.Schema({
	blog_id : {type : mongodb.Schema.Types.ObjectId, required : true, ref : 'LvBlog'},   //博客Id
	user_id : {type : mongodb.Schema.Types.ObjectId, required : true, ref : 'User'},   //用户Id
	author : {type : String, required : true},   //用户名	
	replycontent : String,
	replytime : Date
},{
	collection : "lvreply"
});

module.exports = mongodb.model("LvReply",replySchema);