const mysql = require("mysql2");

// Conectamos directamente usando la URL unificada de Clever Cloud que tienes en Render
const connection = mysql.createPool(process.env.DATABASE_URL);

// Verificar la conexión inicial de forma segura
connection.getConnection((err, conn) => {
  if (err) {
    console.log('Error conexión MySQL en Clever Cloud:', err);
  } else {
    console.log('Conectado exitosamente a la base de datos de Clever Cloud');
    conn.release(); // Liberamos la conexión de prueba
  }
});

module.exports = connection;
