var socket = io();

let playerColor = "green"
// ----- INTRO FUNCTIONS -------------------
function clickColor(color) {
    document.getElementById('greenButton').style.border = "solid 1px black"
    document.getElementById('redButton').style.border = "solid 1px black"
    document.getElementById('blueButton').style.border = "solid 1px black"
    document.getElementById('orangeButton').style.border = "solid 1px black"
    document.getElementById('purpleButton').style.border = "solid 1px black"
    document.getElementById('plumButton').style.border = "solid 1px black"
    document.getElementById('cyanButton').style.border = "solid 1px black"
    document.getElementById('chartreuseButton').style.border = "solid 1px black"

    document.getElementById(`${color}Button`).style.border = "solid 3px white"
    playerColor = color
}
function startGame() {
    let playerName = document.getElementById('nameField').value
    if (playerName=="") playerName = "iamdumb"
    socket.emit('startGame', [playerName, playerColor])
    let elements = document.getElementsByClassName('hidden')
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = 'none'
    }
}






// ---- GAME FUNCTIONS AND LOOP ---------------
/*
    let dx = 1;
let dy = -1; */
let allPlayers = [];
let allBullets = [];
let scoreboard = {};
tankLength = 60;
tankWidth = tankLength*(2/3)

// init canvas
let c = document.getElementById('myCanvas');
let ctx = c.getContext("2d");

const serverWidth = 1000;
const serverHeight = 500;

/*
// Base dimensions for the canvas
const originalWidth = 1000; // Base width
const originalHeight = 500; // Base height

// Resize the canvas dynamically
function resizeCanvas() {
    // Get the current window width and height
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get the available window width minus the width of the chat
    const chatWidth = document.querySelector('.chat').offsetWidth;

    // Calculate the available width for the canvas
    const availableWidth = windowWidth - chatWidth;

    // Set the max width as 80% of the available space
    const maxCanvasWidth = availableWidth * 0.8; 

    // Calculate aspect ratio of the base size
    const aspectRatio = originalWidth / originalHeight;
    const windowAspectRatio = windowWidth / windowHeight;

    // If the window is wider than the aspect ratio, scale by height
    if (windowAspectRatio > aspectRatio) {
        c.width = windowHeight * aspectRatio;
        c.height = windowHeight;
    } else {
        // Otherwise, scale by width
        c.width = windowWidth;
        c.height = windowWidth / aspectRatio;
    }

    // Optionally, set canvas size using CSS to make it responsive
    c.style.width = `${c.width}px`;
    c.style.height = `${c.height}px`;

    // Set the drawing context to scale content accordingly
    ctx.setTransform(c.width / originalWidth, 0, 0, c.height / originalHeight, 0, 0);

    console.log(`windowHeight: ${windowHeight}, windowWidth: ${windowWidth}, windowAspectratio: ${windowAspectRatio}`)
}

// Call resizeCanvas on initial load and when the window is resized
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
*/

/*
let x = 1;
let y = 1;
let direction = 0; */
// game loop

function draw() {
    //console.log(`windowHeight: ${windowHeight}, windowWidth: ${windowWidth}, windowAspectratio: ${windowAspectRatio}`)
    //tryOver() // check for game over
    ctx.clearRect(0,0, c.width, c.height)  // clears a rectangular area in the canvas
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i<allPlayers.length; i++) {
        drawPlayerRotation(allPlayers[i])
    }
    let botsOnBoard = false
    for (let i = 0; i < allPlayers.length; i++) {
        if (allPlayers[i].id.substring(0,6) == "botbot") {
            botsOnBoard = true;
            break;
        }
    }
    if (allBullets[0]) makeBullets()
    move()
    window.requestAnimationFrame(draw)
}
window.requestAnimationFrame(draw)
//setInterval(draw,4);   // update every 4 ms

function makeBullets() {
    for (let i = 0; i<allBullets.length; i++) {
        ctx.beginPath();
        ctx.arc(allBullets[i].x,allBullets[i].y, tankWidth*0.1, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.closePath();
    }
}

function drawPlayerRotation(player) {
    ctx.save()
    ctx.translate(player.x,player.y)
    ctx.rotate(player.direction)

    // draw tank
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;  
    ctx.rect(-tankLength/2,-tankWidth/2,tankLength,tankWidth) // tank width/height
    ctx.fill() // x, y, width, height
    ctx.stroke();
    ctx.closePath();

    // draw turret
    //ctx.translate(-tankLength/4, 0)
    ctx.rotate(player.turretDirection)
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;  
    ctx.rect(0, -tankLength/20,tankLength*0.9, tankLength/10) // turretWidth = 6
    ctx.fill() // x, y, width, height
    ctx.stroke();
    ctx.closePath();
    //ctx.rotate(-player.turretDirection)

    // draw turret top
    ctx.beginPath();
    ctx.arc(0,0, tankWidth*0.4, 0, 2 * Math.PI);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.closePath();

    ctx.restore();
}
/*
socket.on('initNewPlayer', function(player){
    x = player.x
    y = player.y
    direction = player.direction
}, function(players){
    allPlayers = players;
})*/

// register pressed keys
let keys = {}
window.addEventListener('keydown', function(e){
    keys[e.key] = true;
}, false);

// remove lifted keys
window.addEventListener('keyup', function(e){
    delete keys[e.key]
})

// control movement (temporary)
function move() {
    if (keys['w']) {
        socket.emit('pressed', 'w')
    }
    if (keys['a']) {
        socket.emit('pressed', 'a')
    }
    if (keys['s']) {
        socket.emit('pressed', 's')
    }
    if (keys['d']) {
        socket.emit('pressed', 'd')
    }
    if (keys['ArrowLeft']) {
        socket.emit('pressed', 'ArrowLeft')
    }
    if (keys['ArrowRight']) {
        socket.emit('pressed', 'ArrowRight')
    }
    if (keys[' ']) {
        socket.emit('pressed', ' ')
    }
}

socket.on ('PlayerMoving', function(players) {
    allPlayers = players;
    //console.log(allPlayers)
})

socket.on ('BulletsMoving', (bullets) => {
    allBullets = bullets;
    //console.log(allBullets)
})

socket.on ('updateScores', (scores) => {
    scoreboard = scores;
    console.log(scoreboard)
    let sortedScores = Object.keys(scoreboard).map(function(key) {
        return [key, scoreboard[key]];
        });
    // Sort the array based on the second element
    sortedScores.sort(function(first, second) {
        return second[1] - first[1];
      });
      
    // Create a new array with only the first 5 items
    let topScores = sortedScores.slice(0, 3);
    // add scores to HTML
    document.getElementById('score0').innerHTML = `1st: ${topScores[0][1]}, ${topScores[0][0]}`
    document.getElementById('score1').innerHTML = `2nd: ${topScores[1][1]}, ${topScores[1][0]}`
    if (Object.keys(scoreboard).length > 2) {
        document.getElementById('score2').innerHTML = `3rd: ${topScores[2][1]}, ${topScores[2][0]}`
    }
    //console.log("score!", topScores)
    
    
})


// ------- make the chat ----------------------

var form = document.getElementById('form');
var input = document.getElementById('input');
      
form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

socket.on('chat message', function(msg) {
    var item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});



