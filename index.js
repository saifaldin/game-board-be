const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const cors = require('cors'); // Import the cors middleware

const app = express();
app.use(cors());

const server = http.createServer();
const io = socketIo(server);

const players = [];

const colorPallet = ['#e04040', '#23b623', '#dfdf22', '#cbc1c1', '#4848e0', '#ca47ca'];

const createRandomArray = (originalArray, length) => {
  const clonedArray = originalArray.slice();
  for (let i = clonedArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clonedArray[i], clonedArray[j]] = [clonedArray[j], clonedArray[i]];
  }
  const newArray = Array.from({ length: clonedArray.length * 4 }, (_, index) => {
    const element = clonedArray[index % clonedArray.length];
    return element;
  });
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray.slice(0, length);
}

const findOpponent = (socket) => {
  const opponent = players.find((player) => player.id !== socket.id);
  return opponent;
}

const findMe = (socket) => {
  const me = players.find((player) => player.id === socket.id);
  return me;
}

io.on('connection', (socket) => {
  console.log('A user connected');
  if (players.length < 2) {
    players.push({ id: socket.id });
  } else {
    socket.disconnect();
  }

  socket.on('join', ({ username }) => {
    const player = players.find((player) => player.id === socket.id);
    socket.username = username;
    player.username = username;
    console.log('Player Joined', username);
    if (players.length === 2) {
      const goalRandomColors = createRandomArray(colorPallet, 9);
      const initialBoard = [...createRandomArray(colorPallet, 24), '#000'];
      console.log('game started', players);
      const me = findMe(socket);
      const opponent = findOpponent(socket);
      const meSocket = io.sockets.sockets.get(me.id);
      const opponentSocket = io.sockets.sockets.get(opponent.id);
      meSocket.emit('start', { goalRandomColors, initialBoard, opponentUsername: opponent.username });
      opponentSocket.emit('start', { goalRandomColors, initialBoard, opponentUsername: me.username });
    }
  });

  socket.on('move', ({ from, to }) => {
    const otherPlayer = players.find((player) => player.id !== socket.id);
    const otherPlayerSocket = otherPlayer && io.sockets.sockets.get(otherPlayer.id);
    console.log('players', players);
    console.log('otherPlayer', otherPlayer);
    if(otherPlayer && !otherPlayerSocket) {
      players.splice(players.indexOf(otherPlayer), 1);
      io.emit('http://localhost:3000/');
    }
    if (otherPlayerSocket) {
      console.log('Received event from client:', from, to, 'sending to', otherPlayerSocket.id);
      otherPlayerSocket.emit('move', { from, to });
    }
  });

  socket.on('opponentWins', ({ board }) => {
    const otherPlayer = players.find((player) => player.id !== socket.id);
    const otherPlayerSocket = otherPlayer && io.sockets.sockets.get(otherPlayer.id);
    if (otherPlayerSocket) {
      otherPlayerSocket.emit('opponentWins', { board });
    }
  });

  socket.on('reload', () => {
    const goalRandomColors = createRandomArray(colorPallet, 9);
    const initialBoard = [...createRandomArray(colorPallet, 24), '#000'];
    const me = findMe(socket);
    const opponent = findOpponent(socket);
    const meSocket = io.sockets.sockets.get(me.id);
    const opponentSocket = io.sockets.sockets.get(opponent.id);
    meSocket.emit('start', { goalRandomColors, initialBoard, opponentUsername: opponent.username });
    opponentSocket.emit('start', { goalRandomColors, initialBoard, opponentUsername: me.username });
    });

  socket.on('disconnect', () => {
    players.splice(players.indexOf(socket.id), 1);
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
