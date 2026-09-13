const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

module.exports = connection;

connection.connect(err => {

   if (err) {
    console.log('Error conexión MySQL:', err);
  } else {
    console.log('Conectado a Railway MySQL');
  }
});

module.exports = connection;

