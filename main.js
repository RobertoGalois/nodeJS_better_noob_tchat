const express = require('express');
const socketIO = require('socket.io');
const entities = new (require('html-entities').AllHtmlEntities)();

const app = express();
const server = app.listen(8080);
const io = socketIO.listen(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.status(200).setHeader('Content-Type', 'text/html');
	res.render('index.ejs');
})
.get('/jq.js', (req, res) => {
	res.status(200).setHeader('Content-Type', 'application/javascript');
	res.render('jq.ejs');
})
.use((req, res) => {
	res.status(301).redirect('/');
})

io.sockets.on('connection', function (socket) {
	socket.on('sendMessage', function (datas) {
		console.log(datas);
		if ((datas.pseudo.trim() !== '') && (datas.message.trim() !== '')) {
			io.emit('newMessage', { pseudo: entities.encode(datas.pseudo.substring(0, 29)), message: entities.encode(datas.message.substring(0, 79)) });
		}
	});

	socket.on('newUser', function (datas) {
		console.log('--> Nouvel User: [' + datas.pseudo + ']');
		io.emit('newUser', { pseudo: entities.encode(datas.pseudo.substring(0, 29)) });
	});
});

