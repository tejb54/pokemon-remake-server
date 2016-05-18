/**
 * Created by Tobias on 2016-05-18.
 */

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
    this.players = []; //contains playerObj objects
    this.currentPlayerTurn = ''; //this will hold the id for current player
};

function sendCurrentPlayer() {
    io.to(battleRoomId).emit('battle_player_turn',battles[battleRoomId].currentPlayerTurn);
}

function swapCurrentPlayer(currentPlayer,battleRoomId) {
    if(currentPlayer == battles[battleRoomId].players[0].id)
    {
        return battles[battleRoomId].players[1].id
    }
    else if(currentPlayer == battles[battleRoomId].players[1].id)
    {
        return battles[battleRoomId].players[0].id
    }
}



module.exports = function (socket,io) {

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

        if(battles[battleRoomId].players.length >= 2)
        {
            //send the info about how is the current player
            sendCurrentPlayer();
        }
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

};