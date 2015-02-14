var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var redis = require('redis');
var redisClient = redis.createClient();

// Setting single values in a redis database
// redisClient.set("message1", "hello, yes this is dog");
// redisClient.set("message2", "hello, no this is spider");

// redisClient.get("message1", function(err, reply) {
//   console.log(reply);
// });

// Setting elements of a list in a redis database
// var message = "Hello, this is dog";
// redisClient.lpush('messages', message, function(err, reply) {
//   console.log(reply);
// });
// var message = "Hello, no this is spider";
// redisClient.lpush('messages', message, function(err, reply) {
//   console.log(reply);
// });

// Logs out elements in messages list
// redisClient.lrange('messages', 0, -1, function(err, messages) {
//   console.log(messages);
// });

var messages = [];

var storeMessage = function(name, data) {
  var message = JSON.stringify({name: name, data: data});
  redis.lpush('messages', message, function(err, response) {
    //keep only the newest 10 items in the array
    redisClient.ltrim("messages", 0, 9);
  });
}

io.sockets.on('connection', function(client) {
	console.log('Client connected...');

});

io.sockets.on('connection', function(client) {
  
	client.on('join', function(name) {

    client.broadcast.emit("add chatter", name);

    redisClient.smembers('names', function(err, names) {
      names.forEach(function(name) {
        client.emit('add chatter', name);
      });
    });

    redisClient.sadd("chatters", name);

    client.nickname = name;
    console.log(name + " joined the chat.");
    redisClient.lrange("messages", 0, -1, function(err, messages) {
      messages = messages.reverse();
      
      messages.forEach(function(message) {
        message = JSON.parse(message);
        client.emit("messages", message.name + ": " + message.data);
      });
    });
	});

	client.on('messages', function(message) {
		client.get('nickname', function(error, name) {
      client.broadcast.emit("messages", name + ": " + message);
      client.emit("messages", name + ": " + message);
      storeMessage(name, message);
    });		
	});

  client.on('disconnect', function(name) {
    client.get('nickname', function(err, name) {
      client.broadcast.emit("remove chatter", name);
      redisClient.srem("chatters", name);
    });
  });

});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

server.listen(8000);