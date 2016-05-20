/**
 * Created by Tobias on 2016-05-18.
 */


var battles;

//dictonary containing battle objects index with battleRoomId
var monsterObj = function (name, hp, maxHp, level, type, defense) {
    this.name = name;
    this.hp = hp;
    this.maxhp = maxHp;
    this.level = level;
    this.type = type;
    this.defense = defense;
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
    this.numPlayers = 0;
};

function sendCurrentPlayer(battleRoomId,io) {
    io.to(battleRoomId).emit('battle_player_turn',battles[battleRoomId].currentPlayerTurn);
}

function swapCurrentPlayer(battleRoomId) {
    if(battles[battleRoomId].currentPlayerTurn == battles[battleRoomId].players[0].id)
    {
        return battles[battleRoomId].players[1].id
    }
    else if(battles[battleRoomId].currentPlayerTurn == battles[battleRoomId].players[1].id)
    {
        return battles[battleRoomId].players[0].id
    }
}

function getYourself(socket) {
    if(battles[socket.battleRoomId].players[0].id == socket.id)
    {
        return battles[socket.battleRoomId].players[0];
    }
    else if(battles[socket.battleRoomId].players[1].id == socket.id)
    {
        return battles[socket.battleRoomId].players[1];
    }
}

function getOpponent(socket) {
    if(battles[socket.battleRoomId].players[0].id == socket.id)
    {
        return battles[socket.battleRoomId].players[1];
    }
    else if(battles[socket.battleRoomId].players[1].id == socket.id)
    {
        return battles[socket.battleRoomId].players[0];
    }
}


module.exports = function (socket,io,bt) {
    battles = bt;

    socket.on('start_battle',function (obj) {
        var battleRoomId = obj.battleId;
        socket.battleRoomId = obj.battleId;

        socket.join(battleRoomId);

        //if the room has not been created
        var NewPlayerObj = new playerObj(socket.id,obj.monster,obj.alive,obj.dead,obj.type,obj.defense);

        if(!battles[battleRoomId])
        {
            battles[battleRoomId] = new battle();
        }
        else
        {
            //send already connected player info to yourself
            socket.emit('enter_battle', battles[battleRoomId].players[0]);

            //send your info to the other player
            socket.broadcast.to(battleRoomId).emit('enter_battle',NewPlayerObj);
        }
        battles[battleRoomId].players.push(NewPlayerObj);

        battles[socket.battleRoomId].numPlayers++;

        //should preform a calculation to set the current player depending on speed
        //now the player that joined last is the current player.
        battles[battleRoomId].currentPlayerTurn = socket.id;

        //if two players have joined send the information about who's turn it is
        if(battles[battleRoomId].players.length >= 2)
        {
            //send the info about how is the current player
            sendCurrentPlayer(battleRoomId,io);
        }
    });

    socket.on('attack_battle',function (damage) {

        var opponent = getOpponent(socket);

        opponent.monster.hp = opponent.monster.hp - damage;

        if(opponent.monster.hp > 0)
        {
            //update the hp for the other player
            socket.broadcast.to(socket.battleRoomId).emit('take_damage',damage);

            //update the hp for yourself;
            socket.emit('opponent_take_damage',damage);
        }
        else
        {
            socket.broadcast.to(socket.battleRoomId).emit('monster_faint');
        }



        battles[socket.battleRoomId].currentPlayerTurn = swapCurrentPlayer(socket.battleRoomId);
        sendCurrentPlayer(socket.battleRoomId,io);
    });

    socket.on('change_monster_battle', function (monsterObj) {

        console.log(monsterObj);
        //change your monster on the server
        var you = getYourself(socket);
        you.monster = monsterObj;

        //send your new monster to the other player
        socket.broadcast.to(socket.battleRoomId).emit('opponent_changed_monster_battle',monsterObj);


        battles[socket.battleRoomId].currentPlayerTurn = swapCurrentPlayer(socket.battleRoomId);
        sendCurrentPlayer(socket.battleRoomId,io);
    });

    socket.on('leave_battle',fuddaction () {

        if(socket.battleRoomId)
        {
            console.log('leaving battle room with id ' + socket.battleRoomId);
            battles[socket.battleRoomId].currentPlayerTurn = swapCurrentPlayer(socket.battleRoomId);
            sendCurrentPlayer(socket.battleRoomId,io);

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
            socket.leave(socket.battleRoomId);
            socket.battleRoomId = null;
        }
    });

};