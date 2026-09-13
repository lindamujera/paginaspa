const mysql = require('mysql2');

// Cambiamos process.env.DATABASE_URL por process.env.MYSQL_ADDON_URI
const connection = mysql.createPool(process.env.MYSQL_ADDON_URI);

// Verificar la conexión
connection.getConnection((err, conn) => {
  if (err) {
    console.log('Error conexión MySQL en Clever Cloud:', err);
  } else {
    console.log('Conectado exitosamente a la base de datos de Clever Cloud');
    conn.release();
  }
});

module.exports = connection;

