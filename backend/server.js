require("dotenv").config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');  // ← AGREGAR ESTA LÍNEA
const routes = require('./routes');


const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);

/* ===== CONFIGURACIÓN DEL POOL MYSQL ===== */
  const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

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

console.log('Conectado a Railway MySQL');

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
      const [result] = await connection.execute(
        'INSERT INTO reservas (nombre, email, fecha, hora, servicio) VALUES (?, ?, ?, ?, ?)',
        [nombre, email, fecha, hora, servicio]
      );
      console.log('Reserva guardada:', { nombre, email, fecha, hora, servicio });
      res.json({ mensaje: 'Reserva realizada exitosamente' });
    } finally {
      connection.release();
    }
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
