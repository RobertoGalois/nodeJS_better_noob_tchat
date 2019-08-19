const express = require('express');
const socketIO = require('socket.io');
const entities = new (require('html-entities').AllHtmlEntities)();
const session = require('express-session');
const sharedSession = require('express-socket.io-session');

const app = express();
const server = app.listen(8080);
const io = socketIO.listen(server);


/**********/
/** USES **/
/**********/
app.set('view engine', 'ejs');
app.use(express.static('public'));
/*app.use(session({
	secret: 'passphrase_secret',
	resave: false,
	saveUninitialized: true,
	cookie: { 
		path: '/',
		httpOnly: 'true',
		saveUninitialized: true,
		sameSite: true,
		secure: false,			//because I use http #noob
		maxAge: 15552000000		//6 months
	}
}));

io.use(sharedSession(session));
*/
/**************************/
/**** ROUTE management ****/
/**************************/

/*****/
/* / */
/*****/
app.get('/', (req, res) => {
	res.status(200).setHeader('Content-Type', 'text/html');
	res.render('index.ejs');
})
/***********/
/* /jq.js  */
/***********/
.get('/jq.js', (req, res) => {
	res.status(200).setHeader('Content-Type', 'application/javascript');
	res.render('jq.ejs');
})
/**************/
/* ELSE route */
/**************/
.use((req, res) => {
	res.status(301).redirect('/');
})



/***************************/
/**** SOCKET management ****/
/***************************/
io.sockets.on('connection', function (socket) {
	socket.on('sendMessage', function (datas) {
		console.log(datas);
		if ((checkPseudo(datas.pseudo)) && (checkMessage(datas.message))) {
			io.emit('newMessage', { pseudo: entities.encode(datas.pseudo.substring(0, 29).trim()), message: entities.encode(datas.message.substring(0, 79)).trim() });
		}
	});

	socket.on('newUser', function (datas) {
		securePseudo = entities.encode(datas.pseudo.substring(0, 29)).trim(); 
		console.log('--> Nouvel User: [' + datas.pseudo + ']');
		io.emit('newUser', { pseudo: securePseudo });
		//socket.handshake.session.pseudo = securePseudo;
	});
});


/*******************/
/**** FUNCTIONS ****/
/*******************/
function checkSession(req) {
	if ((typeof (req.session.pseudo) === 'undefined')
		|| !(req.session.pseudo instanceof String)) {
		
	}
}

function checkPseudo(inputPseudo) {
	if (inputPseudo.trim() !== '') {
		return true;
	}

	return false;
}

function checkMessage(inputMessage) {
	if (inputMessage.trim() !== '') {
		return true;
	}

	return false;
}
