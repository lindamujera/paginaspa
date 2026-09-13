const mysql = require('mysql2');

// Crear la conexión usando la URL de Clever Cloud
const connection = mysql.createPool(process.env.DATABASE_URL);

// Verificar la conexión
connection.getConnection((err, conn) => {
  if (err) {
    console.log('Error conexión MySQL en Clever Cloud:', err);
  } else {
    console.log('Conectado exitosamente a la base de datos de Clever Cloud');
    conn.release(); // Libera la conexión de prueba
  }
});

module.exports = connection;

