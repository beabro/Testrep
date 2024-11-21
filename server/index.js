const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// access static files
app.use(express.static('../app'))
app.use(express.static('../styles'))
app.use(express.static('../assets'))

// show the html as startscreen
app.get('/', (req, res) => {
  res.sendFile('../app/index.html');
});

// variables and such
const canvasWidth = 1000;
const canvasHeight = canvasWidth/2;
const canvasMargin = 25;
const tankLength = 60;
let players = [];
let bullets = [];
let scores = {'bots': 0}
let choices = {}
const moveSpeed = 1;
const rotation = 0.02;
const bulletSpeed = 3;
const maxBotsAllowed = 3;
let timerON = false;
let timerCount = 0;
let intervalID;

class Player {
  //constructor (name, color, x, y, direction)
}

function newBullet(player) {
  let direction = player.turretDirection + player.direction;
  let x = player.x + tankLength*0.9*Math.cos(direction); // FIX canvas coord
  let y = player.y + tankLength*0.9*Math.sin(direction);
  let owner = player.id; // FIX later ?
  let ownerName = player.name;
  return {direction: direction, x: x, y: y, owner: owner, ownerName: ownerName}
}


// --------- server actions -------------
// when a new player joins
io.on('connection', (socket) => {
  console.log('a user connected');
  let currentPlayer;
  socket.on('startGame', (nameColor) => {
    choices[`${socket.id}`] = nameColor
    //respawn()
    currentPlayer = newPlayer();
    players.push(currentPlayer)
    scores[`${currentPlayer.name}`] = 0;
  })
  if (!timerON) {
    timerON = true;
    intervalID = setInterval(bulletsAndBots,14)
  }
  // -------- bullet&bot timer ------------
  function bulletsAndBots() {
    handleBots();
    handleBullets();
    timerCount++;
  }
  

  // when a user disconnects
  socket.on('disconnect', () => {
    players = players.filter(p => p != currentPlayer)
    console.log('user disconnected');
  });


  function newPlayer() {
    if (!choices[`${socket.id}`]) choices[`${socket.id}`] = ['stinky', 'green'] 
    let name = choices[socket.id][0]; // FIX later
    let id = socket.id
    let color = choices[socket.id][1];
    let illegalSpawn = true;
    let x = 0;
    let y = 0;
    while (illegalSpawn) {
      x = Math.max(Math.random() * canvasWidth, 0 + canvasMargin);
      x = Math.min(x,canvasWidth-canvasMargin)
      y = Math.max(Math.random() * canvasHeight, 0 + canvasMargin);
      y = Math.min(y, canvasHeight-canvasMargin)
      illegalSpawn = checkIfTankNearby(x,y)
    }
    let direction = Math.random() * 6; // ~2pi
    let turretDirection = 0; // relativt tanken!?
    let safetyOff = true;
  
    return {name: name, id: id, color: color, x: x, y: y, direction: direction, turretDirection: turretDirection, safetyOff: safetyOff}
  }

  function respawn() {
    // spawn new player if dead!
    //let first = !players[0]
    let dead = true;
    for (let i = 0; i<players.length; i++) {
      if (players[i].id == socket.id) dead = false;
    }
    if (dead) {
      if (players.length >= maxBotsAllowed) {
        for (let i = 0; i < players.length; i++) {
          if (players[i].id.substring(0,6) == "botbot") {
            players = players.filter(p => p != players[i])
            break;
          }
        }
      }
      let currentUser = true
      for (let i=0; i<players.length; i++) {
        if (players[i].id == socket.id) currentUser=false;
      }
      if (currentUser) {
        currentPlayer = newPlayer();
        players.push(currentPlayer);
      }
      socket.emit('PlayerMoving', players)
      socket.broadcast.emit('PlayerMoving', players)
    }
    //if (first) gameLoop();
  }

  // player movement
  socket.on('pressed', function(key) {
    if (choices[`${socket.id}`]) {
      respawn()
    
      
      if (key=='w') {
        goForward(currentPlayer)
      }
      if (key=='a') {
        turnLeft(currentPlayer)
      }
      if (key=='s') {
        goBack(currentPlayer)
      }
      if (key=='d') {
        turnRight(currentPlayer)
      }
      if (key=='ArrowLeft') {
        turretLeft(currentPlayer)
      }
      if (key=='ArrowRight') {
        turretRight(currentPlayer)
      }
      socket.emit('PlayerMoving', players)
      socket.broadcast.emit('PlayerMoving', players)
      if (key==' ') {
        shoot(currentPlayer)
        socket.emit('BulletsMoving', bullets)
        socket.broadcast.emit('BulletsMoving', bullets)
      }
  }}) // } före parentes
  function goForward(player) {
    let x = player.x + moveSpeed * Math.cos(player.direction)
      let y = player.y + moveSpeed * Math.sin(player.direction)
      if (checkLegalMove(x,y)) {
        player.x = x;
        player.y = y;
      }
  }
  function turnLeft(player) {
    player.direction -= rotation
  }
  function goBack(player) {
    let x = player.x - moveSpeed * Math.cos(player.direction)
    let y = player.y - moveSpeed * Math.sin(player.direction) // TEMP - FIX LATER
    if (checkLegalMove(x,y)) {
      player.x = x;
      player.y = y;
    }
  }
  function turnRight(player) {
    player.direction += rotation
  }
  function turretLeft(player) {
    player.turretDirection -= rotation
  }
  function turretRight(player) {
    player.turretDirection += rotation
  }
  function shoot(player) {
    // only allow one live shot per player FIX with safety instead ??
    let oneShot = true;
    for (let i = 0; i<bullets.length; i++) {
      if (bullets[i].owner == player.id) {
        oneShot = false;
      }
    }
    if (oneShot) {
      //console.log("FIRE!!!")
      let thisBullet = newBullet(player);
      bullets.push(thisBullet)
    }
  }
  
  // bot things
  function handleBots() {
    // add new bot if too few players
    if (players.length < maxBotsAllowed) {
      let bot = newPlayer()
      bot.id = "botbot" + timerCount;
      bot.name = "bots"
      bot.color = "green"
      players.push(bot)
    }
    // move bots
    for (let i = 0; i < players.length; i++) {
      if (players[i].id.substring(0,6) == "botbot") {
        let choice = Math.floor(Math.random()*3)
        switch (choice) {
          case 0:
            goForward(players[i])
            break;
          case 1:
            turnLeft(players[i])
            break;
          case 2:
            turnRight(players[i])
            break;
        }
        // detect closest player (not itself)
        let closestCoords = [0,0]
        for (let j = 0; j < players.length; j++) {
          if (players[j].id != players[i].id) {
            if (closestCoords == [0,0]) closestCoords = [players[j].x,players[j].y]
            // if player distance is closer than "closestCoords"
            if (Math.hypot(players[i].x-players[j].x, players[i].y-players[j].y) < Math.hypot(players[i].x-closestCoords[0], players[i].y-closestCoords[1])) {
              closestCoords = [players[j].x, players[j].y]
            }
          }
        }
        // turn turret towards closest player
        let dx = closestCoords[0] - players[i].x
        let dy = closestCoords[1] - players[i].y
        let targetDirection = 0
        // i don't want to handle zero division :3
        if (dx > 0) {
          targetDirection = Math.atan(dy/dx);
        }
        else if (dx < 0) {
          targetDirection = Math.PI + Math.atan(dy/dx);
        }
        if ((players[i].turretDirection + players[i].direction) % (2*Math.PI) < targetDirection) {
          turretRight(players[i])
        }
        else if ((players[i].turretDirection + players[i].direction) % (2*Math.PI) > targetDirection) {
          turretLeft(players[i])
        }
        // fire ? 
        shoot(players[i])
      }
    }
    socket.emit('PlayerMoving', players)
    socket.broadcast.emit('PlayerMoving', players)
  }

  // update all bullets positions
  function handleBullets() {
    if (bullets[0]) {
      for (let i=0; i<bullets.length; i++) {
        moveBullet(bullets[i])
      }
      // check if any bullets hit tanks, if hit: remove both bullet and tank
      let removedBullets = []
      let removedPlayers = []
      for (let i = 0; i<bullets.length; i++) {
        for (let j = 0; j<players.length; j++) {
          if (hitsTankRough(bullets[i].x, bullets[i].y, players[j].x, players[j].y)) {
            // send game over thing to correct socket ?
            // remove tank from board and update local player lists
            // remove bullet
            //console.log(`player ${players[j].name} is dead!`);
            if (!scores[`${bullets[i].ownerName}`]) scores[`${bullets[i].ownerName}`] = 0;
            scores[`${bullets[i].ownerName}`] ++;
            scores[`${players[j].name}`] --;
            removedBullets.push(bullets[i])
            removedPlayers.push(players[j])
            socket.emit('updateScores', scores)
            socket.broadcast.emit('updateScores', scores)
            //console.log(scores)
          }
        }
        
      }
      for (let i = 0; i<removedPlayers.length; i++) {
        players = players.filter(p => p != removedPlayers[i]);
      }
      for (let i = 0; i<removedBullets.length; i++) {
        bullets = bullets.filter(b => b != removedBullets[i]);
      }
      socket.emit('PlayerMoving', players)
      socket.broadcast.emit('PlayerMoving', players)
      socket.emit('BulletsMoving', bullets)
      socket.broadcast.emit('BulletsMoving', bullets)
    }
  }
  // move a bullet one step
  function moveBullet(bullet) {
    bullet.x += bulletSpeed * Math.cos(bullet.direction)
    bullet.y += bulletSpeed * Math.sin(bullet.direction)

    if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 0 || bullet.y > canvasHeight) { // FIXA canvas coords
      bullets = bullets.filter(b => b != bullet)
    }
  }

  // check collisions for tanks and shots
  function checkProximity(bx,by,tx,ty) {
    return (Math.hypot(bx-tx, by-ty) <= tankLength)
  }
  function checkIfTankNearby(x,y) { // true if at least one tank is within tankLength*0.8
    for (let i = 0; i<players.length; i++) {
      if (players[i].id != socket.id && Math.hypot(x-players[i].x, y-players[i].y) <= tankLength*0.8) {
        return true;
      }
    }
    return false
  }
  // check if bullet is within rough (circular) hitbox of a tank
  function hitsTankRough(bx,by,tx,ty) {
    if (!checkProximity(bx,by,tx,ty)) {return false;}
    return (((bx-tx)*(bx-tx)) + ((by-ty)*(by-ty)) <= tankLength*tankLength/9)  
  } 
  // FIX function for better hitboxes
  function hitsTank(x,y) {
    if (checkProximity(x,y)) {return false;}
    for (let i = 0; i<players.length; i++) {  // find coords of [frontleft, frontright, backright, backleft] corners
      let x0 = (tankLength/2 * Math.cos(player[i].direction)) - ((tankLength/3) * Math.sin(player[i].direction))  
      let x1 = (tankLength/2 * Math.cos(player[i].direction)) + ((tankLength/3) * Math.sin(player[i].direction))
      let x2 = -(tankLength/2 * Math.cos(player[i].direction)) - ((tankLength/3) * Math.sin(player[i].direction))
      let x3 = -(tankLength/2 * Math.cos(player[i].direction)) + ((tankLength/3) * Math.sin(player[i].direction))
      let y0 = -(tankLength/2 * Math.sin(player[i].direction))
    }
  }

  // check if a movement is legal (FIX LATER)
  function checkLegalMove(x,y) {
    if (x <= canvasMargin || x >= canvasWidth-canvasMargin || y <= canvasMargin || y >= canvasHeight-canvasMargin) {
      return false;
    }
    return !checkIfTankNearby(x,y)
  }


  // sending chats
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
