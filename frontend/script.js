// =====================================
// DURACIONES POR SERVICIO
// =====================================
const duracionesServicio = {
 'Masajes relajantes': '35 min',
 'Masajes reductores': '45 min',
 'Masajes postoperatorios': '35 min',
 'Limpieza facial': '1 hora',
 'Tratamientos faciales': '1:30 horas',
 'Dermapen y plasma': '1 hora',
 'Sueroterapia': '45 min',
 'Tratamientos capilares intradérmico': '30 min',
 'Depilación con cera': '40 min',
 'Uñas Tradicionales': '1 hora',
 'Uñas Semi': '2 horas',
 'Uñas Artificiales Acrílico,Poligel,en gel': '3:40 horas'
};

// =====================================
// MOSTRAR DURACIÓN AL SELECCIONAR SERVICIO
// =====================================
document.getElementById('servicio').addEventListener('change', function() {
 const servicio = this.value;
 const duracion = duracionesServicio[servicio];
 
 if (duracion) {
 let duracionDiv = document.getElementById('duracion-info');
 if (!duracionDiv) {
 duracionDiv = document.createElement('div');
 duracionDiv.id = 'duracion-info';
 duracionDiv.style.color = '#666';
 duracionDiv.style.fontSize = '14px';
 duracionDiv.style.marginTop = '5px';
 this.parentElement.appendChild(duracionDiv);
 }
 duracionDiv.textContent = `Duración: ${duracion}`;
 } else {
 const duracionDiv = document.getElementById('duracion-info');
 if (duracionDiv) duracionDiv.remove();
 }
});

// =====================================
// CARGAR HORARIOS DISPONIBLES AL SELECCIONAR FECHA
// =====================================
document.getElementById('fecha').addEventListener('change', async function() {
 const fecha = this.value;
 const servicio = document.getElementById('servicio').value;

 if (!fecha || servicio === 'servicios') {
 alert('Selecciona fecha y servicio primero');
 return;
 }

 try {
 const response = await fetch(`${window.BACKEND_URL}/api/horarios-disponibles`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ fecha, servicio })
 });

 const data = await response.json();

 if (data.success) {
 // Mostrar horarios disponibles
 let horariosDiv = document.getElementById('horarios-disponibles');
 if (!horariosDiv) {
 horariosDiv = document.createElement('div');
 horariosDiv.id = 'horarios-disponibles';
 horariosDiv.style.marginTop = '10px';
 horariosDiv.style.padding = '10px';
 horariosDiv.style.backgroundColor = '#f0f0f0';
 horariosDiv.style.borderRadius = '5px';
 document.getElementById('hora').parentElement.appendChild(horariosDiv);
 }

 horariosDiv.innerHTML = `
 <p style="margin: 0 0 10px 0; font-weight: bold;">Horarios disponibles:</p>
 <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
 ${data.horariosLibres.map(h => `
 <button type="button" style="padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="seleccionarHora('${h}')">
 ${h}
 </button>
 `).join('')}
 </div>
 `;
 } else {
 alert(data.mensaje);
 }
 } catch (error) {
 console.error('Error:', error);
 alert('Error al cargar horarios');
 }
});

// =====================================
// SELECCIONAR HORA
// =====================================
function seleccionarHora(hora) {
 document.getElementById('hora').value = hora;
}

// =====================================
// RESERVAR (CÓDIGO CORREGIDO Y LIMPIO)
// =====================================
function reservar() {
 const nombre = document.getElementById('nombre').value;
 const email = document.getElementById('email').value;
 const fecha = document.getElementById('fecha').value;
 const hora = document.getElementById('hora').value;
 const servicio = document.getElementById('servicio').value;

 if (!nombre || !email || !fecha || !hora || servicio === 'servicios') {
 alert('Completa todos los campos');
 return;
 }

 // VALIDACIÓN CORREGIDA: Se restauró fetch, method y headers correctamente
 fetch(`${window.BACKEND_URL}/api/horarios-disponibles`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ fecha, servicio })
 })
 .then(res => res.json())
 .then(data => {
   if (!data.success) {
     alert(data.mensaje);
     return;
   }

   // Verificar si la hora seleccionada está disponible
   if (!data.horariosLibres.includes(hora)) {
     // Mostrar horarios disponibles
     let horariosDiv = document.getElementById('horarios-disponibles');
     if (!horariosDiv) {
       horariosDiv = document.createElement('div');
       horariosDiv.id = 'horarios-disponibles';
       horariosDiv.style.marginTop = '10px';
       horariosDiv.style.padding = '10px';
       horariosDiv.style.backgroundColor = '#fff3cd';
       horariosDiv.style.borderRadius = '5px';
       horariosDiv.style.border = '2px solid #ffc107';
       document.getElementById('hora').parentElement.appendChild(horariosDiv);
     }

     horariosDiv.innerHTML = `
       <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">⚠️ Esta hora no está disponible. Selecciona otra:</p>
       <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
         ${data.horariosLibres.map(h => `
           <button type="button" style="padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;" onclick="seleccionarHora('${h}')">
             ${h}
           </button>
         `).join('')}
       </div>
     `;
     return;
   }

   // Si la hora está disponible, guardar reserva
   const data_reserva = { nombre, email, fecha, hora, servicio };

   fetch(`${window.BACKEND_URL}/api/reservar`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data_reserva)
   })
   .then(res => res.json())
   .then(result => {
     if (result.success) {
       alert('¡Reserva confirmada!');
       document.getElementById('nombre').value = '';
       document.getElementById('email').value = '';
       document.getElementById('fecha').value = '';
       document.getElementById('hora').value = '';
       document.getElementById('servicio').value = 'servicios';
       const horariosDiv = document.getElementById('horarios-disponibles');
       if (horariosDiv) horariosDiv.remove();
     } else {
       alert(result.mensaje);
     }
   })
   .catch(error => {
     console.error(error);
     alert('Error al reservar');
   });
 })
 .catch(error => {
   console.error('Error:', error);
   alert('Error al validar disponibilidad');
 });
}
// =============================
// CHATBOT SPA PROFESIONAL
// =============================

function abrirChat() {

  const body = document.getElementById("chatBody");

  if (body.style.display === "none") {
    body.style.display = "block";
  } else {
    body.style.display = "none";
  }

}

// =============================
// ENVIAR MENSAJE
// =============================

function enviarMensaje() {

  const input = document.getElementById("mensajeUsuario");

  const mensaje = input.value.trim();

  if (mensaje === "") return;

  agregarMensajeUsuario(mensaje);

  responderBot(mensaje);

  input.value = "";

}

// =============================
// MENSAJE USUARIO
// =============================

function agregarMensajeUsuario(texto) {

  const chatBody = document.getElementById("chatBody");

  const div = document.createElement("div");

  div.classList.add("mensaje", "usuario");

  div.textContent = texto;

  chatBody.appendChild(div);

  chatBody.scrollTop = chatBody.scrollHeight;

}

// =============================
// MENSAJE BOT
// =============================

function agregarMensajeBot(texto) {

  const chatBody = document.getElementById("chatBody");

  const div = document.createElement("div");

  div.classList.add("mensaje", "bot");

  div.innerHTML = texto;

  chatBody.appendChild(div);

  chatBody.scrollTop = chatBody.scrollHeight;

}

// =============================
// RESPUESTAS
// =============================

function responderBot(mensaje) {

  const texto = mensaje.toLowerCase();

  // =============================
  // SALUDO
  // =============================

  if (
    texto.includes("hola") ||
    texto.includes("buenas") ||
    texto.includes("hello") ||
    texto.includes("buenos dias")
  ) {

    agregarMensajeBot(`
      Hola 👋 Bienvenida al Centro de Belleza y Estética 💖<br><br>

      Gracias por escribirnos.<br>
      Nuestro equipo estará encantado de ayudarte ✨<br><br>

      🌸 Selecciona la opción que necesitas:<br><br>

      1️⃣ Servicios<br>
      2️⃣ Promociones<br>
      3️⃣ Horarios de atención<br>
      4️⃣ Agendar cita<br>
      5️⃣ Ubicación<br>
      6️⃣ WhatsApp<br>
      7️⃣ Precios
    `);

  }

  // =============================
  // SERVICIOS
  // =============================

  else if (
    texto === "1" ||
    texto.includes("servicios")
  ) {

    agregarMensajeBot(`
      💆 Nuestros servicios disponibles:<br><br>

      ✔ Masajes relajantes<br><br>
      ✔ Masajes reductores<br><br>
      ✔ Masajes post operatorios<br><br>
      ✔ Limpieza facial<br><br>
      ✔ Tratamientos faciales<br><br>
      ✔ Dermapen y plasma<br><br>
      ✔ Sueroterapia<br><br>>
      ✔ Tratamientos capilares intradérmico<br><br>
      ✔ depilacion con cera<br><br>
      ✔ Uñas Tradicionales<br><br>
      ✔ Uñas Semi<br><br>
      ✔ uñas Artificiales Acrílico,Poligel,en gel<br><br>
      
      ✨ ¿Deseas reservar alguno?
    `);

  }
// =============================
// RESPUESTA SI
// =============================

else if (
  texto === "si" ||
  texto === "sí"
) {

  agregarMensajeBot(`
    📅 Excelente 💖<br><br>

    Puedes realizar tu reserva directamente desde la sección:<br><br>

    ✨ "Hacer Reserva"<br><br>

    Allí podrás elegir:<br>
    ✔ Servicio<br>
    ✔ Fecha<br>
    ✔ Hora<br><br>

    😊 Será un placer atenderte.
  `);

}

// =============================
// RESPUESTA NO
// =============================

else if (
  texto === "no"
) {

  agregarMensajeBot(`
    💖 Gracias por comunicarte con nosotros.<br><br>

    😊 ¿En qué más puedo ayudarte?<br><br>

    1️⃣ Servicios<br>
    2️⃣ Promociones<br>
    3️⃣ Horarios<br>
    4️⃣ Ubicación<br>
    5️⃣ WhatsApp
  `);

}
  // =============================
  // PROMOCIONES
  // =============================

  else if (
    texto === "2" ||
    texto.includes("promociones")
  ) {

    agregarMensajeBot(`
      🎁 PROMOCIONES, Belleza y Estética 💖<br><br>

      ✨ 20% descuento en masajes<br>
      ✨ Facial + masaje combo especial<br>
      ✨ Promoción para parejas<br><br>

      📲 Agenda hoy mismo.
    `);

  }

  // =============================
  // HORARIOS
  // =============================

  else if (
    texto === "3" ||
    texto.includes("horario")
  ) {

    agregarMensajeBot(`
      🕒 HORARIOS DE ATENCIÓN<br><br>

      Lunes a sábado<br>
      ⏰ Lunes a Viernes
        9:00 a.m. – 5:00 p.m.
        Sábados
        9:00 a.m. – 5:00 p.m.

      Domingo cerrado 💖
    `);

  }

  // =============================
  // AGENDAR
  // =============================

  else if (
    texto === "4" ||
    texto.includes("agendar") ||
    texto.includes("cita") ||
    texto.includes("reservar")
  ) {

    agregarMensajeBot(`
      📅 Puedes agendar tu cita directamente desde el formulario de reservas de esta página
       💖
        Realizar tu reserva directamente desde la sección:<br><br>

    ✨ "Hacer Reserva"<br><br>

    Allí podrás elegir:<br>
    ✔ Servicio<br>
    ✔ Fecha<br>
    ✔ Hora<br><br>

    😊 Será un placer atenderte.
    `);

  }

  // =============================
  // UBICACIÓN
  // =============================

  else if (
    texto === "5" ||
    texto.includes("ubicacion") ||
    texto.includes("direccion")
  ) {

    agregarMensajeBot(`
      📍 Estamos ubicados en el centro de la ciudad.<br><br>

      💖 Será un placer atenderte.
    `);

  }

  // =============================
  // WHATSAPP
  // =============================

  else if (
    texto === "6" ||
    texto.includes("whatsapp") ||
    texto.includes("telefono")
  ) {

    agregarMensajeBot(`
      📲 WhatsApp, centro de Belleza y Estética:<br><br>

      3117740244 💖
    `);

  }

  // =============================
  // PRECIOS
  // =============================

  else if (
    texto === "7" ||
    texto.includes("precio")
  ) {

    agregarMensajeBot(`
      💰 Nuestros precios varían según el servicio.<br><br>

      ✨ Escríbenos al WhatsApp Krasa, Belleza y Estética, qué tratamiento deseas y te ayudamos.
      
    `);

  }

  // =============================
  // DESPEDIDA
  // =============================

  else if (
    texto.includes("gracias") ||
    texto.includes("adios")
  ) {

    agregarMensajeBot(`
      💖 Gracias por visitarnos.<br><br>

      Esperamos atenderte muy pronto ✨
    `);

  }

  // =============================
  // RESPUESTA GENERAL
  // =============================

  else {

    agregarMensajeBot(`
      😊 No entendí tu mensaje.<br><br>

      Por favor escribe:<br><br>

      1️⃣ Servicios<br>
      2️⃣ Promociones<br>
      3️⃣ Horarios<br>
      4️⃣ Agendar cita<br>
      5️⃣ Ubicación<br>
      6️⃣ WhatsApp<br>
      7️⃣ Precios
    `);

  }

}

// =====================================
// CONTADOR - CLIENTES FELICES
// =====================================
document.addEventListener('DOMContentLoaded', function() {
 let porcentaje = 0;
 const contador = document.getElementById("contadorNumero");
 if (contador) {
 const intervalo = setInterval(() => {
 porcentaje++;
 contador.textContent = porcentaje + "%";
 if (porcentaje === 1000) clearInterval(intervalo);
 }, 30);
 }
});

