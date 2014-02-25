var mongodb = require('./mongodb');

var blogSchema = new mongodb.Schema({
	user_id : {type : mongodb.Schema.Types.ObjectId, ref : 'User', required : true},   //用户id
	reply_id : [{type : mongodb.Schema.Types.ObjectId, ref : 'LvReply'}],  //回复id
	title : {type : String, required : true},
	username : String,  //用户名
	posttime : Date,  //发表时间
	postcontent : String,  //详细内容
	imgurl : String,   //封面图片路径
	imgfallurl : String, //瀑布流图片路径
	imgdesc : String,  //图片描述
	visibility : {type : Boolean, default : true},  //是否公开可见
	pvnum : {type : Number, default : 0},    //浏览量
	replynum : {type : Number, default : 0},  //回复数
	yesnum : {type : Number, default : 0},   //顶
	nonum : {type : Number, default : 0}   //踩
},{
	collection : "lvblog"
});

module.exports = mongodb.model("LvBlog",blogSchema);