var lvReplyModel = require("../models/lv-reply")
  , lvBlogModel = require("../models/lv-blog")
  , filter = require("../models/filter");

module.exports=function(app){

	app.post("/r/post", filter.checkLogin, function(req,res){
		var replycontent = req.body['replycontent'],
			     blog_id = req.body['blog_id'],
			        user = req.session.user,
			   replytime = new Date();
		console.log(replycontent);
		new lvReplyModel({
			blog_id : blog_id,
			user_id : user._id,
			 author : user.username,
	   replycontent : replycontent,
	      replytime : replytime
		}).save(function(err, reply, numberAffected){
			if(err) throw err;
			lvBlogModel.update({'_id':blog_id},{$inc:{replynum:1},$push:{reply_id:reply._id}},function(err){
				if(err) throw err;
				return res.redirect('/home/'+blog_id);
			});
		});
	});
	//删除评论
	app.get("/r/del/:rid([0-9A-Za-z]+)",filter.checkLogin, function(req,res){
		var rid = req.params.rid,
		   user = req.session.user;
		lvReplyModel.findByIdAndRemove(rid,function(err,lvreply){
			if(err) throw err;
			lvBlogModel.update({'_id':lvreply.blog_id},{$inc:{replynum:-1},$pull:{reply_id:reply._id}},function(err){
				if(err) throw err;
				return res.redirect('/home/'+lvreply.blog_id.toString());
			});
		});
	});
}