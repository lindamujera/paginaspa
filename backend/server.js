require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');  // ← CAMBIADO PARA RENDER POSTGRES
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);

/* ===== CONFIGURACIÓN DEL POOL POSTGRESQL ===== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Requerido por Render para conexiones seguras
});

// Manejo de errores del pool para mantener la estabilidad de tu app
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente del Pool de Render:', err);
});

console.log('Conectado a la base de datos de Render');

/* ===== RUTA GET ===== */
app.get("/", (req, res) => {
  res.json({ mensaje: "Reservas funcionando" });
});

/* ===== USAR ROUTES ===== */
app.use('/api', routes);

/* ===== RUTA POST - RESERVAS ===== */
app.post("/api/reservas", async (req, res) => {
  const { nombre, email, fecha, hora, servicio } = req.body;
  
  if (!nombre || !email || !fecha || !hora || !servicio) {
    return res.status(400).json({ mensaje: "Faltan campos requeridos" });
  }
  
  try {
    // En PostgreSQL con 'pg' usamos directamente pool.query sin necesidad de abrir y cerrar conexiones manualmente
    const sql = 'INSERT INTO reservas (nombre, email, fecha, hora, servicio) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(sql, [nombre, email, fecha, hora, servicio]);
    
    console.log('Reserva guardada:', { nombre, email, fecha, hora, servicio });
    res.json({ mensaje: 'Reserva realizada exitosamente' });
    
  } catch (error) {
    console.error('Error al insertar reserva:', error);
    res.status(500).json({ mensaje: 'Error al guardar la reserva' });
  }
});

/* ===== PUERTO ===== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
