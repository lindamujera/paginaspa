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
// LOGIN ADMIN (Seguro)
// =====================================
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  // Comparamos contra las variables de entorno configuradas en el servidor
  if (usuario === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    
    // NOTA: Para producción se recomienda generar un JWT (JSON Web Token) real
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
// VALIDAR DISPONIBILIDAD (PROCESADO EN JAVASCRIPT)
// =====================================
function validarDisponibilidad(connectionPool, fecha, horaInicio, duracion, especialista, callback) {
  // 1. Convertimos la hora de la nueva reserva a minutos totales del día
  const [hInicio, mInicio] = horaInicio.split(':').map(Number);
  const inicioNueva = hInicio * 60 + mInicio;
  const finNueva = inicioNueva + duracion;

  // 2. Traemos las reservas de ese especialista en esa fecha específica
  const sql = `SELECT hora, duracion_minutos FROM reservas WHERE fecha = ? AND especialista = ?`;
  
  connectionPool.query(sql, [fecha, especialista], (err, result) => {
    if (err) {
      console.error("Error al consultar reservas en MySQL:", err);
      callback(false, 'Error al validar disponibilidad');
      return;
    }

    // 3. Revisamos si hay algún choque de horarios usando JavaScript
    for (let i = 0; i < result.length; i++) {
      const reservaExistente = result[i];
      
      // Convertimos la hora de la reserva existente a texto y luego a minutos
      const horaTexto = String(reservaExistente.hora);
      const [hExistente, mExistente] = horaTexto.split(':').map(Number);
      const inicioExistente = hExistente * 60 + mExistente;
      const finExistente = inicioExistente + parseInt(reservaExistente.duracion_minutos);

      // Regla de colisión: Si los rangos se cruzan, no hay disponibilidad
      if ((inicioNueva < finExistente && finNueva > inicioExistente)) {
        callback(false, null); 
        return;
      }
    }

    // Si no hay choques, la hora está libre
    callback(true, null);
  });
}

// =====================================
// GUARDAR RESERVA
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
 // Guardar reserva
 const sql = `
 INSERT INTO reservas (nombre, email, fecha, hora, servicio, especialista, duracion_minutos)
 VALUES (?, ?, ?, ?, ?, ?, ?)
 `;
 const valores = [nombre, email, fecha, hora, servicio, especialista, duracion];
 connection.query(sql, valores, (err, result) => {
 if (err) {
 console.error('Error MySQL:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al guardar la reserva'
 });
 }
 res.status(200).json({
 success: true,
 mensaje: 'Reserva guardada correctamente',
 reservaId: result.insertId
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
// OBTENER HORARIOS DISPONIBLES (CORREGIDO PARA MYSQL)
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
 SELECT hora, duracion_minutos FROM reservas 
 WHERE fecha = ? AND especialista = ?
 `;
 connection.query(sql, [fecha, especialista], (err, reservas) => {
 if (err) {
 console.error('Error MySQL:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al obtener horarios'
 });
 }
 
 // Filtrar horarios ocupados
 const horariosOcupados = new Set();
 reservas.forEach(r => {
 // CORRECCIÓN: Convertir r.hora a String para evitar fallos en MySQL
 const horaTexto = String(r.hora);
 const [h, m] = horaTexto.split(':').map(Number);
 const minutoInicio = h * 60 + m;
 const minutoFin = minutoInicio + parseInt(r.duracion_minutos);
 for (let min = minutoInicio; min < minutoFin; min += 30) {
 const horaFormateada = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
 horariosOcupados.add(horaFormateada);
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
 SELECT hora, duracion_minutos FROM reservas 
 WHERE fecha = ? AND especialista = ?
 `;
 connection.query(sql, [fecha, especialista], (err, reservas) => {
 if (err) {
 console.error('Error MySQL:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al obtener horarios'
 });
 }
 
 // Filtrar horarios ocupados
 const horariosOcupados = new Set();
 reservas.forEach(r => {
 // CORRECCIÓN: Convertir r.hora a String para evitar fallos en MySQL
 const horaTexto = String(r.hora);
 const [h, m] = horaTexto.split(':').map(Number);
 const minutoInicio = h * 60 + m;
 const minutoFin = minutoInicio + parseInt(r.duracion_minutos);
 for (let min = minutoInicio; min < minutoFin; min += 30) {
 const horaFormateada = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
 horariosOcupados.add(horaFormateada);
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
 return res.status(401).json({ success: false, mensaje: 'Token inválido' });
 }
 const sql = `
 SELECT *
 FROM reservas
 ORDER BY id DESC
 `;
 connection.query(sql, (err, result) => {
 if (err) {
   console.error('Error MySQL:', err);
   return res.status(500).json({
     success: false,
     mensaje: 'Error al obtener reservas'
   });
 }
 // CORRECCIÓN DEFINITIVA: Entregamos la lista directa sin envolverla en un objeto
 res.status(200).json(result); 
});
});

// =====================================
// ELIMINAR RESERVA
// =====================================
router.delete('/reservas/:id', (req, res) => {
 try {
 const token = req.headers.authorization?.split(' ')[1];
 if (!token) {
 return res.status(401).json({
 success: false,
 mensaje: 'Token requerido'
 });
 }
 
 if (!token.startsWith('admin-token-')) {
 return res.status(401).json({
 success: false,
 mensaje: 'Token inválido'
 });
 }
 
 const id = req.params.id;
 const sql = 'DELETE FROM reservas WHERE id = ?';
  
 connection.query(sql, [id], (err, result) => {
 if (err) {
 console.error('Error MySQL:', err);
 return res.status(500).json({
 success: false,
 mensaje: 'Error al eliminar reserva'
 });
 }
 
 if (result.affectedRows === 0) {
 return res.status(404).json({
 success: false,
 mensaje: 'Reserva no encontrada'
 });
 }
 
 res.status(200).json({
 success: true,
 mensaje: 'Reserva eliminada correctamente'
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
// VALIDAR LÍMITE UÑAS ARTIFICIALES
// =====================================
function validarLimiteUnasArtificiales(connection, fecha, callback) {
 const sql = `
 SELECT COUNT(*) as total FROM reservas 
 WHERE fecha = ? 
 AND servicio = 'Uñas Artificiales Acrílico,Poligel,en gel'
 `;
 connection.query(sql, [fecha], (err, result) => {
 if (err) {
 callback(false, 'Error al validar límite');
 return;
 }
 const total = result[0].total;
 const disponible = total < 4;
 callback(disponible, null);
 });
}

module.exports = router;
