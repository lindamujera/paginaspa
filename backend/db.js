const mysql = require('mysql2');

// Mantenemos DATABASE_URL porque la dejamos así en Render
const connection = mysql.createPool(process.env.DATABASE_URL);

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
