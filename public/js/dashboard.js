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

// QR
function actualizarQrSection() {
  var img = document.getElementById('qrLarge')
  var msg = document.getElementById('qrStatusMsg')
  if (conectado) {
    img.style.display = 'none'
    msg.innerHTML = '<span style="color:#34d399;">WhatsApp conectado correctamente</span>'
  } else if (qrActual) {
    img.style.display = 'block'
    img.src = qrActual
    msg.innerHTML = '<span style="color:#8a8a8a;">Esperando escaneo...</span>'
  } else {
    img.style.display = 'none'
    msg.innerHTML = '<span style="color:#8a8a8a;">Generando codigo QR...</span>'
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

  socket.on('qr', function(data) {
    qrActual = data.qrDataUri
    document.getElementById('qrLarge').src = data.qrDataUri
    document.getElementById('qrLarge').style.display = 'block'
    document.getElementById('qrStatusMsg').innerHTML = '<span style="color:#8a8a8a;">Esperando escaneo...</span>'
    setStatus(false)
  })

  socket.on('conn_ready', function() {
    conectado = true
    document.getElementById('qrLarge').style.display = 'none'
    document.getElementById('qrStatusMsg').innerHTML = '<span style="color:#34d399;">WhatsApp conectado correctamente</span>'
    setStatus(true)
  })

  socket.on('conn_error', function(data) {
    conectado = false
    setStatus(false)
    qrActual = ''
    document.getElementById('qrLarge').style.display = 'none'
    var errText = data && data.error ? e(data.error) : 'Error de conexion'
    document.getElementById('qrStatusMsg').innerHTML = '<span style="color:#f87171;">' + errText + '</span>'
  })

  socket.on('nuevo_pedido', function(pedido) {
    pedidos.unshift(pedido)
    renderizar()
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
function setStatus(online) {
  conectado = online
  var badge = document.getElementById('statusBadge')
  badge.className = 'status-badge ' + (online ? 'online' : 'offline')
  document.getElementById('statusText').textContent = online ? 'Conectado' : 'Desconectado'
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
