const express = require("express");
const validator = require("validator");
const db = require("./db-helper");
const md5 = require('md5');
const marked = require('marked');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index.html', {
    user: req.session.user
  });
});
router.get('/login', (req, res) => {
  res.render('login.html');
});
router.get('/register', (req, res) => {
  res.render('register.html');
});
router.post('/register', (req, res) => {
  const body = req.body;
  //验证客户端数据
  //    基本的数据验证 使用一个第三方包：validator 辅助验证
  //    基本的业务验证
  //    邮箱是否重复
  //    昵称是否重复
  if (!body.email || validator.isEmpty(body.email) || !validator.isEmail(body.email)) {
    return res.json({
      code: 400,
      message: 'email validator'
    });
  }
  if (!body.nickname || validator.isEmpty(body.nickname)) {
    return res.json({
      code: 400,
      message: 'nickname validator'
    });
  }
  if (!body.password || validator.isEmpty(body.password)) {
    return res.json({
      code: 400,
      message: 'password validator'
    });
  }

  //存储到数据库
  db.query('SELECT * FROM users WHERE email=?', [body.email], function (err, data) {
    if (err) {
      return console.log('操作失败')
    }
    // 有表示被已存在
    if (data[0]) {
      return res.json({
        code: 1,
        message: 'email already exists'
      })
    }

    // 验证昵称是否被占用
    db.query('SELECT * FROM users WHERE nickname=?', [body.nickname], function (err, data) {
      if (err) {
        return console.log('操作失败')
      }
      // 有表示被已存在
      if (data[0]) {
        return res.json({
          code: 2,
          message: 'nickname already exists'
        })
      }

      // 业务数据校验通过，创建用户
      db.query('INSERT INTO users SET ?', {
        email: body.email,
        password: md5(md5(body.password)),
        nickname: body.nickname,
        avatar: 'avatar-max-img.png',
        createdAt: new Date,
        updatedAt: new Date
      }, function (err, data) {
        if (err) {
          return res.json({
            code: 500,
            message: `Server Error: ${err.message}`
          })
        }

        // 登陆成功之前，在 Session 中存储用户的登陆状态
        db.query('SELECT * FROM `users` WHERE id=?', [data.insertId], function (err, ret) {
          if (err) {
            return res, json({
              code: 500,
              message: 'Server Error: ${{err.message}}'
            });
          }
          req.session.user = ret[0];
          // console.log(req.session.user);
          res.json({
            code: 0,
            message: 'ok'
          })
        })
      })
    })
  })
});

router.get('/logout', (req, res) => {
  delete req.session.user;  //清除用户登录状态
  res.redirect('/login'); //跳转到登录页
});

//接受数据登录 先验证用户名是否正确
router.post('/login', (req, res) => {
  //接受表单数据
  //验证
  const body = req.body;
  //编写生气了语句
  const sqlStr = 'SELECT * FROM `users` WHERE `email` =? AND `password` =?';
  //连接数据库
  db.query(sqlStr, [body.email, md5(md5(body.password))], function (err, ret) {
    if (err) {
      return res.json({
        code: 500,
        message: err.message
      });
    }
    //验证用户是否存在
    const user = ret[0]
    if (!user) {
      return res.json({
        code: 404,
        message: 'login falid'
      })
    }
    //验证之后记录登录状态 登录
    req.session.user = user;
    res.json({
      code: 0,
      message: 'success'
    });
  });
});
//发布话题页面
router.get('/topic/new', (req, res) => {
  //访问这个页面,必须是登录状态
  if (!req.session.user) {
    return res.redirect('/login');
  }
  console.log(req.session.user);
  const sqlStr = 'SELECT * FROM `topic_categories`';
  db.query(sqlStr, (err, ret) => {
    if (err) {
      return res.json({
        code: 500,
        err: err.message
      });
    }
    res.render('topic/new.html', {
      topicCategories: ret
    });
  });
});
router.post('/topic/new', (req, res) => {
  //接受数据
  //验证 保存
  //发送
  const body = req.body;
  Object.assign(
    body, {
      userId: req.session.user.id,
      createdAt: new Date,
      updatedAt: new Date
    }
  );
  //sql拼写
  const sqlStr = 'INSERT INTO `topics` SET ?';
  db.query(sqlStr, body, function (err, ret) {
    if (err) {
      return res.json({
        code: 500,
        message: err.message
      });
    }
    // console.log(ret);
    //发布成功
    res.json({
      code: 0,
      message: 'success',
      topicId: ret.insertId  //传入id值 方便后期业务操作
    });
  });
});
//这里的:topicId 表示是动态的id  通过req.params 获取参数  
router.get('/topic/:topicId', (req, res) => {
  const sqlStr = 'SELECT * FROM `topics` WHERE `id` =?';
  db.query(sqlStr, [req.params.topicId], (err, ret) => {
    if (err) {
      return res.json({
        code: 500,
        message: err.message
      });
    }
    const topic = ret[0];
    // console.log(topic);
    if (topic) {
      //转换格式
      topic.content = marked(topic.content);
    }
    //渲染展示页面  存入session
    res.render('topic/show.html', {
      topic,
      user: req.session.user
    });
  });
});
//删除
router.get('/topic/:topicId/delete', (req, res) => {
  const user = req.session.user;
  const topicId = req.params.topicId
  //登录状态下,允许操作
  if (!user) {
    return res.json({
      code: 400,
      message: 'no authorize'
    });
  } 
  db.query('SELECT * from `topics` WHERE `id` =?', [topicId], (err, ret) => {
    if (err) {
      return res.json({
        code: 500,
        message: err.message
      });
    }
    const topic = ret[0];
    //只有当前用户发布的数据,才有删除的权限
    if(topic.userId !== user.id) {
      return res.json({
        code: 400,
        message: 'no authorize'
      });
    }
    //要考虑到业务  如果数据已经删除 要显示已删除
    if (!topic) {
      return res.json({
        code: 404,
        message: 'topic not exits'
      });
    }
    //此时进行删除
    db.query('DELETE FROM `topics` WHERE `id` =?', [req.params.topicId], (err, ret) => {
      if (err) {
        return res.json({
          code: 500,
          message: err.message
        });
      }
      res.redirect('/');
    });
  });
});

router.get('/topic/:topicId/edit', (req, res) => {
  db.query('SELECT * FROM `topic_categories`', (err, categories) => {
    if (err) {
      return res.json({
        code: 500,
        message: err.message
      });
    }
    db.query('SELECT * FROM `topics` WHERE `id` =?', [req.params.topicId], (err, ret) => {
      if (err) {
        return res.json({
          code: 500,
          message: err.message
        });
      }
      res.render('topic/edit.html', {
        user: req.session.user,
        topic: ret[0],
        categories
      });
    });
  });
});
module.exports = router;