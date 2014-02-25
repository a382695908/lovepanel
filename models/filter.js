/**
 * 登录过滤器
 **/
var filter = {

	checkLogin : function(req, res ,next){
		if(!req.session.user){
			req.flash("error","你还没有登录，请先登录。");
			return res.redirect("/login");
		}
		next();
	},
	checkNotLogin : function(req, res ,next){
		if(req.session.user){
			return res.redirect("/");
		}
		next();
	}
}

module.exports = filter;