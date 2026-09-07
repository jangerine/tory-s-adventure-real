const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const playerCountEl = document.getElementById('player-count');
const myKeyEl = document.getElementById('my-key');

let myKey = null;

// 내 담당 키 받기
socket.on('assignKey', (key) => {
  myKey = key;
  myKeyEl.textContent = key;
});

// 접속자 수 업데이트
socket.on('updatePlayers', (count) => {
  playerCountEl.textContent = count;
});

// 키 입력 시 서버로 전송
window.addEventListener('keydown', (e) => {
  if (!myKey) return;
  const key = e.key.toLowerCase();
  if (key === myKey) {
    socket.emit('keypress', key);
  }
});

// 서버로부터 실시간 게임 상태 받아오기 및 그려주기
socket.on('gameState', (state) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 테두리 위험 구간 표시
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // 다람쥐 '토리' 그리기 (주황색 원으로 표현)
  ctx.beginPath();
  ctx.arc(state.x, state.y, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#ffca3a';
  ctx.fill();
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.closePath();
});

// 게임 오버 처리
socket.on('gameOver', () => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#ff595e';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('벽에 부딪혔습니다! 다시 시작합니다.', canvas.width / 2, canvas.height / 2);
});
