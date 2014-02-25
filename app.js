/**
 * Module dependencies.
 */
var express = require('express')
  , index = require('./routes/index')
  , blog = require('./routes/blog')
  , relpy = require('./routes/reply')
  , userinfo = require('./routes/userinfo')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , moment = require('moment')
  , flash = require('connect-flash');

var app = express();
var accesslog = fs.createWriteStream('logs/lovepanel_access.log', {flags: 'a'});
var errorlog = fs.createWriteStream('logs/lovepanel_error.log', {flags: 'a'});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(flash());
  app.use(express.favicon(__dirname + "/public/images/favicon.ico"));

  app.use(express.bodyParser({ keepExtensions: true, uploadDir : './public/upload/tmp', limit:10000000}));   //10M-limit
  app.use(express.methodOverride());
  
  /* add session support*/
  app.use(express.cookieParser());
  app.use(express.session({secret : "lovepanel"}));  //30分钟过期,cookie:{maxAge:1000 * 60 * 30}
  
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(express.logger('dev'));
  app.use(express.logger({stream : accesslog}));   //记录日志到日志文件[正式环境]
  
  app.use(app.router);
  index(app); 
  blog(app);
  relpy(app);
  userinfo(app);

  /* setting 404 page view */
  app.get("*",function(req, res){
    res.render("common/404");
  });

});

//添加页面处理函数
app.locals.ellipsis = function(str, len) {
    return str.substring(0,len);
}
app.locals.dateformat = function(date, formatReg){
    return moment(date).format(formatReg);
}

//只用于开发环境
if("development" == app.get("env")){
  app.use(express.errorHandler());
}
//只用于成产环境
if("production" == app.get("env")){
   // 添加log日志文件记录形式[记录错误信息] --- 记录完错误信息跳转到500错误页面 
  app.use(function(err,req,res,next){
    var meta = req.ip + ' - - [' + new Date() + '] "' + req.url + '" \n';
    errorlog.write(meta + err.stack + '\n');
    res.render("common/500");
  });
}

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});