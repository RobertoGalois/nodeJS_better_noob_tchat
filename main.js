const express = require('express');
const session = require('express-session');
const socketIO = require('socket.io');
const entities = new (require('html-entities').AllHtmlEntities)();
const bodyParser = require('body-parser');

const app = express();
const server = app.listen(8080);
const io = socketIO.listen(server);
/*
** to access to req.session throught socket
*/
const sessionMiddleware = session({
	secret: 'bretelle d\'emmerdes',
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
});

/**********/
/** USES **/
/**********/
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
/*
** to access to req.session throught socket
*/
io.use(function (socket, next) {
	sessionMiddleware(socket.request, socket.request.res, next);
});

/**************************/
/**** ROUTE management ****/
/**************************/

/*****/
/* / */
/*****/
app.get('/', (req, res) => {
	res.status(200).setHeader('Content-Type', 'text/html');

	if (checkSession(req)) {
		res.render('index.ejs');
	} else {
		res.render('login.ejs');
	}
})
/***********/
/* /jq.js  */
/***********/
.get('/jq.js', (req, res) => {
	res.status(200).setHeader('Content-Type', 'application/javascript');
	res.render('jq.ejs');
})
/***********/
/* /login  */
/***********/
.post('/login', (req, res) => {
	if ((!checkSession(req))
		&& (typeof (req.body.pseudo) === typeof ('pouet'))
		&& (req.body.pseudo.trim() !== '')) {
			req.session.pseudo = req.body.pseudo.trim();
	}

	res.status(200).redirect('/');
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
	socket.emit('sentPseudo', { pseudo: secureString(socket.request.session.pseudo) });

	socket.on('sendMessage', function (datas) {
		console.log(datas);
		if ((checkPseudo(socket.request.session.pseudo)) && (checkMessage(datas.message))) {
			io.emit('newMessage', { pseudo: secureString(socket.request.session.pseudo), message: entities.encode(datas.message.substring(0, 79)).trim() });
		}
	});

	socket.on('newUser', function (datas) {
		let securePseudo = entities.encode(socket.request.session.pseudo);

		console.log('--> Nouvel User: [' + socket.request.session.pseudo + ']');
		io.emit('newUser', { pseudo: securePseudo });
		socket.request.session.pseudo = securePseudo;
	});
});


/*******************/
/**** FUNCTIONS ****/
/*******************/
function checkSession(req) {
	if (typeof (req.session.pseudo) !== typeof('pouet')) {
		return false;	
	}
	
	return true;
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

function secureString(str) {
	return (entities.encode(str).trim());
}
