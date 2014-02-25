var mongodb = require('./mongodb');

var userSchema = new mongodb.Schema({
	username : {type : String, unique : true, required : true},   //设置唯一值
	password : String,
	nickname : String,
	email : String,
	gender : Boolean,
	birthday : String,
	moodsign : String,   //个性签名
	create_date : {type : Date, default : Date.now},
	login_date : Date,     //登录时间
	logout_date : Date,
	reckmenum : {type : Number, default : 0}   //与我相关的记录条数[不存入数据库]
},{
	collection: "user"
});

module.exports = mongodb.model("User",userSchema);
