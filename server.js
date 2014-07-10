/*

Erhält der Server einen Befehl von einem Client, so leitet er diesen über eine Updatexxxx Methode an die betreffenden Clients weiter

*/
var port = 5000;
var express = require('express')
,   app = express()
,   server = require('http').createServer(app)
,   io = require('socket.io').listen(server),
	mysql = require('mysql'),
	nodemailer = require('nodemailer');
var transport = nodemailer.createTransport("SMTP", {
        //service: 'Gmail', // use well known service.
                            // If you are using @gmail.com address, then you don't
                            // even have to define the service name
        auth: {
            user: "tuttas68@gmail.com",
            pass: "iozfhoraxqujlnri"
        }
    });
	
var message = {

    // sender info
    from: 'Tuttas <tuttas68@gmail.com>',

    // Comma separated list of recipients
    to: '"Receiver Name" <jtuttas@gmx.net>',

    // Subject of the message
    subject: 'Ihre Benutzerdaten für den Gameserver', //

    // plaintext body
    text: 'Hello to myself!',

    // HTML body
    html:'<p><b>Hello</b> to myself <img src="cid:note@node"/></p>'+
         '<p>Here\'s a nyan cat for you as an embedded attachment:<br/><img src="cid:nyan@node"/></p>',

};
/*
console.log('Sending Mail');
transport.sendMail(message, function(error){
    if(error){
        console.log('Error occured');
        console.log(error.message);
        return;
    }
    console.log('Message sent successfully!');

    // if you don't want to use this transport object anymore, uncomment following line
    //transport.close(); // close the connection pool
});
*/
var connection = mysql.createConnection({
  host : '192.168.178.29',
  port : 3306,
  database: 'gameserver',
  user : 'tuttas',
  password : 'joerg123'
});

console.log("Listening on port " + port);
connection.connect(function(err){
	if(err != null) {
		console.log('Error connecting to mysql:' + err+'\n');
	}
	else {
		console.log('connected to MYSQL Server');
	}
});
server.listen(port);



app.configure(function(){
	// statische Dateien ausliefern
	app.use(express.static(__dirname + '/public'));
});



// gamenames and usernames which are currently connected to the system
var games = {
		"users":{
			"name":"noname",
			ingame:"freeplayer", // css Klasse des Spielers (zeigt an ob sich der Spieler in einem Spiel gefindet)
			score:0
		}
	};
// Objekt mit allen Client-Sockets des Servers
var clients = {};
// Objekt mit Spielernamen die sich in einer Spielpaarung befinden
var paarungen = {};
// Objekt mit Spielernamen die sich in einer Spielpaarunganfrage befinden
var paaringrequests = {
	player: "mo",
	type: "no"
};


io.sockets.on('connection', function (socket) {

/* Benutzerdaten zusenden
		var msg={
			email:email
		}
	*/
	socket.on('resendlogin', function (data) {
		connection.query("SELECT * from User where email='"+data.email+"'", function(err, rows){
			// There was a error or not?
			if(err != null) {
				console.log("Query error:" + err);
			} 
			else {			
				if (rows[0]==undefined) {
					msg= {
						success:false,
						message:"Kann eMail adresse '"+data.email+"' nicht finden!"
					}
					// Shows the result on console window
					console.log("Kann eMail adresse '"+data.email+"' nicht finden!");
					socket.emit('updateresendlogin',msg);
				}
				else {
					message.to='"Gameserver User" <'+data.email+'>';
					message.test="Hallo,\nIhre Benutzerdaten für den Gameserver lauten\n\nBenutzername: "+rows[0].name+"\nKennwort: "+rows[0].kennwort+"\n\nMit freundlichen Grüßen\n\nJörg Tuttas";
					message.html="<p>Hallo,</p><p>Ihre Benutzerdaten für den Gameserver lauten</p></br><b>Benutzername:</b> "+rows[0].name+"</br><b>Kennwort: </b>"+rows[0].kennwort+"</br></br>Mit freundlichen Grüßen</br></br>Jörg Tuttas";
					console.log('Sending Mail');
					transport.sendMail(message, function(error){
						if(error){
							console.log('Error occured');
							console.log(error.message);
							msg= {
								success:false,
								message:"Serverfehler:"+error.message
							}
							// Shows the result on console window
							socket.emit('updateresendlogin',msg);
						}
						else {
							console.log('Message sent successfully!');
							msg= {
								success:true,
								message:"Benutzerdaten gesendet an "+data.email
							}
							// Shows the result on console window
							socket.emit('updateresendlogin',msg);
						}

						// if you don't want to use this transport object anymore, uncomment following line
						//transport.close(); // close the connection pool
					});
					
				}
			}
		});
	});
	
	
/* Anmeldung am System
		var msg={
			game:game,
			user:benutzername,
			password:kennwort,
			email:email
		}
	*/
	socket.on('register', function (data) {
		console.log ("Empfange Register von "+data.user+" mit Kennwort "+data.password);
		connection.query("SELECT * from User where name='"+data.user+"'", function(err, rows){
			// There was a error or not?
			if(err != null) {
				console.log("Query error:" + err);
			} 
			else {			
				if (rows[0]==undefined) {
					connection.query("INSERT INTO User (name,kennwort,email) VALUES ('"+data.user+"','"+data.password+"','"+data.email+"');", function(err, rows){
						if(err != null) {
							console.log("Query error:" + err);
						}
					});					
					connection.query("INSERT INTO user_game (Name,game,score) VALUES ('"+data.user+"',(Select id from Game where name='"+data.game+"'),0);", function(err, rows){
						if(err != null) {
							console.log("Query error:" + err);
						}
						else {
							console.log("Neuer Benutzer angelegt!");
							msg= {
								success:true,
								message:"Registrierung erfolgreich!",
								user:data.user,
								password:data.password
							}
							// Shows the result on console window
							console.log("Registrierung erfolgreich für "+data.user);
							socket.emit('updateregister',msg);
						}
					});	
					
				}
				else {
					msg= {
						success:false,
						message:"Der Benutzer '"+data.user+"' existiert bereits!",
						user:data.user,
						password:data.password
					}
					// Shows the result on console window
					console.log("Benutzername "+data.user+" existiert bereits!");
					socket.emit('updateregister',msg);
				}
			}
		});
	});
	/* Anmeldung am System
		var msg={
			user:benutzername,
			password:kennwort,
		}
	*/
	socket.on('login', function (data) {
		console.log ("Empfange Login von "+data.user+" mit Kennwort "+data.password);
		connection.query("SELECT * from User where name='"+data.user+"'", function(err, rows){
        // There was a error or not?
        if(err != null) {
            console.log("Query error:" + err);
        } else {			
			if (rows[0]==undefined) {
				msg= {
					success:false,
					message:"Kann den Benuternamen '"+data.user+"' nicht finden",
					user:data.user,
					password:data.password
				}
				// Shows the result on console window
				console.log("Benutzername "+data.user+" unbekannt!");
				socket.emit('updatelogin',msg);
			}
			else if (rows[0].kennwort!=data.password) {
				msg= {
					success:false,
					message:"Das Kennwort für Benutzer '"+data.user+"' ist falsch!",
					user:data.user,
					password:data.password
				}
				// Shows the result on console window
				console.log("Benutzername "+data.user+" bekannt aber Kennwort falsch, Kennwort war "+rows[0].kennwort);
				socket.emit('updatelogin',msg);
			}
			else {
				msg= {
					success:true,
					message:"Login Erfolgreich!",
					user:data.user,
					password:data.password
				}
				// Shows the result on console window
				console.log("Login erfolgreich für "+data.user);
				socket.emit('updatelogin',msg);
			}
        }
        // Close connection
        //connection.end();
    });
	});

    // Sende die Chatnachricht an einen Client
	/*
		Das minimal gesendete Objekt sieht so aus (weitere Attribute sind Sache des Clients)
		
		var ms = {
			to_player:partnet,
		}
	*/
    socket.on('sendchat', function (data) {
		if (clients[data.to_player]!=undefined) {
			var s = clients[data.to_player];
			s.emit('updatechat',data);
		}
    });

	 // Send Chat msg to all game players 
	 /*
		Das (min) gesendete Objekt sieht so aus:(weitere Attribute sind Sache des Clients)
		
		var ms = {
			game:"ttt",
		}
	 */
    socket.on('sendgamechat', function (data) {
		for (key in games[data.game]) {
			//console.log("key="+key);
			var s = clients[key];
			s.emit('updategamechat', data);
		}
    });
	
	
	
	 // Empfange Spielzug, der Spielzur wird an den gepaarten Partner weitergeleitet.
	/*
		Das (min) gesendete Objekt sieht so aus:(weitere Attribute sind Sache des Clients)
		
		var ms = {
			game:"ttt",
			command:play,  Spielkommando (play,won,pending,giveup)
			from_player: xy
		}
	*/
	socket.on('play', function (data) {
		if (paarungen[data.from_player] != undefined) {
			var to_player=paarungen[data.from_player];
			console.log("Empfange play command "+data.command+" von "+data.from_player+" game="+data.game);

			var s = clients[to_player];
			// Weiterleiten an Spielpartner
			s.emit('updateplay', data);
			
			if (data.command=="won") {
				games[data.game][data.from_player]["score"]++;
			}
		}
		else {
			console.log("Habe Spielzug empfangen aber keinen Partner dazu gefunden!");
		}
    });

	
	
	// Quit Paaring, Eine Paarung wird beendet und der neue Zustand allen Client mitgeteilt
	/*
	Das (min) gesendete Objekt sieht so aus:(weitere Attribute sind Sache des Clients)
		
		var ms = {
			game:"ttt",
			from_player: xy
		}
	*/
    socket.on('quitpaaring', function (data) {
		console.log("Quit Paaring from:"+data.from_player);
		delete paarungen[data.from_player];
		games[data.game][data.from_player]["ingame"]="freeplayer";
		for (key in games[data.game]) {
			var s = clients[key];
			s.emit('updateusers', games[data.game]);
			console.log("Sende Updateusers an:"+key);
		}
	});
	
	// Anfrage an einen Spieler (Wunsch nach Paarung oder Zurückziehen des Wunsches)
	/*
	Das (min) gesendete Objekt sieht so aus:(weitere Attribute sind Sache des Clients)
		
		var ms = {
			game:"ttt",
			from_player: xy,
			to_player: yz,
			command:request   	request=Wunsch nach Paarung, cancelrequest=Paarungswunsch wird zurückgezogen
								request_acknowladged = Paarungswunsch angenommen, request_rejected = Paarungswunsch abgelehnt
		}
	*/
    socket.on('request', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters
		console.log("request type:"+data.command+" from:"+data.from_player+" to "+data.to_player+ " game="+data.game);
		
		if (data.command=="request") {
			console.log("Paarungsanfrage von "+data.from_player+" an "+data.to_player);

			games[data.game][data.from_player]["ingame"]="playerpending";
			games[data.game][data.to_player]["ingame"]="playerpending";
			paaringrequests[data.from_player]={};
			paaringrequests[data.from_player].player=data.to_player;
			paaringrequests[data.from_player].type="request";
			
			paaringrequests[data.to_player]={};
			paaringrequests[data.to_player].player=data.from_player;
			paaringrequests[data.to_player].type="requested";
		}
		else if (data.command=="cancelrequest") {
			console.log("Paarungsanfrage von "+data.from_player+" an "+data.to_player+" zurückgezogen");
			games[data.game][data.from_player]["ingame"]="freeplayer";
			games[data.game][data.to_player]["ingame"]="freeplayer";
			delete paaringrequests[data.from_player];
			delete paaringrequests[data.to_player];

		}
		else if (data.command=="request_acknowledged") {
			games[data.game][data.from_player]["ingame"]="playerplay";
			games[data.game][data.to_player]["ingame"]="playerplay";
			paarungen[data.to_player]=data.from_player;
			paarungen[data.from_player]=data.to_player;
			console.log("Setze Spielpaarung:"+data.from_player+"<->"+data.to_player);
			delete paaringrequests[data.from_player];
			delete paaringrequests[data.to_player];
		}
		else if (data.command=="request_rejected") {
			console.log("Paarungsanfrage von "+data.from_player+" an "+data.to_player+" zurückgewiesen");
			games[data.game][data.from_player]["ingame"]="freeplayer";
			games[data.game][data.to_player]["ingame"]="freeplayer";
			delete paaringrequests[data.from_player];
			delete paaringrequests[data.to_player];
		}

		// Sende Spielanfrage and to_player
		var socket = clients[data.to_player];
		socket.emit('updaterequest', data);

		// Sende an alle Spieler, dass zwei Spieler sind angefragt haben (Zustand dieser Spieler muss ggf. auf der Cleint-Seite aktualisiert werden)
		for (key in games[data.game]) {
				var s = clients[key];
				s.emit('updateusers', games[data.game]);
				console.log("Sende Updateusers an:"+key);
		}
		
    });
	
		

    // Ein Spieler wird hinzugefügt
	/*
	Das (min) gesendete Objekt sieht so aus:(weitere Attribute sind Sache des Clients)
		
		var ms = {
			game:"ttt",
			player: xy,
		}
	*/
    socket.on('adduser', function(data){

		console.log("adduser:"+data.player+" for game "+data.game);
	
        // we store the username in the socket session for this client
        socket.username = data.player;
		socket.game=data.game;

        // add the client's username to the global lists
		if (games[data.game] == undefined) {
			games[data.game]={}
		}
		
		if (games[data.game][data.player]==undefined) {
			games[data.game][data.player]={};
			games[data.game][data.player]["name"]= data.player;
			games[data.game][data.player]["ingame"]="freeplayer";
			games[data.game][data.player]["score"]=0;
	
		        
			clients[data.player]=socket;
			
			var ms = {
				game:data.game,
				from_player:"Server",
				content:socket.username + ' has connected!',
				content_class:"servermsg"
			}

			for (key in games[data.game]) {
				var s = clients[key];
				console.log("Sende Update an:"+key);
				s.emit('updategamechat', ms);
				s.emit('updateusers', games[data.game]);
			}
			
		}
		else {
			console.log("Der Spielername existiert bereits");
			socket.emit('connecterror', 'Der Spielername '+socket.username+" existiert bereits");
		}
    });

 

    // Ein Client hat die Verbindung verloren, wenn dieser Client in einem Spiel oder einer Paarung War, werden die 
	// jeweils anderen Partner benachrichtigt

    socket.on('disconnect', function(){
		console.log("Disconnect "+socket.username+" game "+socket.game);
        // remove the username from global usernames list
		if (socket.username!=undefined && socket.game!=undefined) {
			// Der Spieler war in einem Spiel -> Spiel wird beendet (close)
			if (paarungen[socket.username] != undefined) {
				var gegner = paarungen[socket.username];
				console.log("Der Spieler war in einer Paarung mit "+gegner);
				var s = clients[gegner];
				if (games[socket.game][gegner]!=undefined) {
					games[socket.game][gegner]["ingame"]="freeplayer";
					s.emit("updatedisconnected","Ihr Mitspieler hat die Verbindung beendet");
					delete paarungen[gegner];
					delete paarungen[socket.username];
					
				}
			}
			// Der Spieler war in einer Paarung -> (Paarung wird abgelehnt)
			if (paaringrequests[socket.username] != undefined) {
				var gegner = paaringrequests[socket.username].player;
				console.log("Der Spieler hatte eine Paarungsanfrage an "+gegner+ " vom type="+paaringrequests[gegner].type);
				var s = clients[gegner];
				if (games[socket.game][gegner]!=undefined) {
					games[socket.game][gegner]["ingame"]="freeplayer";
					var ms = {
						game:socket.game,
						from_player: socket.username,
						to_player: gegner,
						command:"cancelrequest"
					}
					if (paaringrequests[gegner]["type"]=="request") {
						ms.command="request_rejected";
					}
					console.log("Sende Updaterequest an "+gegner+" mit command="+ms.command);
					s.emit('updaterequest', ms);
					delete paaringrequests[gegner];
					delete paaringrequests[socket.username];					
				}
			}

			delete games[socket.game][socket.username];
			
			for (key in games[socket.game]) {
					var s = clients[key];
					var ms = {
						game:socket.game,
						from_player:"Server",
						content:socket.username + ' has disconnected',
						content_class:"servermsg"
					}
					s.emit('updategamechat', ms);
					s.emit('updateusers', games[socket.game]);
			}
		}
    });

});

