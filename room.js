/*
http://www.snookicker.com/apps.html?lobbyLAN=[IP]:[PORT]

PORT by default : 1111

*/
function tryRequire(filePath1, filePath2) {
	try {
		return require(filePath1);
	} catch (error) {
		if (error.code === 'MODULE_NOT_FOUND') {

			//console.warn(`Failed to require "${filePath1}". Trying "${filePath2}" instead.`);
			console.log = function () { };//remove log if cloned files
			return require(filePath2);
		} else {
			throw error; // Re-throw other errors
		}
	}
}

const https = require('https');//for wss
const url = require('url');
const fs = require('fs');
var WebSocket = require("ws").Server;
var system = tryRequire('./system.js', '../system.js');

// Expected arguments from Lobby Manager - process.argv[1] is usually the script name
const port = process.argv[2] || 1111;
var addr = process.argv[3];// || '127.0.0.1';
const secureMode = (process.argv[4] || null) === null ? false : (process.argv[4].toLowerCase() === "true");//bool is passing as string in args
const timeoutIdInterval = process.argv[5] || null;

var parentProcess = false;
var timeoutId = null;//autodestruction

if (secureMode == true)
	process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

if (addr == null) {
	var interfaces = require('os').networkInterfaces();
	addr = '127.0.0.1';
	for (var devName in interfaces) {
		var iface = interfaces[devName];

		for (var i = 0; i < iface.length; i++) {
			var alias = iface[i];
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
				addr = alias.address;
				break;
			}
		}
	}
}


//-----------------------------------------------------HTTPSERVER
var server;
if (secureMode == true) {
	var certPath = './cert.pem';
	var keyPath = './key.pem';

	server = https.createServer({
		cert: fs.readFileSync(certPath, 'utf8').replace(/\\n/gm, "\n"),
		key: fs.readFileSync(keyPath, 'utf8').replace(/\\n/gm, "\n")
	});

	server.listen(port, addr, function () {
		console.log('#game-room start at : ' + addr + ":" + port);
	});
}

//-------------------------------------------------------Process
process.on('message', (message) => {
	if (message) {
		console.log(`#room Received message from parent: ${message}`);
		// Process the message received from the parent
		// (e.g., handle commands, perform actions)
		parentProcess = true;

		//autodestruction si personne se connecte au bout de 45sec
		if (timeoutIdInterval * 0 == 0) {
			console.log("timeoutIdInterval :" + timeoutIdInterval);
			timeoutId = setTimeout(function () {
				process.send('delete');
			}, timeoutIdInterval);
		}

	}
});
//-------------------------------------------------------Websocket
var config = { port: port };
if (secureMode == true) config = { server: server };

//console.log( 'The area of a circle of radius 4 is ' + system.area(4));
var aTimer;
const players = {};
const match = new system.Match();
var i;
//const myIP = system.GetLocalIPAddress(port);

var server = new WebSocket(config);
match.mode = 1;
console.log('#room listening at ' + addr + ":" + port);

server.getUniqueID = function () {
	return system.GetGuid();
};
//OnClientConnected
server.on('connection', function (socket, req) {

	console.log("Request received.");

	//init client ID : req.socket.remoteAddress
	if (socket.id == null) {
		socket.id = system.GetGuid();
		console.log("new player");
		players[socket.id] = new system.Player();
		players[socket.id].clientID = socket.id;//system.GetGuid();
		players[socket.id].key = system.Count(players);
		players[socket.id].socket = socket;
		players[socket.id].name = "guest";
		players[socket.id].ip = req.socket.remoteAddress;
		//players[socket.id].cmd = "joinSelf";
	}
	var clientID = players[socket.id].clientID;

	//init match
	if (system.Count(players) == 1) {
		console.log("init match");
		match.init();
		match.hostClientID = clientID;
		match.clientIDs = {};
		match.cmdClient = {};
	}

	//send to self
	SendMessage(socket, "{'cmd':'joinSelf','clientID':'" + clientID + "','key':'" + players[socket.id].key + "','name':'" + players[socket.id].name + "','delaySocketSend':" + match.intervalDelay * 0.5 + ",'frameOffsetMax':" + match.frameOffsetMax + ",'version':'" + match.version + "'}");

	//send message to other that you just joined
	var jsonString = "";
	var player;
	i = 0;
	for (kvp in players) {
		player = players[kvp];

		if (clientID != player.clientID) {
			SendMessage(player.socket, "{'cmd':'joinFriend','clientID':'" + clientID + "','key':'" + players[socket.id].key + "','name':'" + players[socket.id].name + "'}");
			jsonString += "'" + player.clientID + "':{";
			jsonString += "'key':'" + player.key + "',";
			jsonString += "'name':'" + player.name + "',";
			jsonString += "'team':'" + player.team + "'";
			jsonString += "}";

			i++;
			if (i < system.Count(players) - 1) jsonString += ",";
		}
	}

	//send to yourself the players who already joined before and if they are playing (match time)
	if (jsonString != "") {
		var matchStartTime = match.timeStart;
		if (matchStartTime != 0) {
			matchStartTime = (Date.now() - match.timeStart) * 0.001;//(DateTime.UtcNow.Ticks - match.timeStart)/ TimeSpan.TicksPerMillisecond;
		}
		SendMessage(socket, "{'cmd':'joinAlready'," + jsonString + ",'matchStartTime':" + matchStartTime + "}");
	}

	//OnMessageReceived
	socket.on('message', function (message) {
		const data = JSON.parse(message);

		//client ID
		var clientID = players[socket.id].clientID;

		var cmd = data.cmd;

		/*
		var values = Object.values(players);
		var player;
		for(i=0;i<values.length;i++){
			player = values[i];
			player.socket.send(JSON.stringify(data));

		}
		*/
		if (cmd == "teamSelect") {

			if (match.cmd == "matchStart") {
				console.log("teamSelect req is cancelled because matchStart is called by host!");
				return;
			}

			players[socket.id].clientID = clientID;
			if (players[socket.id].name == "guest" && data.name != null) {//replace it once
				players[socket.id].name = data.name;
			}
			if (data.team != null)
				players[socket.id].team = data.team;
			if (data.msg != null)
				players[socket.id].msg = data.msg;
			if (data.input != null)
				players[socket.id].input = data.input;
		} else if (cmd == "matchStart") {
			players[socket.id].msg = "null";

			if (match.frameMax == -1) {
				//console.log("match.frameMax reset !");
			}
			//if(data.team != null)
			//    players[socket.id].team = data.team;
			match.frameMax = 50 * (5 * 60);//100;//50*(5*60)//data.frameMax;//
		} else if (cmd == "playing") {
			if (match.cmd == "matchEnd" || match.cmd == null) {
				console.log("client cmd is playing, but match cmd is matchEnd");
				return;
			}
			//console.log(clientID + ": " + cmd);
			if (data.input != null) players[socket.id].input = data.input;
			if (data.msg != "" && data.msg != null) players[socket.id].msg = data.msg;

			if (data.frameCli != null) players[socket.id].frameCli = data.frameCli;
		} else if (cmd == "matchEnd") {
			console.log(clientID + ": " + cmd);

		}


		if (data.pingOffsetClient == null) data.pingOffsetClient = 0;
		players[socket.id].pingOffsetClient = data.pingOffsetClient;// ? TODO
		players[socket.id].ping = Math.round((Date.now() - players[socket.id].pingOld) - players[socket.id].pingOffsetClient);//(DateTime.UtcNow.Ticks - players[socket.id].pingOld)/ TimeSpan.TicksPerMillisecond - players[socket.id].pingOffsetClient;
		if (players[socket.id].pingOld != 0) players[socket.id].pingEnabled = true;
		//long pingOld = DateTime.UtcNow.Ticks;

		//send data to clients
		//SendDataToClients(cmd);


		//Command is called only when everyone do same request 
		players[socket.id].cmd = cmd;
		if (cmd == "playing" && match.cmdClient.hasOwnProperty(clientID) == false) {
			match.cmdClient[clientID] = true;
		}
		if (cmd == "matchStart" && match.timeStart == 0) {//&& match.timeStart == 0
			if (match.cmdClient.hasOwnProperty(clientID) == false) {
				match.cmdClient[clientID] = true;
				console.log("add client matchStart: " + clientID);
			}

			if (system.Count(match.cmdClient) == system.Count(match.clientIDs)) {
				match.cmdClient = {};
				match.timeStart = Date.now();//DateTime.UtcNow.Ticks;
				console.log("timeStart matchStart is set! match.frame: " + match.frame);
			} else return;
		}


		//stop setInterval when end match
		if (match.frame >= match.frameMax && match.frameMax > 0) {
			//aTimer.AutoReset = false;
			//aTimer.Enabled = false;
			console.log("stop setInterval when end match #2 match.frame: " + match.frame);
			return;
		}

		//the command depends host player
		if (clientID == match.hostClientID)
			match.cmd = cmd;


		//get players who are playing now
		if (cmd == "teamSelect" /*|| cmd == "matchStart"*/) {
			if (match.clientIDs.hasOwnProperty(clientID) == false) {//.includes 
				match.clientIDs[clientID] = true;
				console.log("[add]" + clientID + "==");// + match.clientIDs.Count);
			}

			if (match.cmd == cmd && data.teamValidation != null) {
				match.teamValidation = data.teamValidation;
			}
		}

		//only host can retry
		if (match.cmd == "retry") {
			console.log("reset and retry new Match!");
			reset();//reset and clean all data
			SendDataToClients();
			return;
		}

		if (aTimer != null) {
			var time = ((Date.now() - match.timeIntervalStart) * 0.001);//((DateTime.Now - match.timeIntervalStart).TotalMilliseconds);
			players[socket.id].frameOffset = Math.round((time / aTimer.Interval) * match.frameOffsetMax);
			if (players[socket.id].frameOffset > match.frameOffsetMax) players[socket.id].frameOffset = match.frameOffsetMax;
			//Console.WriteLine( clientID + " " +  players[socket.id].frameOffset + " -> " + time + "/" + aTimer.Interval);
		}
		if (aTimer == null) {
			match.timeIntervalStart = Date.now();//DateTime.Now;
			doInterval();//setInterval();
			console.log("aTimer is launched");
			//pending is finished, server can treat new message from client
			//if(e.GetClient().GetIsWaitingForPong() == true){
			//	e.GetClient().SetIsWaitingForPong(false);
			//Console.WriteLine("SetIsWaitingForPong false(method aTimer=NULL)");
			//}

			//autodestruction annule
			if (timeoutId != null) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		}

	});

	//OnClientDisconnected
	socket.on('close', function (error) {
		console.log('player ' + players[socket.id].clientID + ' disconnected : ' + error);


		var clientID = players[socket.id].clientID;
		//e.GetClient().SetIsWaitingForPong(false);//let messageCallback send "EOpcodeType.ClosedConnection" to server

		//remove element from dictionary
		if (players.hasOwnProperty(socket.id)) { // check key before removing it
			delete players[socket.id];
		}

		//tell to others players that someone left with "quit" command
		var jsonString = "{'cmd':'quit','clientID':'" + clientID + "'}";
		for (kvp in players) {

			SendMessage(players[kvp].socket, jsonString);
		}


		//if(match.cmd == "teamSelect" || cmd == "matchStart" || cmd == "matchStart"){
		if (match.clientIDs.hasOwnProperty(clientID) == true) {
			delete match.clientIDs[clientID];
		}
		match.cmdClient = {};

		//console.log("match.cmdClient.Count : " +  match.cmdClient.Count);

		// hard reset and close players
		if (Object.keys(players).length == 0) {//if(match.clientIDs.Count == 0){
			//match.frame = 0; ??
			reset();//reset and clean all data
			if (parentProcess == true) process.send('delete');
		}

	});

	/*
	aTimer = setInterval(function() {
		var i = 0;
	}, 1000);
	*/
});

server.on('sessionError', function (error, session) {
	console.error('QUIC session error:', error.message);
});
server.on('error', function (error) {
	console.error('QUIC socket error:', error.message);
});
server.on('close', function (error) {
	console.error('QUIC socket on close');
	//clients.delete(ws);
});
server.on('enpointClose', function (endPoint, error) {
	console.error('QUIC enpoint on close' + error.message);
	console.error(endPoint);
});




function SendMessage(socket, message, isUDP = false) {
	socket.send(message);
}

function SendDataToClients() {
	if (match.cmd == null) return;
	var cmd;

	//end match and stop setInterval timer
	if ((match.frame >= match.frameMax && match.frameMax > 0) || 0 == system.Count(match.clientIDs)) {
		console.log("end match command is set(stop setInterval when end match)");
		match.cmd = "matchEnd";
		aTimer.AutoReset = false;
		aTimer.Enabled = false;
	}
	cmd = match.cmd;

	var pingOld = Date.now();//DateTime.UtcNow.Ticks;
	var jsonString;


	var sync = 0;
	jsonString = getJsonData(cmd);
	var player;
	for (kvp in players) {
		player = players[kvp];
		player.pingOld = pingOld;
		//server.SendMessage(e.GetClient(),  jsonString);

		//if player cmd is teamselect/matchstart/playing, can send
		//other such as "join" , should be skip
		if (match.clientIDs.hasOwnProperty(player.clientID) == false && cmd != "matchEnd") continue;


		if (cmd != "playing" || player.frameCli == -1)//VPS style
			SendMessage(player.socket, jsonString);


		//check sync
		//if(player.frameCli >= 0){
		//	if((match.frame-match.frameMinCli*2)<= player.frameCli && player.frameCli <= (match.frame+3+match.mode)) sync++;
		//}


		//VPS Style
		if (player.frameCli >= 0) {
			if ((match.frame - match.frameMinCli * 2) <= player.frameCli && player.frameCli <= (match.frame + 3 + match.mode)) sync++;
			//else if(player.frameCli == 0 && match.frame == match.frameOffsetMax)  sync++;
		}
		//if(player.frameCli >= 0){
		//    if((match.frame-match.frameMinCli) <= player.frameCli && player.frameCli <= match.frame) sync++;
		//    else if(player.frameCli == 0 && match.frame == match.frameOffsetMax)  sync++;
		//}



		//pending is finished, server can treat new message from client
		//if(kvp.socket.GetIsWaitingForPong() == true){
		//	kvp.socket.SetIsWaitingForPong(false);
		//}
	}



	//reset
	//if command received == players in the match ( others joins after need wait)
	if (system.Count(match.cmdClient) == system.Count(match.clientIDs)/*players.Count()*/ && cmd == "playing") {
		//console.log("[next frame]" + match.cmdClient.Count + "==" + match.clientIDs.Count);
		if (sync == system.Count(match.clientIDs)) {

			//VPS Style
			for (kvp in players) {
				player = players[kvp];
				player.pingOld = pingOld;
				SendMessage(player.socket, jsonString);//TODO jstring a faire dans la condition !
			}
			//console.log(match.frame " : [ " + (match.frame-match.frameMinCli*2) + "< X <=" + (match.frame+3+match.mode) + " ]");

			match.frame += match.frameOffsetMax;
			match.cmdClient = {};//.Clear();

			//reset chrono
			match.timeIntervalStart = Date.now();//DateTime.Now;
		}
	} else if (cmd == "matchEnd") {
		console.log("reset and retry new Match!");
		reset();//reset and clean all data

		//TODO si joueur ferme l onglet du jeu tout en etant sur une autre page (no page focus)
		//if(Object.keys(players).length == 0)
		//	if(parentProcess == true) process.send('delete');

	}
}



function getJsonData(cmd) {
	var jsonString = "{";
	jsonString += "'cmd':'" + cmd + "',";
	if (cmd == "playing") {
		if (match.frame == 0) jsonString += "'frame':" + (match.frame) + ",";
		//else jsonString += "'frame':"+(match.frame+1)+",";///VPS Style
		else jsonString += "'frame':" + (match.frame + 3 + match.mode) + ",";
	}
	if (cmd == "teamSelect") jsonString += "'teamValidation':" + match.teamValidation + ",";
	var player;
	var i = 0;
	for (kvp in players) {
		player = players[kvp];


		jsonString += "'" + player.clientID + "':{";


		if (match.clientIDs.hasOwnProperty(player.clientID) == false) {
			//if player cmd is teamselect/matchstart/playing, can send
			//other such as "join" , should be skip/empty
			//console.log(player.clientID + "is not in the match");
		} else if (cmd == "teamSelect") {
			//jsonString += "'clientID':'"+player.clientID+"',";

			jsonString += "'key':'" + player.key + "',";
			jsonString += "'name':'" + player.name + "',";
			jsonString += "'input':'" + player.input + "',";
			jsonString += "'team':'" + player.team + "',";
			jsonString += "'msg':" + player.msg;//pas de guillement car donnees JSON

			//reset msg to save bandwidth
			//player.msg = "null";
		} else if (cmd == "matchStart") {
			//jsonString += "'clientID':'"+player.clientID+"',";
			jsonString += "'key':'" + player.key + "',";
			jsonString += "'name':'" + player.name + "',";
			jsonString += "'team':'" + player.team + "'";
		} else if (cmd == "playing") {
			jsonString += "'frameOffset':'" + player.frameOffset + "',";
			jsonString += "'input':'" + player.input + "',";
			jsonString += "'msg':" + player.msg;//pas de guillement car donnees JSON

			//reset msg to save bandwidth
			//player.msg = "";

			//check sync
			//player.frameCurr == match.frame
		} else if (cmd == "matchEnd") {
			jsonString += "'score':'" + "0" + "'";
		} else if (cmd == "retry") {
			player.team = null;
			jsonString += "'team':'" + "" + "'";
		} else {
			//if player cmd is teamselect/matchstart/playing, can send
			//other such as "join" , should be skip
			/*
			if(match.clientIDs.hasOwnProperty(player.Value.clientID) == false){
			jsonString += "'key':'"+ player.key+"',";
			//continue;
			}
			*/
		}

		if (match.clientIDs.hasOwnProperty(player.clientID) == true)
			if (player.pingEnabled)
				jsonString += ",'ping':'" + player.ping + "'";

		jsonString += "}";

		i++;
		if (i < system.Count(players)) jsonString += ",";

	}

	jsonString += "}";
	return jsonString;
}

function reset() {
	match.cmd = null;
	match.end = false;
	match.teamA = 0;
	match.teamB = 0;
	match.frame = Math.floor(match.intervalDelay * 50 + 0.05); // = 8 frames
	match.frameMax = -1;
	match.frameOffsetMax = 5;
	match.cmdClient = {};
	match.clientIDs = {};
	match.timeStart = 0;
	match.teamValidation = 0;

	for (kvp in players) {
		players[kvp].frameCli = -1;
	}

	// Destroying timer.
	clearInterval(aTimer.func);//aTimer.Dispose();
	aTimer = null;
}

function doInterval() {
	var Interval = match.intervalDelay * 1000;
	aTimer = { "Interval": Interval, "func": null };
	aTimer.func = setInterval(function () {
		//var i = 0;
		SendDataToClients();
	}, Interval);
}