/**
 * Created by Tobias on 2016-04-25.
 */
var io = require('socket.io').listen(9058);
var _ = require('lodash');

var players = {};

io.on('connection',function (socket) {
    console.log('connection');

    socket.emit('connection',socket.id);


    socket.on('start',function (player) {
        player.id = socket.id;

        socket.join(player.room);


        //send my position to all other players
        socket.broadcast.to(player.room).emit('spawn',player);

        //send already connected players back to myself
        _.forEach(players,function (item) {
            if(item.room == player.room)
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
        socket.broadcast.to(players[socket.id].room).emit('moving',data);
    });

    socket.on('disconnect',function () {
        console.log('disconnect');
        //check if there is a room else just leave
        if(players[socket.id]){
            socket.broadcast.to(players[socket.id].room).emit('player-left',socket.id);
            _.unset(players,socket.id);
        }
    });

    socket.on('interact', function (otherPlayer) {
        
    });
});
