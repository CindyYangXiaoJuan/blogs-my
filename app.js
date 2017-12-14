const express = require('express');
const artTemplate = require("express-art-template");
const path = require("path");
const config = require("./config");
const router = require('./router');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

//开放静态资源
app.use("/public", express.static(path.join(__dirname, './public')));
app.use("/node_modules", express.static(path.join(__dirname, './node_modules')));

//配置使用body-parser
app.use(bodyParser.urlencoded({  extended: false }));
app.use(bodyParser.json());
app.use(session({
  // 配置加密字符串，它会在原有加密基础之上和这个字符串拼起来去加密
  // 目的是为了增加安全性，防止客户端恶意伪造
  secret: 'itcast',
  resave: false,
  saveUninitialized: true // 无论你是否使用 Session ，我都默认直接给你分配一把钥匙
}));

app.use(router);

//配置使用art-template 模板引擎
app.engine('html', artTemplate);

app.listen(config.port, () => {
  console.log('app is running at port ${config.port}.');
  console.log('Please visit http://127.0.0.1:${config.port}');
})