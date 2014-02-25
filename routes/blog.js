var lvBlogModel = require("../models/lv-blog")
  , lvReplyModel = require("../models/lv-reply")
  , lvTopstep = require("../models/lv-topstep")
  , userModel = require("../models/user")
  , filter = require("../models/filter")
  , async = require('async')
  , fs = require('fs');

 //limit-每页展示条数  lgth-页码显示个数   pagenum-当前页码   pageCount-总页数  total-总记录数
var page = {limit : 5, lgth : 4, pagenum : 1, pageCount : 0, total : 0}; 

module.exports = function(app){

	/* 爱情魔力-查看推荐的前10条记录 */
	app.get("/lovemagic",function(req,res){
		var sortvalue = ["-pvnum","-yesnum","-nonum","-replynum","pvnum","yesnum","nonum","replynum"];
		var query = lvBlogModel.find({"visibility":true}).sort(sortvalue[0]).limit(10);
		query.exec(function(err,results){   //分页查询博客列表
			if(err) throw err;
			res.render('lovemagic',{
				title : '爱情魔力',
				 user : req.session.user,
			 bloglist : results
			});
		});
	});

    /* 访问用户首页（分页查询日志列表） */
	app.get("/s/:username([a-zA-Z0-9_]+)",function(req, res){
		var _username = req.params.username;
		if(req.session.user	!= null && req.session.user.username == _username){
			return res.redirect("/u/home");
		}
		var search = {'username' : _username};
		page['pagenum'] = req.query.p ? parseInt(req.query.p) : 1;    //设置页码
        
        //异步控制流
		async.series({
		    one : function(cb){
				userModel.findOne(search,function(err,user){  //查询用户是否存在
					if(!err && user==null){
						err = new Error("notfound");
					}
					cb(err,user);
				});
			},
			two : function(cb){
				var skipfrom = page['pagenum'] * page['limit'] - page['limit'];   //计算查询起始值
				var query = lvBlogModel.find({'username' : _username,"visibility":true}).sort("-posttime").skip(skipfrom).limit(page['limit']);  //只显示不隐私的博客
				//query.select("");    //可设置查询的列
				query.exec(function(err,list){   //分页查询博客列表
					cb(err,list);
				});
			},
			three : function(cb){
				lvBlogModel.count(search,function(err,count){   //查询总记录数
					cb(err,count);
				});
			},
			four : function(cb){
				userModel.findOne(search,"username nickname moodsign",function(err,result){    //查询个性签名和昵称
					cb(err,result);
				});
			}
		},
		function(err, results){
			if(err && err.message == 'notfound'){
				res.render("common/404");
			}else if(err){
				throw err;
			}else{
				page['total'] = results['three'];
				page['pageCount'] = Math.ceil(results['three']/page['limit']);
				res.render("userhome",{
					   title : _username + "的主页",
					bloglist : results['two'],
					    user : req.session.user,
					userinfo : results['four'],
					    page : page					
				});
			}
		});
	});
	
	//发表个性签名
	app.post("/moodsign/publish", filter.checkLogin, function(req,res){
		var user = req.session.user,
			  gx = req.param("gx");
		userModel.update({_id:user._id},{$set:{'moodsign':gx}},function(err){
			if(err){
				return res.json({success:false,msg:err});
			}else{
				user['moodsign'] = gx;
				req.session.user = user;
				return res.json({success:true,msg:'发表成功!'});
			}
		});

	});

   	app.get("/b/post", filter.checkLogin, function(req,res){
   		res.render("lovepost",{
   			title : "发表爱情日志",
   			 user : req.session.user,
   			error : req.flash("error").toString()
   		});
   	});
    //发表博客
	app.post("/b/post", filter.checkLogin, function(req,res){
		var title = req.body['title'],
	  postcontent = req.body['postcontent'],
	   visibility = req.body['visibility'],
	   	    ishow = req.body['ishow'],
	     posttime = new Date(),
	         user = req.session.user;

	   var newBlog = new lvBlogModel({
		   	 user_id : user._id,
		   	username : user.username,
		   	   title : title,
		   	posttime : posttime,
		 postcontent : postcontent,
		  visibility : visibility
		});

	    if(ishow){  //上传照片
	    	var imgfile = req.files.fimg;
	   		if(imgfile.size <=0){
	   			fs.unlink(imgfile.path,function(err){
	   				req.flash("error",'你上传的图片太小。');
	    			return res.redirect("/b/post");
	   			});
	   		}else if(imgfile.type.indexOf('image') == -1){  //不是图片
	   			fs.unlink(imgfile.path,function(err){
	   				req.flash("error",'你上传的图片格式不正确。');
	    			return res.redirect("/b/post");
	   			});
	   		}else{  //有图片上传
	   			var imgtype = imgfile.name.split('.')[1].toLowerCase(),
	   			date = new Date(),
	   			  //图片名名称
	   		    newimgname = date.getFullYear()+''+(date.getMonth() + 1)+''+date.getDate()+''+date.getHours()+(date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())+''+date.getMilliseconds()+'.'+imgtype,
	   		    target_imgpath = './public/upload/user/'+newimgname,    //图片保存路径
	   		    target_fallimgpath = './public/upload/user/fall_'+newimgname;  //瀑布流图片地址
   		    	fs.rename(imgfile.path,target_imgpath,function(err){  //移动图片
	   		    	if(err) throw err;
	   		    	newBlog['imgdesc'] = req.body['imgdesc'];
   					newBlog['imgurl'] = '/upload/user/'+newimgname;
   				   //newBlog['imgfallurl'] = '/upload/user/fall_'+newimgname;
   					newBlog.save(function(error){
				   	   if(error) throw error;
				   	   res.redirect("/u/home");
				   });
	   		    });
   		    	/**  切割图片
   		    	imageMagick.resize(400,400,"!").autoOrient().write(target_imgpath,function(err){
   		    		if(err) throw err;
   		    		newBlog['imgdesc'] = req.body['imgdesc'];
   					newBlog['imgurl'] = '/upload/user/'+newimgname;
   					newBlog['imgfallurl'] = '/upload/user/fall_'+newimgname;
   		    	});
	   		   **/
	   		}
	    }else{
	    	newBlog.save(function(error){
	    	  if(error) throw error;
		   	  res.redirect("/u/home");
		   });
	    }
	});
	//修改日志
	app.post('/b/:bid([0-9A-Za-z]+)/upt', filter.checkLogin, function(req,res){
		var bid = req.params.bid,
			title = req.body['title'],
		  postcontent = req.body['postcontent'],
		   visibility = req.body['visibility']==undefined ? 1 : req.body['visibility'],
		   	    ishow = req.body['ishow'],
		     	date = new Date(),
		         user = req.session.user;
	    if(ishow==1){  //上传照片
	    	var imgfile = req.files.fimg;
	    	if(imgfile==undefined){
	    		var imgdesc = req.body['imgdesc'];
	    		lvBlogModel.update({_id:bid},{$set:{title:title,postcontent:postcontent,visibility:visibility,imgdesc:imgdesc}},function(error){
			   	   if(error) throw error;
			   	   return res.redirect("/u/home");
			   });
	    	}else if(imgfile.size <= 0){
	   			fs.unlink(imgfile.path,function(err){
	   				req.flash("error",'你上传的图片太小。');
	    			return res.redirect("/b/post");
	   			});
	   		}else if(imgfile.type.indexOf('image') == -1){  //不是图片
	   			fs.unlink(imgfile.path,function(err){
	   				req.flash("error",'你上传的图片格式不正确。');
	    			return res.redirect("/b/post");
	   			});
	   		}else{  //有图片上传
	   			var imgtype = imgfile.name.split('.')[1].toLowerCase(),
	   			  //图片名名称
	   		    newimgname = date.getFullYear()+''+(date.getMonth() + 1)+''+date.getDate()+''+date.getHours()+(date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())+''+date.getMilliseconds()+'.'+imgtype,
	   		    target_imgpath = './public/upload/user/'+newimgname,    //图片保存路径
	   		    target_fallimgpath = './public/upload/user/fall_'+newimgname;  //瀑布流图片地址
   		    	fs.rename(imgfile.path,target_imgpath,function(err){  //移动图片
	   		    	if(err) throw err;
	   		    	var imgdesc = req.body['imgdesc'],
   						imgurl = '/upload/user/'+newimgname;
   				   //newBlog['imgfallurl'] = '/upload/user/fall_'+newimgname;
   					lvBlogModel.update({_id:bid},{$set:{title:title,postcontent:postcontent,visibility:visibility,imgurl:imgurl,imgdesc:imgdesc}},function(error){
				   	   if(error) throw error;
				   	   res.redirect("/u/home");
				   });
	   		    });
	   		}
	    }else{
	    	lvBlogModel.update({_id:bid},{$set:{title:title,postcontent:postcontent,visibility:visibility,imgdesc:'',imgurl:''}},function(error){
	    	  if(error) throw error;
		   	  res.redirect("/u/home");
		   });
	    }
	});
	//查看日志详情[对外]
	app.get('/b/:bid([0-9A-Za-z]+)', function(req,res){
		var bid = req.params.bid
		  ,username = '';
		if(bid.length!=24) return res.render("common/404");
		//异步控制流【更新浏览量】
		async.series({
			one : function(cb){
				lvBlogModel.findByIdAndUpdate(bid,{$inc:{pvnum:1}},function(err,blog){
					if(!err && blog==null){
						err = new Error('notfound');
					}else{
						username = blog.username;
					}
					cb(err,blog);
				});
			},
			two : function(cb){
				lvReplyModel.find({'blog_id':bid},function(err,replylist){
					cb(err,replylist);
				});
			},
			three : function(cb){
				userModel.findOne({'username' : username},"username nickname moodsign",function(err,user){    //查询个性签名和昵称
					cb(err,user);
				});
			}
		},function(err,results){
			if(err && err.message == 'notfound'){
				res.render("common/404");
			}else if(err){
				throw err;
			}else if(req.session.user!=null && req.session.user.username==results['three'].username){
				res.redirect("/home/"+bid.toString());
			}else{
				res.render('talovedetail',{
					   title : ' - ' + results['one'].title,
					    user : req.session.user,
					userinfo : results['three'],
					    blog : results['one'],
				   replylist : results['two']
				});
			}
		});
	});
	//对博客进行删除、修改、关闭、公开操作
	app.get("/admin/:symbol(del|upt|close|open)/:bid([0-9A-Za-z]+)",filter.checkLogin,function(req,res){
		var symbol = req.params.symbol,
			   bid = req.params.bid,
		 condtions = {'_id':bid};
		switch(symbol){
			case 'del':{
				lvBlogModel.remove(condtions,function(err){
					if(err) throw err;
					return lvReplyModel.remove({'blog_id':bid},function(err){
						if(err) console.log(err);
						res.redirect('/u/admin');
					});
				});
				break;
			}
			case 'upt':{
				lvBlogModel.findOne(condtions,function(err,blog){
					if(err) throw err;
					return res.render('loveupt',{
					   title : blog.title + " - 修改",
						user : req.session.user,
						blog : blog,
					   error : req.flash('error').toString()
					})
				});
				break;
			}
			case 'open':{
				lvBlogModel.update(condtions,{$set:{'visibility':true}},function(err){
					if(err) throw err;
					return res.redirect('/u/admin');
				});
				break;
			}
			case 'close':{
				lvBlogModel.update(condtions,{$set:{'visibility':false}},function(err){
					if(err) throw err;
					return res.redirect('/u/admin');
				});
				break;
			}
		}
	});
	//对日志踩一下或顶一下
	app.post("/b/:symbol(yes|no)/:bid([0-9A-Za-z]+)",filter.checkLogin,function(req,res){
		var symbol = req.params.symbol,
			   bid = req.params.bid,
			  user = req.session.user,
			  _date = new Date();
		if(user==null){
			return res.json({'success':false,'msg':'请先登录！'});
		}else{
			lvTopstep.count({'blog_id':bid,'user_id':user._id},function(err,count){
				if(err) throw err;
				if(count <= 0){
					var upt_yes_no_num = symbol=='yes' ? {'yesnum':1} : {'nonum':1};
					new lvTopstep({
						blog_id : bid,
						user_id : user._id,
						topstep : symbol=='yes',
						opeatetime : _date
					}).save(function(err){
						if(err) throw err;
						lvBlogModel.findByIdAndUpdate(bid,{$inc:upt_yes_no_num},function(err,blog){
							if(err){
								return res.json({'success':false,'msg':err.message});
							}else{
								return res.json({'success':true,'msg':'','yesnum':blog.yesnum,'nonum':blog.nonum});
							}
						});
					});
				}else{
					return res.json({'success':false,'msg':'你已经对该博客做过评估，谢谢！'});
				}
			});	
		}
	});
	//与我相关
	app.get("/admin/reckme",filter.checkLogin,function(req,res){
		var user = req.session.user,
			_date = new Date(),
			blogMap = {};
		lvBlogModel.find({'user_id':user._id}).select('_id title').exec(function(err,results){
			var ids = results.map(function(m){
				blogMap[m._id] = m.title;   //把blog_id和title存储在对象中
			    return m._id;
			});
			logout_date = user.logout_date==null?_date:user.logout_date;
			lvReplyModel.find({'replytime':{$gte:logout_date,$lte:_date},'blog_id':{$in:ids}}).exec(function(err,replylist){
				var resultMap = {},result = [];
				for(var i=0;i<replylist.length;i++){                //以blog_id为key值，replylist为value值，存储在对象中
					if(resultMap[replylist[i].blog_id] == undefined){
						var list = [];
						list.push(replylist[i]);
						resultMap[bid] = list;
					}else{
						resultMap[bid].push(replylist[i]);
					}
				}
				for(var key in resultMap){          //把相关信息存储到数组
					result.push({'title':blogMap[key],'blog_id':key,'relpylist':resultMap[key]});
				}
				return res.render("reckme",{
					title : ' - 与我有关',
					user : user,
					list : result
				});
			});
		});
	});
}