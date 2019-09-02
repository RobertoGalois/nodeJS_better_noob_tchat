const express = require('express');
const socketIO = require('socket.io');
const entities = new (require('html-entities').AllHtmlEntities)();
const bodyParser = require('body-parser');
const sharedSession = require('express-socket.io-session');
const session = require('express-session');

const app = express();
const server = app.listen(8080);
const io = socketIO.listen(server);

var gl_messages = [];	//saves all 30 last sent messages
var gl_newUserId = 0;	//the id to give to the next new user logged in

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
		&& (checkPseudo(req.body.pseudo) === true)) {
			req.session.pseudo = req.body.pseudo.trim();
			req.session.userId = gl_newUserId;
			gl_newUserId++;
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
/* emit: (ss is for "Server Sends")
** ----
** - ssPseudo: send the user's pseudo and id to the client once treated by the server
** - ssNewMessage: broadcast the new message to all clients
** - ssNewUserNotif: broadcast the notification that a user is now connected, with his pseudo.
** - ssLeftUserNotif: broadcast the notification that a user is now disconnected, with his pseudo
** - ssLastMessages: give to the client the 30 last messages saved in variable gl_messages
**
** recieve: (cs is for "Client Sends")
** -------
** - csUserMessage: recieve the message the user typed in
** - csNewUserNotif: recieve the information that the user entered in the tchat and the server might broadcast the information
** - csGimmeLastMessages: the client wants the 30 last messages
** - disconnect: when the websocket is disconnected
*/
io.sockets.on('connection', function (socket) {
	socket.emit('ssUserPseudo', { pseudo: secureString(socket.handshake.session.pseudo), userId: secureId(socket.handshake.session.userId) });

	/*
	** csUserMessage:
	*/
	socket.on('csUserMessage', function (datas) {
		let securePseudo = secureString(socket.handshake.session.pseudo);
		let secureMsg = secureString(datas.message.substring(0, 79).trim());
		let secureUserId = secureId(socket.handshake.session.userId);

		console.log(securePseudo + '(' + secureUserId + ') SENDS ')
		console.log(datas);

		if ((checkPseudo(securePseudo)) && (checkMessage(secureMsg))) {
			io.emit('ssNewMessage', { pseudo: securePseudo, message: secureMsg, userId: secureUserId });

			updateGlMessages({
				type: 'message',
				pseudo: securePseudo,
				userId: secureUserId,
				message: secureMsg,
				timestamp: Date.now()
			});

			console.log('==============');
		}
	});

	/*
	** csNewUserNotif:
	*/
	socket.on('csNewUserNotif', function (datas) {
		let securePseudo = secureString(socket.handshake.session.pseudo);

		if (checkPseudo(securePseudo) === true) {
			console.log('--> Nouvel User: [' + securePseudo + '](' + secureId(socket.handshake.session.userId) + ')');
			if (checkLastTchatInOut(socket.handshake.session.lastTchatIn, 10000) === true) {
				io.emit('ssNewUserNotif', { pseudo: securePseudo });
			}

			socket.handshake.session.lastTchatIn = Date.now();
			socket.handshake.session.save();
		}
	});

	/*
	** disconnect:
	*/
	socket.on('disconnect', function (datas) {
		let securePseudo = secureString(socket.handshake.session.pseudo);

		if (checkPseudo(securePseudo)) {
			console.log('Deconnection de ' + securePseudo);
			if (checkLastTchatInOut(socket.handshake.session.lastTchatOut, 10000) === true) {
				io.emit('ssLeftUserNotif', { pseudo: securePseudo });
			}

			socket.handshake.session.lastTchatOut = Date.now();
			socket.handshake.session.save();
		}
	});

	/*
	** csGimmeLastMessages:
	*/
	socket.on('csGimmeLastMessages', function () {
		socket.emit('ssLastMessages', { messages: gl_messages } );
	});
});


/*******************/
/**** FUNCTIONS ****/
/*******************/

/*
** checkSession(): check if session.pseudo is defined and if its value is coherent
*/
function checkSession(req) {
	if (typeof (req.session.pseudo) !== typeof('pouet')) {
		return false;
	}

	return true;
}

/*
** checkPseudo(): check if the string passed in arg is a valid pseudo String
*/
function checkPseudo(inputPseudo) {
	if ((typeof (inputPseudo) === typeof ('pouet'))
		&& (inputPseudo.trim() !== '')
		&& (inputPseudo.length <= 30)) {
		return true;
	}

	return false;
}

/*
** checkMessage(): check if the String passed in arg is a valid message String
*/
function checkMessage(inputMessage) {
	if ((typeof (inputMessage) === typeof ('pouet'))
		&& (inputMessage.trim() !== '')
		&& (inputMessage.length <= 80)) {
		return true;
	}

	return false;
}

/*
** secureString(): secure the string to avoid xss, buffer overflows and other kind of things
*/
function secureString(str) {
	return (entities.encode(str).trim());
}

/*
** secureId(): to be sure that the id is coherent
*/
function secureId(pId) {
	if (typeof (pId) === typeof (42)
		&& (pId >= 0)) {
		return pId;
	}

	return -1;
}

/*
** checkLastTchatInOut(): check if the timestamp pTime is older than the NOW timestamp for more than pTimeInterval
*/
function checkLastTchatInOut(pTime, pTimeInterval) {
	let nowTime = Date.now();

	if ((typeof (pTime) === 'undefined')
		|| ((typeof (pTime) === typeof (nowTime))
			&& ((nowTime - pTime) > pTimeInterval))) {
		return true;
	}

	return false;
}

/*
** updateGlMessages(): push_front the new message in gl_messages[30]
*/
function updateGlMessages(pushedMessage) {
	gl_messages.unshift(pushedMessage);
	gl_messages = gl_messages.slice(0, 30);
}
