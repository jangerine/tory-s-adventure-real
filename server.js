const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// 게임 상태 관리
let players = {};
let assignedKeys = {};
const availableKeys = ['w', 'a', 's', 'd'];

// 토리 캐릭터 위치 및 상태
let gameState = {
  x: 400,
  y: 300,
  speed: 3,
  direction: { x: 0, y: -1 } // 초기 방향: 위쪽
};

io.on('connection', (socket) => {
  console.log('플레이어 접속:', socket.id);

  // 접속한 플레이어에게 남아있는 키 배정
  const assignedKey = availableKeys.find(key => !Object.values(assignedKeys).includes(key));

  if (assignedKey) {
    assignedKeys[socket.id] = assignedKey;
    socket.emit('assignKey', assignedKey);
  } else {
    socket.emit('assignKey', '관전자 (키 없음)');
  }

  // 플레이어 접속 현황 업데이트
  io.emit('updatePlayers', Object.keys(assignedKeys).length);

  // 키 입력 이벤트 수신
  socket.on('keypress', (key) => {
    if (assignedKeys[socket.id] === key) {
      if (key === 'w') gameState.direction = { x: 0, y: -1 };
      if (key === 's') gameState.direction = { x: 0, y: 1 };
      if (key === 'a') gameState.direction = { x: -1, y: 0 };
      if (key === 'd') gameState.direction = { x: 1, y: 0 };
    }
  });

  // 접속 종료 처리
  socket.on('disconnect', () => {
    console.log('플레이어 나가기:', socket.id);
    delete assignedKeys[socket.id];
    io.emit('updatePlayers', Object.keys(assignedKeys).length);
  });
});

// 게임 루프: 멈추지 않고 계속 이동 및 충돌 체크
setInterval(() => {
  gameState.x += gameState.direction.x * gameState.speed;
  gameState.y += gameState.direction.y * gameState.speed;

  // 벽 충돌 체크 (800x600 캔버스 기준)
  if (gameState.x < 15 || gameState.x > 785 || gameState.y < 15 || gameState.y > 585) {
    // 사망 시 초기화
    gameState.x = 400;
    gameState.y = 300;
    gameState.direction = { x: 0, y: -1 };
    io.emit('gameOver');
  }

  io.emit('gameState', gameState);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
