const { Pool } = require('pg');

const connection = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Requerido por Render para conexiones seguras
});

// Verificar la conexión con Render
connection.connect(err => {
  if (err) {
    console.log('Error conexión PostgreSQL en Render:', err);
  } else {
    console.log('Conectado exitosamente a la base de datos de Render');
  }
});

module.exports = connection;

