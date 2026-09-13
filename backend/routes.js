const express = require('express');
const router = express.Router();
const mysql = require('mysql2'); // Cambiado a MySQL para Clever Cloud

// Conexión unificada usando la URL que configuraste en Render
const connection = mysql.createPool(process.env.DATABASE_URL);

// Función de ayuda para mantener tu estructura de callbacks sin cambiar tu lógica
const ejecutarQuery = (sql, valores, callback) => {
 connection.query(sql, valores, (err, res) => {
   if (err) return callback(err, null);
   callback(null, res);
 });
};
// =====================================
// LOGIN ADMIN
// =====================================
router.post('/login', (req, res) => {
 const { usuario, password } = req.body;
 if (usuario === 'bellachica' && password === 'Gato123#') {
 const token = 'admin-token-' + Date.now();
 res.json({ success: true, token });
 } else {
 res.json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
 }
});

// =====================================
// DURACIONES POR SERVICIO (en minutos)
// =====================================
const duracionesServicio = {
 'Masajes relajantes': 35,
 'Masajes reductores': 45,
 'Masajes postoperatorios': 35,
 'Limpieza facial': 60,
 'Tratamientos faciales': 90,
 'Dermapen y plasma': 60,
 'Sueroterapia': 45,
 'Tratamientos capilares intradérmico': 30,
 'Depilación con cera': 40,
 'Uñas Tradicionales': 60,
 'Uñas Semi': 120,
 'Uñas Artificiales Acrílico,Poligel,en gel': 220
};

// =====================================
// ESPECIALISTA POR SERVICIO
// =====================================
const especialistaServicio = {
 'Masajes relajantes': 'general',
 'Masajes reductores': 'general',
 'Masajes postoperatorios': 'general',
 'Limpieza facial': 'general',
 'Tratamientos faciales': 'general',
 'Dermapen y plasma': 'general',
 'Sueroterapia': 'general',
 'Tratamientos capilares intradérmico': 'general',
 'Depilación con cera': 'general',
 'Uñas Tradicionales': 'uñas',
 'Uñas Semi': 'uñas',
 'Uñas Artificiales Acrílico,Poligel,en gel': 'uñas'
};

// =====================================
// VALIDAR DISPONIBILIDAD (SÚPER SEGURA PARA MYSQL)
// =====================================
function validarDisponibilidad(connectionPool, fecha, horaInicio, duracion, especialista, callback) {
  // 1. Calculamos la hora de fin usando Javascript de forma limpia
  const [horas, minutos] = horaInicio.split(':');
  const fechaBase = new Date(2000, 0, 1, parseInt(horas), parseInt(minutos));
  fechaBase.setMinutes(fechaBase.getMinutes() + duracion);
  
  // 2. Nos aseguramos de tener el formato "HH:MM:SS" que le encanta a MySQL
  const horaInicioStr = horaInicio.includes(':') && horaInicio.split(':').length === 2 ? `${horaInicio}:00` : horaInicio;
  const horaFinStr = `${fechaBase.toTimeString().slice(0, 5)}:00`;

  // 3. Consulta SQL directa usando la función TIME() nativa de MySQL
  const sql = `
    SELECT * FROM reservas 
    WHERE fecha = ? 
    AND especialista = ?
    AND (
      (TIME(hora) < TIME(?) AND TIME(ADDTIME(hora, SEC_TO_TIME(duracion_minutos * 60))) > TIME(?))
      OR (TIME(hora) >= TIME(?) AND TIME(hora) < TIME(?))
    )
  `;
  
  connectionPool.query(sql, [fecha, especialista, horaFinStr, horaInicioStr, horaInicioStr, horaFinStr], (err, result) => {
    if (err) {
      console.error("Error detallado en MySQL:", err);
      callback(false, 'Error al validar disponibilidad');
      return;
    }
    // Retorna verdadero si la lista de ocupados está vacía
    callback(result.length === 0, null);
  });
}
// =====================================
// GUARDAR RESERVA (Adaptado a MySQL)
// =====================================
router.post('/reservar', (req, res) => {
 try {
 console.log('Datos recibidos:', req.body);
 const { nombre, email, fecha, hora, servicio } = req.body;
 if (!nombre || !email || !fecha || !hora || !servicio) {
 return res.status(400).json({
 success: false,
 mensaje: 'Todos los campos son obligatorios'
 });
 }
 if (servicio === 'servicios') {
 return res.status(400).json({
 success: false,
 mensaje: 'Selecciona un servicio válido'
 });
 }
 const duracion = duracionesServicio[servicio];
 const especialista = especialistaServicio[servicio];
 if (!duracion || !especialista) {
 return res.status(400).json({
 success: false,
 mensaje: 'Servicio no válido'
 });
 }
 
 // Validar disponibilidad
 validarDisponibilidad(connection, fecha, hora, duracion, especialista, (disponible, error) => {
 if (error) {
 return res.status(500).json({
 success: false,
 mensaje: error
 });
 }
 if (!disponible) {
 return res.status(400).json({
 success: false,
 mensaje: 'Esta hora no está disponible para este servicio',
 disponible: false
 });
 }
 
 // Guardar reserva usando los marcadores (?) tradicionales de MySQL
 const sql = `
 INSERT INTO reservas (nombre, email, fecha, hora, servicio, especialista, duracion_minutos)
 VALUES (?, ?, ?, ?, ?, ?, ?)
 `;
 const valores = [nombre, email, fecha, hora, servicio, especialista, duracion];
 
 connection.query(sql, valores, (err, result) => {
 if (err) {
 console.error('Error Base de Datos:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al guardar la reserva'
 });
 }
 res.status(200).json({
 success: true,
 mensaje: 'Reserva guardada correctamente',
 reservaId: result.insertId // En MySQL se obtiene el ID recién creado usando .insertId
 });
 });
 });
 } catch (error) {
 console.error('Error servidor:', error);
 res.status(500).json({
 success: false,
 mensaje: 'Error interno del servidor'
 });
 }
 });

// =====================================
// OBTENER HORARIOS DISPONIBLES
// =====================================
router.post('/horarios-disponibles', (req, res) => {
 try {
 const { fecha, servicio } = req.body;
 if (!fecha || !servicio) {
 return res.status(400).json({
 success: false,
 mensaje: 'Fecha y servicio requeridos'
 });
 }
 const duracion = duracionesServicio[servicio];
 const especialista = especialistaServicio[servicio];
 if (!duracion || !especialista) {
 return res.status(400).json({
 success: false,
 mensaje: 'Servicio no válido'
 });
 }
 
 // Horarios disponibles: 9:00 a 18:00
 const horariosDisponibles = [];
 for (let h = 9; h < 18; h++) {
 for (let m = 0; m < 60; m += 30) {
 const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
 horariosDisponibles.push(hora);
 }
 }
 
 // Si es Uñas Artificiales, validar límite primero
 if (servicio === 'Uñas Artificiales Acrílico,Poligel,en gel') {
 validarLimiteUnasArtificiales(connection, fecha, (disponible, error) => {
 if (error) {
 return res.status(500).json({
 success: false,
 mensaje: error
 });
 }
 
 // Obtener reservas del día
 const sql = `
 SELECT hora::text, duracion_minutos FROM reservas 
 WHERE fecha = $1 AND especialista = $2
 `;
 connection.query(sql, [fecha, especialista], (err, result) => {
 if (err) {
 console.error('Error Base de Datos:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al obtener horarios'
 });
 }
 
 const reservas = result.rows;
 
 // Filtrar horarios ocupados
 const horariosOcupados = new Set();
 reservas.forEach(r => {
 const [h, m] = r.hora.split(':').map(Number);
 const minutoInicio = h * 60 + m;
 const minutoFin = minutoInicio + r.duracion_minutos;
 for (let min = minutoInicio; min < minutoFin; min += 30) {
 const hora = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
 horariosOcupados.add(hora);
 }
 });
 
 const horariosLibres = horariosDisponibles.filter(h => !horariosOcupados.has(h));
 
 const respuesta = {
 success: true,
 horariosLibres,
 horariosOcupados: Array.from(horariosOcupados)
 };
 
 // Si se alcanzó el límite, agregar advertencia
 if (!disponible) {
 respuesta.advertencia = 'Se alcanzó el límite de 4 citas de Uñas Artificiales para este día. Citas disponibles: ' + horariosLibres.length;
 }
 
 res.status(200).json(respuesta);
 });
 });
 } else {
 // Para otros servicios
 const sql = `
 SELECT hora::text, duracion_minutos FROM reservas 
 WHERE fecha = $1 AND especialista = $2
 `;
 connection.query(sql, [fecha, especialista], (err, result) => {
 if (err) {
 console.error('Error Base de Datos:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al obtener horarios'
 });
 }
 
 const reservas = result.rows;
 
 // Filtrar horarios ocupados
 const horariosOcupados = new Set();
 reservas.forEach(r => {
 const [h, m] = r.hora.split(':').map(Number);
 const minutoInicio = h * 60 + m;
 const minutoFin = minutoInicio + r.duracion_minutos;
 for (let min = minutoInicio; min < minutoFin; min += 30) {
 const hora = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
 horariosOcupados.add(hora);
 }
 });
 
 const horariosLibres = horariosDisponibles.filter(h => !horariosOcupados.has(h));
 
 res.status(200).json({
 success: true,
 horariosLibres,
 horariosOcupados: Array.from(horariosOcupados)
 });
 });
 }
 } catch (error) {
 console.error('Error servidor:', error);
 res.status(500).json({
 success: false,
 mensaje: 'Error interno del servidor'
 });
 }
});
 
// =====================================
// OBTENER TODAS LAS RESERVAS (CON AUTENTICACIÓN)
// =====================================
router.get('/reservas', (req, res) => {
 const token = req.headers.authorization?.split(' ')[1];
 if (!token || !token.startsWith('admin-token-')) {
   return res.status(401).json({ success: false, mensaje: 'No autorizado' });
 }
 
 // En MySQL no hace falta el "::text", simplemente llamamos a la columna "hora"
 const sql = `SELECT id, nombre, email, fecha, hora, servicio, especialista, duracion_minutos FROM reservas ORDER BY fecha DESC, hora ASC`;
 
 connection.query(sql, [], (err, result) => {
   if (err) {
     console.error('Error al obtener reservas:', err);
     return res.status(500).json({ success: false, mensaje: 'Error al obtener reservas' });
   }
   // En MySQL cambiamos result.rows por result directamente
   res.status(200).json({ success: true, reservas: result });
 });
});

module.exports = router;

