/**
 * Created by Tobias on 2016-04-25.
 */
var io = require('socket.io').listen(9058);
var _ = require('lodash');
var uuid = require('uuid');

var players = {};
var battles = {};


io.on('connection',function (socket) {
    console.log('connection');

    socket.emit('connection',socket.id);


    socket.on('start',function (player) {
        player.id = socket.id;

        console.log('start exploration mode from player ' + player.id);

        socket.join(player.room);


        //send my position to all other players
        socket.broadcast.to(player.room).emit('spawn',player);

        //send already connected players back to myself
        _.forEach(players,function (item) {
            if(item.room == player.room && item.id != player.id)
            {
                socket.emit('spawn',item);
            }
        });

        //add player to the array for keeping tack of the players
        players[player.id] = player;
    });

    socket.on('leave_room',function () {
        socket.broadcast.to(players[socket.id].room).emit('player-left',socket.id);
        socket.leave(players[socket.id].room);
        //socket.join(room);
        //players[socket.id].room = room;
    });

    socket.on('moving',function (data) {
        data.id = socket.id;
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        socket.broadcast.to(players[socket.id].room).emit('moving',data);
    });

    socket.on('disconnect',function () {
        console.log('disconnect');
        //check if there is a room else just leave
        if(players[socket.id]){
            socket.broadcast.to(players[socket.id].room).emit('player-left',socket.id);
            _.unset(players,socket.id);
        }


        //remove battle room if it exists for current player
        if(socket.battleRoomId)
        {
            console.log('leaving battle room with id ' + socket.battleRoomId);
            var num = battles[socket.battleRoomId].numPlayers;

            //this needs to be fixed so that you only set room to null if all players have left
            //if you are the last player to leave then destroy the room
            if( battles[socket.battleRoomId].numPlayers <= 1){
                console.log('removed battle room');
                battles[socket.battleRoomId].numPlayers--;
                battles[socket.battleRoomId] = null;
            }
            else
            {
                battles[socket.battleRoomId].numPlayers--;
            }

            //tell socket.io to leave the room
            if(num > 1){
                socket.broadcast.to(socket.battleRoomId).emit('other-player-left');
            }

            //tell socket.io to leave the room
            socket.leave(socket.battleRoomId);
            socket.battleRoomId = null;
        }
    });

    socket.on('interact', function (obj) {
        var id = obj.id;

        console.log("interaction started by " + socket.id +" to " + id);
        socket.broadcast.to(id).emit('interact_request',{
            id: socket.id,
            name: obj.name
        });
    });

    socket.on('interact_response',function (data) {
        console.log("player " + socket.id + " has responded with " + data.res );

        if(data.res)
        {
            //generate a random battle room id to be used.
            var room = uuid.v4();

            //send this id to the players
            socket.broadcast.to(data.id).emit('interact_response',room);
            socket.emit('interact_response',room);
        }

    });

    require('./battle')(socket,io,battles);
});
