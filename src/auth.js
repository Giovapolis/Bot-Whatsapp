function authMiddleware(req, res, next) {
  const auth = req.headers.authorization

  if (!auth) {
    return res.status(401).set('WWW-Authenticate', 'Basic realm="Dashboard"').end()
  }

  const base64 = auth.split(' ')[1]
  const creds = Buffer.from(base64, 'base64').toString('utf-8')
  const [user, pass] = creds.split(':')

  const expectedUser = process.env.DASHBOARD_USER || 'admin'
  const expectedPass = process.env.DASHBOARD_PASS || 'secreto123'

  if (user === expectedUser && pass === expectedPass) {
    return next()
  }

  res.status(401).set('WWW-Authenticate', 'Basic realm="Dashboard"').end()
}

module.exports = { authMiddleware }
