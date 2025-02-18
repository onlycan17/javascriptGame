// 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 시간 및 점수 (5분 = 300초)
const gameDuration = 300;
let timeRemaining = gameDuration;
let userScore = 0;
let pcScore = 0;

// 게임 일시정지 및 축하 메시지, 카운트다운 관련 변수
let paused = false;
let celebrationMessage = "";
let celebrationCountdown = 0;
let celebrationInterval = null;

// 파티클 효과 관련 변수
let particles = [];

// 이미지 리소스 로드
const backgroundImage = new Image();
backgroundImage.src = './images/background.jpg';

const goalImage = new Image();
goalImage.src = './images/goal.webp';

const userImage = new Image();
userImage.src = './images/user.png';

const pcImage = new Image();
pcImage.src = './images/pc.png';

// 물리 상수
const gravity = 0.45;
const ballElasticity = 0.8;
const floorY = canvas.height - 50; // 바닥 위치

// 골대 설정 (좌우 측면 아래쪽에 배치)
// 골대 크기: 너비 30px, 높이 150px → 바닥에서 위로 150px 차지
const goalWidth = 30;
const goalHeight = 150;
const leftGoal = {
  x: 0,
  y: floorY - goalHeight,   // 예: 550 - 150 = 400
  width: goalWidth,
  height: goalHeight
};
const rightGoal = {
  x: canvas.width - goalWidth, // 800 - 30 = 770
  y: floorY - goalHeight,       // 400
  width: goalWidth,
  height: goalHeight
};

// 플레이어 설정 (사용자와 PC)
// 좌우로 약간 이동 가능하며, 점프와 강슛 기능 포함
const playerSpeed = 3;
const playerWidth = 90;
const playerHeight = 90;
// 점프 높이를 골대 높이(150px)만큼 날 수 있도록 계산: u = sqrt(2 * g * s)
const jumpForce = -Math.sqrt(2 * gravity * goalHeight);  // 약 -12.25

// 사용자 객체 (왼쪽)
const user = {
  x: 100,
  y: floorY - playerHeight,
  width: playerWidth,
  height: playerHeight,
  speed: playerSpeed,
  dx: 0,         // 수평 이동 속도
  vy: 0,         // 수직 속도
  onGround: true,
  powerShot: false
};

// PC 객체 (오른쪽)
const pc = {
  x: canvas.width - 100 - playerWidth,
  y: floorY - playerHeight,
  width: playerWidth,
  height: playerHeight,
  speed: playerSpeed,
  dx: 0,
  vy: 0,
  onGround: true,
  powerShot: false
};

// 공 객체 (처음에는 중앙 허공에 정지 상태)
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 10,
  vx: 0,
  vy: 0,
  collidedWithUser: false,
  collidedWithPC: false
};

// 원과 사각형의 충돌 여부 판단 함수 (플레이어와 공 충돌 감지)
function circleRectCollision(circle, rect) {
  let distX = Math.abs(circle.x - rect.x - rect.width / 2);
  let distY = Math.abs(circle.y - rect.y - rect.height / 2);
  
  if (distX > (rect.width / 2 + circle.radius)) return false;
  if (distY > (rect.height / 2 + circle.radius)) return false;
  
  if (distX <= (rect.width / 2)) return true;
  if (distY <= (rect.height / 2)) return true;
  
  let dx = distX - rect.width / 2;
  let dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= circle.radius * circle.radius);
}

// 사용자 입력 처리
// 좌우 이동: ArrowLeft, ArrowRight
// 점프: ArrowUp (땅에 있을 때만)
// 강슛: Space (공과 충돌 중일 때 입력하면 강슛 플래그 활성화)
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    user.dx = -user.speed;
  } else if (e.key === 'ArrowRight') {
    user.dx = user.speed;
  } else if (e.key === 'ArrowUp') {
    if (user.onGround) {
      user.vy = jumpForce;
      user.onGround = false;
    }
  } else if (e.code === 'Space') {
    // 공이 사용자와 근접한 경우 (충돌 또는 일정 거리 이내)
    const userCenterX = user.x + user.width / 2;
    const userCenterY = user.y + user.height / 2;
    const dx = ball.x - userCenterX;
    const dy = ball.y - userCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (circleRectCollision(ball, user) || distance < 60) {
      user.powerShot = true;
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    user.dx = 0;
  }
});

// 파티클 효과를 위한 랜덤 색상 함수
function randomColor() {
  const colors = ["red", "orange", "yellow", "lime", "cyan", "magenta", "purple"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 파티클 생성 함수 (축하 이펙트)
function createParticles() {
  particles = [];
  // 파티클 개수 50개 생성
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x: ball.x,
      y: ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 2,
      alpha: 1,
      color: randomColor()
    });
  }
}

// 파티클 업데이트 함수
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.02;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// 파티클 그리기 함수
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// 축하 이펙트 및 5초 후 진행 함수
function celebrateGoal(scoringTeam) {
  paused = true;
  celebrationMessage = `GOAL! ${scoringTeam} SCORE!`;
  celebrationCountdown = 3;
  createParticles();
  
  // 매 초마다 카운트다운 갱신
  celebrationInterval = setInterval(() => {
    celebrationCountdown--;
    if (celebrationCountdown <= 0) {
      clearInterval(celebrationInterval);
      resetBall();
      paused = false;
      celebrationMessage = "";
    }
  }, 1000);
}

// 업데이트 함수: 플레이어, 공의 물리 업데이트 및 충돌, 득점 판정
function update() {
  // --- 사용자(왼쪽) 업데이트 ---
  user.x += user.dx;
  if (user.x < 0) user.x = 0;
  if (user.x + user.width > canvas.width) user.x = canvas.width - user.width;
  
  user.vy += gravity;
  user.y += user.vy;
  if (user.y >= floorY - user.height) {
    user.y = floorY - user.height;
    user.vy = 0;
    user.onGround = true;
  }
  
  // --- PC(오른쪽) 간단 AI 업데이트 ---
  if (ball.x < pc.x + pc.width / 2) {
    pc.dx = -pc.speed;
  } else {
    pc.dx = pc.speed;
  }
  pc.x += pc.dx;
  if (pc.x < canvas.width / 2) pc.x = canvas.width / 2;
  if (pc.x + pc.width > canvas.width) pc.x = canvas.width - pc.width;
  
  if (pc.onGround && ball.y < pc.y && Math.random() < 0.03) {
    pc.vy = jumpForce;
    pc.onGround = false;
    if (Math.random() < 0.5) {
      pc.powerShot = true;
    }
  }
  pc.vy += gravity;
  pc.y += pc.vy;
  if (pc.y >= floorY - pc.height) {
    pc.y = floorY - pc.height;
    pc.vy = 0;
    pc.onGround = true;
  }
  
  // --- 공 업데이트 ---
  ball.vy += gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // 공과 바닥 충돌
  if (ball.y + ball.radius > floorY) {
    ball.y = floorY - ball.radius;
    ball.vy = -ball.vy * ballElasticity;
  }
  // 공과 천장 충돌
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy * ballElasticity;
  }
  
  // --- 좌우 벽(골대) 충돌 및 득점 판정 ---
  if (ball.x - ball.radius < 0) {
    if (ball.y > leftGoal.y && ball.y < leftGoal.y + leftGoal.height) {
      pcScore++;
      celebrateGoal("PC");
      return;
    } else {
      ball.x = ball.radius;
      ball.vx = -ball.vx * ballElasticity;
    }
  }
  if (ball.x + ball.radius > canvas.width) {
    if (ball.y > rightGoal.y && ball.y < rightGoal.y + rightGoal.height) {
      userScore++;
      celebrateGoal("User");
      return;
    } else {
      ball.x = canvas.width - ball.radius;
      ball.vx = -ball.vx * ballElasticity;
    }
  }
  
  // --- 플레이어와 공 충돌 처리 ---
  if (circleRectCollision(ball, user)) {
    if (!ball.collidedWithUser) {
      handlePlayerBallCollision(user, 'user');
      ball.collidedWithUser = true;
    }
  } else {
    ball.collidedWithUser = false;
  }
  
  if (circleRectCollision(ball, pc)) {
    if (!ball.collidedWithPC) {
      handlePlayerBallCollision(pc, 'pc');
      ball.collidedWithPC = true;
    }
  } else {
    ball.collidedWithPC = false;
  }
}

// 플레이어와 공 충돌 시, 공에 충격을 주어 포물선을 그리도록 처리
function handlePlayerBallCollision(player, type) {
  let impulseX = 4;
  const impulseY = -15; // 상향 충격: 공이 더 높이 날아감
  let multiplier;
  if (type === 'user') {
    multiplier = (user.powerShot) ? 3 : 1;
  } else {
    multiplier = (pc.powerShot) ? 2 : 1;
  }
  
  if (type === 'user') {
    impulseX = multiplier * (user.dx !== 0 ? user.dx : (ball.x < user.x + user.width / 2 ? -4 : 4));
    user.powerShot = false;
  } else {
    impulseX = multiplier * (ball.x < pc.x + pc.width / 2 ? -4 : 4);
    pc.powerShot = false;
  }
  
  ball.vx = impulseX;
  ball.vy = impulseY;
}

// 득점 후, 공을 중앙 허공에 정지 상태로 리셋
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  // 파티클 초기화
  particles = [];

  // 사용자와 PC 초기 위치로 리셋
  user.x = 100;
  user.y = floorY - user.height;
  user.dx = 0;
  user.vy = 0;
  user.onGround = true;
  user.powerShot = false;

  pc.x = canvas.width - 100 - pc.width;
  pc.y = floorY - pc.height;
  pc.dx = 0;
  pc.vy = 0;
  pc.onGround = true;
  pc.powerShot = false;
}

// 그리기 함수: 배경, 골대, 플레이어, 공, 점수 및 남은 시간 표시
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 배경 이미지 그리기
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  
  // 골대 사각형 그리기 (원래는 이미지로 그려짐)
  ctx.fillStyle = '#FF0000'; // 왼쪽 골대 (빨간색)
  ctx.fillRect(leftGoal.x, leftGoal.y, leftGoal.width, leftGoal.height);
  
  ctx.fillStyle = '#0000FF'; // 오른쪽 골대 (파란색)
  ctx.fillRect(rightGoal.x, rightGoal.y, rightGoal.width, rightGoal.height);
  
  // 플레이어 이미지 그리기
  ctx.drawImage(userImage, user.x, user.y, user.width, user.height);
  // PC 이미지 그리기
  ctx.drawImage(pcImage, pc.x, pc.y, pc.width, pc.height);
  
  // 공 그리기 (흰색 원)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 파티클 그리기 (축하 이펙트)
  updateParticles();
  drawParticles();
  
  // 점수 및 남은 시간 표시
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`사용자: ${userScore}`, 50, 30);
  ctx.fillText(`PC: ${pcScore}`, canvas.width - 150, 30);
  ctx.fillText(`남은 시간: ${formatTime(timeRemaining)}`, canvas.width / 2 - 60, 30);
  
  // 축하 이펙트 상태라면 중앙에 메시지와 카운트다운 표시
  if (paused && celebrationMessage) {
    ctx.fillStyle = 'orange';
    ctx.font = '50px Arial';
    ctx.fillText(celebrationMessage, canvas.width/2 - ctx.measureText(celebrationMessage).width/2, canvas.height/2 - 30);
    let countdownText = `${celebrationCountdown}초 후 게임 재개...`;
    ctx.font = '40px Arial';
    ctx.fillText(countdownText, canvas.width/2 - ctx.measureText(countdownText).width/2, canvas.height/2 + 30);
  }
}

// 남은 시간을 "분:초" 형식으로 포맷하는 함수
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// 게임 종료 후 승자 메시지 표시 함수
function displayWinner() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  let message = '';
  if (userScore > pcScore) {
    message = '승리했습니다!';
  } else if (pcScore > userScore) {
    message = '패배했습니다!';
  } else {
    message = '비겼습니다!';
  }
  ctx.fillText(message, canvas.width / 2 - ctx.measureText(message).width / 2, canvas.height / 2);
}

// 1초마다 남은 시간 감소
setInterval(() => {
  if (timeRemaining > 0) {
    timeRemaining--;
  }
}, 1000);

// 메인 게임 루프
function gameLoop() {
  if (!paused) {
    update();
  }
  draw();
  if (timeRemaining > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    displayWinner();
  }
}

// 게임 시작
requestAnimationFrame(gameLoop);
