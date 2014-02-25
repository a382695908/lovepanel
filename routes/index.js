var userModel = require("../models/user")
   ,filter = require("../models/filter")
   ,lvBlogModel = require("../models/lv-blog")
   ,lvReplyModel = require("../models/lv-reply")
   ,crypto = require('crypto');

/*
 * Page views
 */
module.exports = function(app){
	
	/* index page */
	app.get("/",function(req, res){
	  res.render('index',{title : '首页', user : req.session.user});
	});
    
    /* 退出系统 */
	app.get("/logout",function(req,res){
		var user = req.session.user,
			_date = new Date();
		userModel.update({'_id':user._id},{$set:{logout_date:_date}},function(err){
			console.log(err);
		});
		req.session.user = null;  //清空session
		res.redirect("/");
	});

	/* 用户登录 */
	app.get("/login",filter.checkNotLogin,function(req, res){    //如果已经登录，则不再允许访问登录页面
		res.render("login",{title : '登录', error : req.flash("error").toString()});
	});
	app.post("/login",function(req, res){
		var username = req.body['username'],
			password = req.body['password'],
			md5 = crypto.createHash('md5'),
     		password_MD5 = md5.update(password).digest('hex'), //对密码进行加密
     		_date = new Date(); 
     	//根据账号密码查询用户并且更新登录时间
 		userModel.findOneAndUpdate({'username' : username,'password':password_MD5},{$set:{login_date:_date}},function(err,user){
 			if(err){
 				throw err;
 			}else if(user==null){
 				req.flash("error","用户名和密码有误，请重新尝试。");
				return res.redirect("/login");
 			}else{
 				lvBlogModel.find({'user_id':user._id}).select('_id').exec(function(err,ids){
 					if(err){
 						throw err;
 					}else if(ids==null){
 						req.session.user = user;
						return res.redirect("/u/home");
 					}else{
 						logout_date = user.logout_date==null?_date:user.logout_date;
 						lvReplyModel.count({'replytime':{$gte:logout_date,$lte:_date},'blog_id':{$in:ids}},function(err,count){
 							user.reckmenum = count;
 							req.session.user = user;
							return res.redirect("/u/home");
 						});
 					}
 				});
 			}
 		});
	});

	/* 检查用户名是否存在【异步】 */
	app.post("/checkUsername",function(req,res){
		var _username = req.param("username");
		userModel.findOne({'username' : _username},function(err,user){
			if(err){
				return res.json({success:false,msg:err});
			}else if(user!=null){
				return res.json({success:false,msg:"该用户名已存在!"});
			}else{
				return res.json({success:true,msg:"该用户名可用!"});
			}
		});
	});	

	/* 用户注册 */
	app.get("/register",filter.checkNotLogin,function(req,res){    //如果已经登录，则不再允许访问注册页面
		res.render("register",{title : "注册" , error : req.flash("error").toString()});
	});
	app.post("/register",function(req, res){ 
		var password = req.body.password,
			twoPassword = req.body.password;
		if(password != twoPassword){
			req.flash("error","两次密码输入不一致!");
			return res.redirect("/register");
		}
		var md5 = crypto.createHash('md5'),
     		password_MD5 = md5.update(password).digest('hex'),//对密码进行加密
     		date = new Date(); 

		var newuser = new userModel({
			username : req.body.username,
			password : password_MD5,
			nickname : req.body['nickname'],
			email : req.body['email']
		});
		newuser.save(function(err){
			if(err){
				req.flash("error","注册失败，失败原因："+err.message);
				return res.redirect("/register");
			}else{
				req.session.user = newuser;
				return res.redirect("/u/home");
			}
		});
	});
} 