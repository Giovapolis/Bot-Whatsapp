var token = sessionStorage.getItem('token')
var socket = null
var pedidos = []
var conectado = false
var qrActual = ''

// Init
async function init() {
  if (!token) { mostrarLogin(); return }
  try {
    var res = await fetch('/api/check-auth', { headers: { 'Authorization': 'Bearer ' + token } })
    if (!res.ok) { sessionStorage.removeItem('token'); mostrarLogin(); return }
  } catch(e) { sessionStorage.removeItem('token'); mostrarLogin(); return }
  mostrarDashboard()
  conectarSocket()
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault()
  var btn = document.getElementById('loginBtn')
  var err = document.getElementById('loginError')
  btn.disabled = true; btn.textContent = 'Ingresando...'
  err.style.display = 'none'
  try {
    var res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: document.getElementById('user').value,
        pass: document.getElementById('pass').value
      })
    })
    var data = await res.json()
    if (!res.ok) {
      err.textContent = 'Credenciales invalidas'
      err.style.display = 'block'
      btn.disabled = false; btn.textContent = 'Ingresar'
      return
    }
    token = data.token
    sessionStorage.setItem('token', token)
    mostrarDashboard()
    conectarSocket()
  } catch(e) {
    err.textContent = 'Error de conexion'
    err.style.display = 'block'
    btn.disabled = false; btn.textContent = 'Ingresar'
  }
})

// Views
function mostrarLogin() {
  document.getElementById('loginView').classList.remove('hidden')
  document.getElementById('dashboardView').classList.add('hidden')
  document.getElementById('user').focus()
  if (socket) { socket.disconnect(); socket = null }
}

function mostrarDashboard() {
  document.getElementById('loginView').classList.add('hidden')
  document.getElementById('dashboardView').classList.remove('hidden')
}

function salir() {
  sessionStorage.removeItem('token')
  if (socket) { socket.disconnect(); socket = null }
  mostrarLogin()
}

// Sidebar mobile
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar')
  var overlay = document.getElementById('sidebarOverlay')
  sidebar.classList.toggle('open')
  overlay.classList.toggle('active')
}

// Navigation
function cambiarSeccion(seccion) {
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active') })
  var target = document.querySelector('.nav-item[data-section="' + seccion + '"]')
  if (target) target.classList.add('active')

  document.getElementById('sectionPedidos').classList.add('hidden')
  document.getElementById('sectionHistorial').classList.add('hidden')
  document.getElementById('sectionQr').classList.add('hidden')

  if (seccion === 'pedidos') {
    document.getElementById('sectionPedidos').classList.remove('hidden')
    document.getElementById('sectionTitle').textContent = 'Pedidos'
    document.getElementById('sectionMeta').textContent = 'Tiempo real'
  } else if (seccion === 'historial') {
    document.getElementById('sectionHistorial').classList.remove('hidden')
    document.getElementById('sectionTitle').textContent = 'Historial'
    document.getElementById('sectionMeta').textContent = pedidos.filter(function(p) { return p.estado === 'entregado' }).length + ' completados'
  } else {
    document.getElementById('sectionQr').classList.remove('hidden')
    document.getElementById('sectionTitle').textContent = 'QR / Conexion'
    document.getElementById('sectionMeta').textContent = conectado ? 'Conectado' : 'Desconectado'
    actualizarQrSection()
    if (socket) socket.emit('solicitar_qr')
  }

  // Close sidebar on mobile
  var sidebar = document.getElementById('sidebar')
  var overlay = document.getElementById('sidebarOverlay')
  sidebar.classList.remove('open')
  overlay.classList.remove('active')
}

// Sesiones WhatsApp
var sesiones = []
var qrRetryTimer = null

function seccionQrVisible() {
  return !document.getElementById('sectionQr').classList.contains('hidden')
}

function actualizarQrSection() {
  renderSesiones()
  actualizarEstadoGlobal()
  if (socket) socket.emit('listar_sesiones')
  var pendiente = sesiones.some(function(s) { return !s.conectado })
  if (pendiente) iniciarReintentoQr()
}

function iniciarReintentoQr() {
  detenerReintentoQr()
  qrRetryTimer = setInterval(function() {
    if (!seccionQrVisible()) { detenerReintentoQr(); return }
    var pendiente = sesiones.some(function(s) { return !s.conectado && !s.qrDataUri })
    if (pendiente && socket) socket.emit('listar_sesiones')
    if (!pendiente) detenerReintentoQr()
  }, 5000)
}

function detenerReintentoQr() {
  if (qrRetryTimer) { clearInterval(qrRetryTimer); qrRetryTimer = null }
}

function renderSesiones() {
  var list = document.getElementById('sessionList')
  var empty = document.getElementById('emptySessions')
  if (!sesiones.length) {
    list.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')
  list.innerHTML = sesiones.map(function(s) {
    var estadoHtml = s.conectado
      ? '<span class="estado-tag conectado">Conectado' + (s.telefono ? ' · ' + e(s.telefono) : '') + '</span>'
      : '<span class="estado-tag pendiente">Esperando escaneo</span>'
    var qrHtml = ''
    if (!s.conectado) {
      if (s.qrDataUri) {
        qrHtml = '<div class="qr-wrapper"><img src="' + s.qrDataUri + '" alt="QR ' + e(s.etiqueta) + '"></div>' +
          '<div class="qr-note">Este codigo vence en segundos y se actualiza solo. Escanealo pronto.</div>'
      } else {
        qrHtml = '<div class="qr-loading">Generando codigo QR...</div>'
      }
    }
    var telHtml = s.telefono ? '<span class="order-phone">' + e(s.telefono) + '</span>' : ''
    return '<div class="session-card" data-id="' + e(s.id) + '">' +
      '<div class="order-info">' +
        '<div class="order-header">' +
          '<span class="order-name">' + e(s.etiqueta) + '</span>' + telHtml + estadoHtml +
        '</div>' +
        qrHtml +
        '<div class="order-footer"><div class="order-actions">' +
          '<button class="btn-attend btn-prep" onclick="solicitarQrSesion(\'' + e(s.id) + '\')">Actualizar QR</button>' +
          (s.conectado ? '<button class="btn-attend" onclick="desvincularSesion(\'' + e(s.id) + '\')">Desvincular</button>' : '') +
          '<button class="btn-attend btn-done" onclick="eliminarSesion(\'' + e(s.id) + '\')">Eliminar</button>' +
        '</div></div>' +
      '</div>' +
    '</div>'
  }).join('')
}

function mostrarSesionError(texto) {
  var el = document.getElementById('sessionError')
  el.textContent = texto
  el.style.display = 'block'
  setTimeout(function() { el.style.display = 'none' }, 5000)
}

function agregarSesion() {
  var etiqueta = window.prompt('Nombre para este numero (ej. Ventas, Soporte):', '')
  if (etiqueta === null) return
  if (socket) socket.emit('crear_sesion', { etiqueta: etiqueta })
}

function solicitarQrSesion(id) {
  if (socket) socket.emit('solicitar_qr', { sessionId: id })
}

function desvincularSesion(id) {
  if (!window.confirm('Desvincular este numero? Se generara un QR nuevo para vincular otro.')) return
  if (socket) socket.emit('desvincular_sesion', { sessionId: id })
}

function eliminarSesion(id) {
  if (!window.confirm('Eliminar este numero del bot?')) return
  if (socket) socket.emit('eliminar_sesion', { sessionId: id })
}

function actualizarEstadoGlobal() {
  var alguno = sesiones.some(function(s) { return s.conectado })
  setStatus(alguno)
  var meta = document.getElementById('sectionMeta')
  if (seccionQrVisible()) {
    var n = sesiones.filter(function(s) { return s.conectado }).length
    meta.textContent = n + ' de ' + sesiones.length + ' conectados'
  }
}

// Socket
function conectarSocket() {
  if (socket) socket.disconnect()
  socket = io({ auth: { token: token } })

  socket.on('connect_error', function() {
    document.getElementById('statusBadge').className = 'status-badge offline'
    document.getElementById('statusText').textContent = 'Error'
  })

  socket.on('sesiones_actuales', function(data) {
    sesiones = Array.isArray(data) ? data : []
    for (var i = 0; i < sesiones.length; i++) {
      if (sesiones[i].qrDataUri) qrActual = sesiones[i].qrDataUri
    }
    renderSesiones()
    actualizarEstadoGlobal()
    if (seccionQrVisible()) {
      var pendiente = sesiones.some(function(s) { return !s.conectado && !s.qrDataUri })
      if (pendiente) iniciarReintentoQr()
    }
  })

  socket.on('qr', function(data) {
    var s = null
    for (var i = 0; i < sesiones.length; i++) {
      if (sesiones[i].id === data.sessionId) s = sesiones[i]
    }
    if (s) {
      s.qrDataUri = data.qrDataUri
      s.qrFecha = data.qrFecha
      s.conectado = false
    } else {
      sesiones.push({ id: data.sessionId, etiqueta: data.sessionId, conectado: false, telefono: null, qrDataUri: data.qrDataUri, qrFecha: data.qrFecha })
    }
    qrActual = data.qrDataUri
    renderSesiones()
    actualizarEstadoGlobal()
  })

  socket.on('conn_ready', function(data) {
    var id = data && data.sessionId ? data.sessionId : null
    for (var i = 0; i < sesiones.length; i++) {
      if (!id || sesiones[i].id === id) {
        sesiones[i].conectado = true
        sesiones[i].qrDataUri = null
        if (data && data.telefono) sesiones[i].telefono = data.telefono
      }
    }
    conectado = true
    renderSesiones()
    actualizarEstadoGlobal()
  })

  socket.on('conn_error', function(data) {
    var id = data && data.sessionId ? data.sessionId : null
    for (var i = 0; i < sesiones.length; i++) {
      if (!id || sesiones[i].id === id) {
        sesiones[i].conectado = false
        if (!data.transitorio) sesiones[i].qrDataUri = null
      }
    }
    renderSesiones()
    actualizarEstadoGlobal()
    if (data && data.error && !data.transitorio) mostrarSesionError(data.error)
  })

  socket.on('sesion_error', function(data) {
    mostrarSesionError(data && data.error ? data.error : 'Error de sesion')
  })

  socket.on('nuevo_pedido', function(pedido) {
    pedidos.unshift(pedido)
    renderizar()
    reproducirSonidoNuevoPedido()
  })

  socket.on('pedidos_actuales', function(data) {
    pedidos = data
    renderizar()
  })

  socket.on('pedido_actualizado', function(pedido) {
    for (var i = 0; i < pedidos.length; i++) {
      if (pedidos[i].id === pedido.id) {
        pedidos[i] = pedido
        break
      }
    }
    renderizar()
  })

  socket.emit('obtener_pedidos')
  socket.emit('listar_sesiones')
}

// Actions
function cambiarEstado(id, nuevoEstado) {
  socket.emit('cambiar_estado', { id: id, estado: nuevoEstado })
}

function abrirMapas(lat, lng) {
  window.open('https://www.google.com/maps?q=' + lat + ',' + lng, '_blank')
}

// Render
function renderizar() {
  var activos = pedidos.filter(function(p) { return p.estado !== 'entregado' })
  var historial = pedidos.filter(function(p) { return p.estado === 'entregado' })

  document.getElementById('orderCount').textContent = activos.length
  document.getElementById('historyCount').textContent = historial.length

  var meta = document.getElementById('sectionMeta')
  if (!document.getElementById('sectionHistorial').classList.contains('hidden')) {
    meta.textContent = historial.length + ' completados'
  }

  renderList('ordersList', 'emptyOrders', activos)
  renderList('historyList', 'emptyHistory', historial)
}

function renderList(listId, emptyId, items) {
  var list = document.getElementById(listId)
  var empty = document.getElementById(emptyId)
  if (items.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')
  list.innerHTML = items.map(function(p) {
    var mapaBtn = ''
    if (p.ubicacion && p.ubicacion.lat && p.ubicacion.lng) {
      var lat = parseFloat(p.ubicacion.lat) || 0
      var lng = parseFloat(p.ubicacion.lng) || 0
      mapaBtn = '<a href="#" class="btn-maps" onclick="abrirMapas(' + lat + ',' + lng + ');return false">Mapa</a>'
    }

    var estadoLabel = p.estado.charAt(0).toUpperCase() + p.estado.slice(1)
    var btnAccion = ''
    var safeId = e(p.id)
    if (p.estado === 'nuevo') {
      btnAccion = '<button class="btn-attend btn-prep" onclick="cambiarEstado(\'' + safeId + "','preparando')\">Preparando</button>"
    } else if (p.estado === 'preparando') {
      btnAccion = '<button class="btn-attend btn-done" onclick="cambiarEstado(\'' + safeId + "','entregado')\">Entregado</button>"
    }

    return '<div class="order-card" data-id="' + p.id + '">' +
      '<div class="accent estado-' + p.estado + '"></div>' +
      '<div class="order-info">' +
        '<div class="order-header">' +
          '<span class="order-name">' + e(p.nombre) + '</span>' +
          '<span class="order-phone">' + e(p.telefono) + '</span>' +
          '<span class="estado-tag ' + p.estado + '">' + estadoLabel + '</span>' +
        '</div>' +
        '<div class="order-message">' + e(p.mensaje) + '</div>' +
        '<div class="order-footer">' +
          '<span class="order-time">' + p.hora + '</span>' +
          '<div class="order-actions">' + mapaBtn + btnAccion + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  }).join('')
}

// Utils
function reproducirSonidoNuevoPedido() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    var ctx = new AudioContext();
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.error('[AUDIO] No se pudo reproducir sonido:', err);
  }
}

function setStatus(online) {
  conectado = online
  var badge = document.getElementById('statusBadge')
  if (badge) {
    badge.className = 'status-badge ' + (online ? 'online' : 'offline')
    document.getElementById('statusText').textContent = online ? 'Conectado' : 'Desconectado'
  }
  var headerBadge = document.getElementById('headerStatusBadge')
  if (headerBadge) {
    headerBadge.className = 'status-badge ' + (online ? 'online' : 'offline')
    document.getElementById('headerStatusText').textContent = online ? 'Conectado' : 'Desconectado'
  }
}

function e(str) {
  var d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

// Overlay click closes sidebar
document.getElementById('sidebarOverlay').addEventListener('click', function() {
  toggleSidebar()
})

// Init
init()
