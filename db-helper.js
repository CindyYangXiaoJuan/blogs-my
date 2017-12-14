const mysql = require("mysql");
const config = require("./config");

exports.query = function () {
  //合并对象 Object.assign()
  const connection = mysql.createConnection(Object.assign(config.db, {}));
  connection.connect();
  //...展开操作符
  connection.query(...arguments);
  connection.end()
}  