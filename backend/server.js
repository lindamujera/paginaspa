require("dotenv").config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);

/* ===== CONFIGURACIÓN DEL POOL MYSQL ===== */
const pool = mysql.createPool(process.env.DATABASE_URL);

// En MySQL los errores se manejan por consulta, pero dejamos el log de confirmación
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
    // CORREGIDO: Sintaxis de MySQL usando signos de interrogación (?) en lugar de $1, $2...
    const sql = 'INSERT INTO reservas (nombre, email, fecha, hora, servicio) VALUES (?, ?, ?, ?, ?)';
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
