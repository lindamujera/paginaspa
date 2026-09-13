require("dotenv").config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

/* ===== CONFIGURACIÓN DEL POOL MYSQL (Conectado usando tu DATABASE_URL de Render) ===== */
// Cambiado para que lea la URL única que configuramos en tu panel de Render
const pool = mysql.createPool(process.env.DATABASE_URL);

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  }
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
    console.error('Database connection had a fatal error.');
  }
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_CLOSE') {
    console.error('Database connection was closed.');
  }
});

console.log('Conectado a la base de datos de Clever Cloud');

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
    const connection = await pool.getConnection();
    try {
      // CORREGIDO: Agregamos especialista y duracion_minutos con valores por defecto 
      // para que Clever Cloud no rechace la consulta por campos faltantes
      const sql = 'INSERT INTO reservas (nombre, email, fecha, hora, servicio, especialista, duracion_minutos) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const [result] = await connection.execute(sql, [nombre, email, fecha, hora, servicio, 'general', 30]);
      
      console.log('Reserva guardada:', { nombre, email, fecha, hora, servicio });
      res.json({ success: true, mensaje: 'Reserva realizada exitosamente' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al insertar reserva:', error);
    res.status(500).json({ success: false, mensaje: 'Error al guardar la reserva' });
  }
});

/* ===== PUERTO ===== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
