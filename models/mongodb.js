/**
 设置mongoose的通用入口
**/
var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:/lovepanel");

/* 导出mongoose */
module.exports = mongoose;