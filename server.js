// var express = require('express')
// var app = express()

// //port definition
// app.set('port', process.env.PORT || 5000)

// app.use(express.static('webapp'))

// //server starting
// var server = app.listen(app.get('port'), function () {
//   var port = server.address().port
//   console.log('Express server listening on port %s', port)
// })

const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

const port = process.env.PORT || 3000

server.use(middlewares)
server.use(router)
server.listen(port, () => {
  console.log('JSON Server is running')
})
