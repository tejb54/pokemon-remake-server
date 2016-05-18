/**
 * Created by Tobias on 2016-04-25.
 */
var io = require('socket.io').listen(9058);
var _ = require('lodash');

var players = {};

//dictonary containing battle objects index with battleRoomId
var battles = {};

var monsterObj = function (name, hp, maxHp, level) {
    this.name = name;
    this.hp = hp;
    this.maxhp = maxHp;
    this.level = level;
};

var playerObj = function (id,monster,alive,dead) {
  this.id = id; //id for this player
  this.monster = monster; //holds the current selected monster for this player
  this.alive = alive;
  this.dead = dead;
};

var battle = function () {
    this.players = []; //contains player objects
    this.currentPlayerTurn = ''; //this will hold the id for current player
};


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
    });

    socket.on('interact', function (id) {
        console.log("interaction started by " + socket.id +" to " + id);
        socket.broadcast.to(id).emit('interact_request',socket.id);
    });

    socket.on('interact_response',function (data) {
        console.log("player " + socket.id + " has responded with " + data.res );

        if(data.res)
        {
            var room = "battle_id";
            socket.broadcast.to(data.id).emit('interact_response',room);
            socket.emit('interact_response',room);
        }

    });


    socket.on('start_battle',function (obj) {
        var battleRoomId = obj.battleId;

        socket.join(battleRoomId);

        //if the room has not been created
        if(!battles[battleRoomId])
        {
            battles[battleRoomId] = new battle();
        }
        else
        {
            //get already connected player info
            socket.emit('enter_battle', battles[battleRoomId].players[0]);

            //send your info to the other player
            socket.broadcast.to(battleRoomId).emit('enter_battle',new playerObj(socket.id,obj.monster,obj.alive,obj.dead));
        }
        battles[battleRoomId].players.push(new playerObj(socket.id,obj.monster,obj.alive,obj.dead));

        //should preform a calculation to set the current player depending on speed
        //now the player that joined last is the current player.
        battles[battleRoomId].currentPlayerTurn = socket.id;
    });

    socket.on('attack_battle',function (obj) {
        
    });

    socket.on('change_monster', function (obj) {

    });

    socket.on('leave_battle',function (battleRoomId) {

        //this needs to be fixed so that you only set room to null if all players have left
        battles[battleRoomId] = null;

        //tell socket.io to leave the room
        socket.leave(battleRoomId);
    });
});
