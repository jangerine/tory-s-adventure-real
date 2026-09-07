const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// 방(Room) 데이터 저장소
// rooms[roomId] = { players: { socketId: { key } }, gameState: { ... }, keys: [...] }
const rooms = {};

// 랜덤 방 코드 생성 (4자리 영문 대문자)
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  let currentRoom = null;

  // 1. 방 만들기
  socket.on('createRoom', () => {
    const roomId = generateRoomCode();
    rooms[roomId] = {
      players: {},
      availableKeys: ['w', 'a', 's', 'd'],
      gameState: { x: 400, y: 300, speed: 3, direction: { x: 0, y: -1 } }
    };

    joinRoom(socket, roomId);
  });

  // 2. 방 참가가 (방 코드 입력)
  socket.on('joinRoom', (roomId) => {
    roomId = roomId.toUpperCase();
    if (rooms[roomId]) {
      joinRoom(socket, roomId);
    } else {
      socket.emit('errorMsg', '존재하지 않는 방 코드입니다.');
    }
  });

  // 방 입장 내부 로직
  function joinRoom(sock, roomId) {
    const room = rooms[roomId];
    
    // 이미 4명이 찬 경우
    if (Object.keys(room.players).length >= 4) {
      sock.emit('errorMsg', '방이 가득 찼습니다. (최대 4명)');
      return;
    }

    currentRoom = roomId;
    sock.join(roomId);

    // 남아있는 키 배정
    const assignedKey = room.availableKeys.shift();
    room.players[sock.id] = { key: assignedKey };

    // 클라이언트에 방 입장 완료 알림
    sock.emit('roomJoined', { roomId, assignedKey });

    // 해당 방 전체 인원에게 접속자 수 알림
    io.to(roomId).emit('updatePlayers', Object.keys(room.players).length);
  }

  // 3. 키 입력 이벤트
  socket.on('keypress', (key) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players[socket.id];

    if (player && player.key === key) {
      if (key === 'w') room.gameState.direction = { x: 0, y: -1 };
      if (key === 's') room.gameState.direction = { x: 0, y: 1 };
      if (key === 'a') room.gameState.direction = { x: -1, y: 0 };
      if (key === 'd') room.gameState.direction = { x: 1, y: 0 };
    }
  });

  // 4. 퇴장 및 접속 종료
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      const room = rooms[currentRoom];
      const player = room.players[socket.id];

      if (player) {
        // 사용하던 키 반납
        room.availableKeys.push(player.key);
        delete room.players[socket.id];
      }

      // 방에 아무도 없으면 방 삭제
      if (Object.keys(room.players).length === 0) {
        delete rooms[currentRoom];
      } else {
        io.to(currentRoom).emit('updatePlayers', Object.keys(room.players).length);
      }
    }
  });
});

// 60FPS 방별 게임 루프
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    const state = room.gameState;

    // 움직임 계산
    state.x += state.direction.x * state.speed;
    state.y += state.direction.y * state.speed;

    // 벽 충돌 체크
    if (state.x < 15 || state.x > 785 || state.y < 15 || state.y > 585) {
      state.x = 400;
      state.y = 300;
      state.direction = { x: 0, y: -1 };
      io.to(roomId).emit('gameOver');
    }

    io.to(roomId).emit('gameState', state);
  }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
