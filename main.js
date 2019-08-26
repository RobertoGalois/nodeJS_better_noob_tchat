const express = require('express');
const socketIO = require('socket.io');
const entities = new (require('html-entities').AllHtmlEntities)();
const bodyParser = require('body-parser');
const sharedSession = require('express-socket.io-session');
const session = require('express-session');

const app = express();
const server = app.listen(8080);
const io = socketIO.listen(server);
/*
** to access to req.session throught socket
*/
const sessionMiddleware = session({
	secret: 'bretelle d\'emmerdes',
	resave: true,
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

io.use(sharedSession(sessionMiddleware, {
	autoSave: true
}));

/*
io.of('/namespace').use(sharedSession(session, {
    autoSave: true
}));
*/

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
	socket.emit('sentPseudo', { pseudo: secureString(socket.handshake.session.pseudo) });

	socket.on('sendMessage', function (datas) {
		console.log(secureString(socket.handshake.session.pseudo) + ' SENDS ')
		console.log(datas);
		if ((checkPseudo(socket.handshake.session.pseudo)) && (checkMessage(datas.message))) {
			io.emit('newMessage', { pseudo: secureString(socket.handshake.session.pseudo), message: entities.encode(datas.message.substring(0, 79)).trim() });
		}
	});

	socket.on('newUser', function (datas) {
		let securePseudo = secureString(socket.handshake.session.pseudo);

		if (checkPseudo(securePseudo)) {
			console.log('--> Nouvel User: [' + securePseudo + ']');
			if (checkLastTchatInOut(socket.handshake.session.lastTchatIn, 10000) === true) {
				io.emit('newUser', { pseudo: securePseudo });
			}

			socket.handshake.session.lastTchatIn = Date.now();
			socket.handshake.session.save();
		}
	});

	socket.on('disconnect', function (datas) {
		let securePseudo = secureString(socket.handshake.session.pseudo);

		if (checkPseudo(securePseudo)) {
			console.log('Deconnection de ' + securePseudo);
			if (checkLastTchatInOut(socket.handshake.session.lastTchatOut, 10000) === true) {
				io.emit('leftUser', { pseudo: securePseudo });
			}

			socket.handshake.session.lastTchatOut = Date.now();
			socket.handshake.session.save();
		}
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
	if ((typeof (inputPseudo) === typeof ('pouet'))
		&& (inputPseudo.trim() !== '')) {
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

function checkLastTchatInOut(pTime, pTimeInterval) {
	let nowTime = Date.now();

	/*
	** if pTime is undefined,
	** or if it is a timestamp and is older than 10 seconds from now
	*/
	if ((typeof (pTime) === 'undefined')
		|| ((typeof (pTime) === typeof (nowTime))
			&& ((nowTime - pTime) > pTimeInterval))) {
		return true;
	}

	return false;
}

