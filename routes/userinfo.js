var lvBlogModel = require("../models/lv-blog")
  , lvreply = require("../models/lv-reply")
  , userModel = require("../models/user")
  , filter = require("../models/filter")
  , async = require('async')
  , crypto = require('crypto');

//limit-每页展示条数  lgth-页码显示个数   pagenum-当前页码   pageCount-总页数  total-总记录数
var page = {limit : 5, lgth : 4, pagenum : 1, pageCount : 0, total : 0}; 

module.exports = function(app){

	/* 访问自己主页 */
	app.get("/u/home", filter.checkLogin, function(req, res){
		var user = req.session.user,
		  search = {'user_id':user._id};
			  
		page['pagenum'] = req.query.p ? parseInt(req.query.p) : 1;    //设置页码
		//异步控制流
		async.series({
			one : function(cb){
				var skipfrom = page['pagenum'] * page['limit'] - page['limit'];   //计算查询起始值
				var query = lvBlogModel.find(search).sort("-posttime").skip(skipfrom).limit(page['limit']);  //显示全部博客
				//query.select("");    //可设置查询的列
				query.exec(function(err,list){   //分页查询博客列表
					cb(err,list);
				});
			},
			two : function(cb){
				lvBlogModel.count(search,function(err,count){   //查询总记录数
					cb(err,count);
				});
			}
		},function(err,results){
			if(err) throw err;
			page['total'] = results['two'];
			page['pageCount'] = Math.ceil(results['two']/page['limit']);
			res.render("home.ejs",{
				title : ' - '+user.username+' 主页',
				 page : page,
				 user : user,
		     bloglist : results['one']
			});
		});
	});
	//查看日志详情[对自己]
	app.get('/home/:bid([0-9A-Za-z]+)', filter.checkLogin, function(req,res){
		var bid = req.params.bid;
		//异步控制流
		async.series({
			one : function(cb){
				lvBlogModel.findOne({'_id' : bid},function(err,blog){
					if(!err && blog==null){
						err = new Error('notfound');
					}
					cb(err,blog);
				});
			},
			two : function(cb){
				lvreply.find({'blog_id':bid},function(err,replylist){
					cb(err,replylist);
				});
			}
		},function(err,results){
			if(err && err.message == 'notfound'){
				res.render("common/404");
			}else if(err){
				throw err;
			}else{
				res.render('lovedetail',{
					title : ' - ' + results['one'].title,
					 user : req.session.user,
					 blog : results['one'],
				replylist : results['two'] 
				});
			}
		});
	});
	//查看个人资料
	app.get("/u/upt", filter.checkLogin, function(req, res){
		var user = req.session.user;
		res.render('userinfo',{
			title : ' - ' + user.username + ' - 资料修改',
			 user : user,
	      success : req.flash('success').toString()
		});
	});
	//修改个人资料
	app.post("/u/upt", filter.checkLogin, function(req, res){
		var user = req.session.user,
		nickname = req.body['nickname'],
		  gender = req.body['gender'],
		birthday = req.body['birthday'],
		   email = req.body['email'];
		user['nickname'] = nickname;
		user['gender'] = gender;
		user['birthday'] = birthday;
		user['email'] = email;
 		userModel.update({'_id':user._id},{$set:{'nickname':nickname,'gender':gender,'birthday':birthday,'email':email}},function(err){
			if(err) throw err;
			req.session.user = user;
			req.flash('success',"资料修改成功！");
			return res.redirect('/u/upt');
		});
	});
	//修改密码
	app.get("/u/modifypwd", filter.checkLogin, function(req,res){
		var user = req.session.user;
		res.render('modifypwd',{
			title : ' - ' + user.username + ' - 修改密码',
			 user : user,
			error : req.flash("error").toString(),
		  success : req.flash("success").toString()
		});
	});
	app.post("/u/modifypwd", filter.checkLogin, function(req,res){
		var user = req.session.user,
		     md5 = crypto.createHash('md5'),
		    _md5 = crypto.createHash('md5'),
		oldPassword = req.body['oldPassword'],
    oldPassword_Md5 = md5.update(oldPassword).digest('hex'),
		newPassword = req.body['newPassword'],
	 twoNewPassword = req.body['twoNewPassword'],
	newPassword_Md5 = _md5.update(newPassword).digest('hex');
	     if(newPassword!=twoNewPassword){
	     	req.flash("error","两次密码输入不一致！");
	     	return res.redirect("/u/modifypwd");
	     }else if(user.password != oldPassword_Md5){
	     	req.flash("error","旧密码输入不正确！");
	     	return res.redirect("/u/modifypwd");
	     }else{
	     	userModel.update({'_id':user._id},{$set:{password:newPassword_Md5}},function(err){   //更新登录时间
				if(err) throw err;
				user['password'] = newPassword_Md5;
				req.session.user = user;
				req.flash("success","密码修改成功！");
				return res.redirect("/u/modifypwd");
			});
	     }
	});
	app.get("/u/admin", filter.checkLogin, function(req, res){
		var user = req.session.user,
		  search = {'user_id':user._id};
		page['limit'] = 15;
		page['pagenum'] = req.query.p ? parseInt(req.query.p) : 1;    //设置页码
		//异步控制流
		async.series({
			one : function(cb){
				var skipfrom = page['pagenum'] * page['limit'] - page['limit'];   //计算查询起始值
				var query = lvBlogModel.find(search).sort("-posttime").skip(skipfrom).limit(page['limit']);  //显示全部博客
				//query.select("");    //可设置查询的列
				query.exec(function(err,list){   //分页查询博客列表
					cb(err,list);
				});
			},
			two : function(cb){
				lvBlogModel.count(search,function(err,count){   //查询总记录数
					cb(err,count);
				});
			}
		},function(err,results){
			if(err) throw err;
			page['total'] = results['two'];
			page['pageCount'] = Math.ceil(results['two']/page['limit']);
			res.render("manage",{
				title : ' - '+user.username+' 爱情日志管理',
				 page : page,
				 user : user,
		     bloglist : results['one']
			});
		});
	});
}