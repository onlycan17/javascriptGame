// 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== 추가: 이미지 및 배경음악 로드 =====
const backgroundImage = new Image();
backgroundImage.src = './images/background.jpg';

const goalImage = new Image();
goalImage.src = './images/goal.webp';

const userImage = new Image();
userImage.src = './images/user.png';

const pcImage = new Image();
pcImage.src = './images/pc.png';

const bgMusic = new Audio('./audio/soccer_music_bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

function startBgMusic() {
  bgMusic.play().catch(error => {
    console.error("배경 음악 재생 실패:", error);
  });
  document.removeEventListener('click', startBgMusic);
  document.removeEventListener('touchstart', startBgMusic);
  document.removeEventListener('keydown', startBgMusic);
}
document.addEventListener('click', startBgMusic);
document.addEventListener('touchstart', startBgMusic);
document.addEventListener('keydown', startBgMusic);
// ===== 끝 =====

// 전역 변수 (게임 상태 및 레이아웃 관련)
let gameDuration = 300; // 5분
let timeRemaining = gameDuration;
let userScore = 0;
let pcScore = 0;

let paused = false;
let celebrationMessage = "";
let celebrationCountdown = 0;
let celebrationInterval = null;
let particles = [];

// 물리 상수
const gravity = 0.45;
const ballElasticity = 0.8;

// 화면 크기에 따라 동적으로 계산되는 값들
let floorY, goalWidth, goalHeight, leftGoal, rightGoal, playerWidth, playerHeight, jumpForce;

// 플레이어 속성 및 객체
let playerSpeed;
let user, pc;

// 공 객체
let ball = {
  x: 0,
  y: 0,
  radius: 10,
  vx: 0,
  vy: 0,
  collidedWithUser: false,
  collidedWithPC: false
};

// 초기 레이아웃 및 변수 설정 함수
function resizeGame() {
  // 캔버스 크기를 창 크기에 맞게 설정
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 바닥 위치 (하단 50px 여유)
  floorY = canvas.height - 50;

  // 골대 크기 (예: 너비 30px, 높이 150px) - 필요에 따라 조정 가능
  goalWidth = 30;
  goalHeight = 150;
  leftGoal = {
    x: 0,
    y: floorY - goalHeight,
    width: goalWidth,
    height: goalHeight
  };
  rightGoal = {
    x: canvas.width - goalWidth,
    y: floorY - goalHeight,
    width: goalWidth,
    height: goalHeight
  };

  // 플레이어 크기 (예: 30px x 60px)
  playerWidth = 30;
  playerHeight = 60;
  playerSpeed = 3;
  // 점프 높이를 골대 높이만큼 날 수 있도록: u = sqrt(2 * g * s)
  jumpForce = -Math.sqrt(2 * gravity * goalHeight);

  // 사용자와 PC 초기 위치 (화면 재설정 시 위치는 중앙 하단 근처로 재조정)
  user = {
    x: 100,
    y: floorY - playerHeight,
    width: playerWidth,
    height: playerHeight,
    speed: playerSpeed,
    dx: 0,
    vy: 0,
    onGround: true,
    powerShot: false
  };
  pc = {
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

  // 공 초기 위치 중앙
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
}

// 초기 실행 및 창 크기 변경 시 호출
resizeGame();
window.addEventListener('resize', resizeGame);

// --- 기존 게임 로직 (터치/키 이벤트, 업데이트, 그리기 등) ---
// (아래 코드는 앞서 작성한 코드와 동일하며, canvas 크기와 관련된 값들은 resizeGame()에서 재계산됨)

// 원과 사각형 충돌 함수
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

// 키보드 입력 (데스크탑 보조)
document.addEventListener('keydown', (e) => {
  console.log("[keydown] key:", e.key);
  if (e.key === 'ArrowLeft') {
    user.dx = -user.speed;
  } else if (e.key === 'ArrowRight') {
    user.dx = user.speed;
  } else if (e.key === 'ArrowUp') {
    if (user.onGround) {
      user.vy = jumpForce;
      user.onGround = false;
      console.log("[keydown] Jump triggered");
    }
  } else if (e.code === 'Space') {
    if (circleRectCollision(ball, user)) {
      user.powerShot = true;
      console.log("[keydown] PowerShot triggered");
    }
  }
});
document.addEventListener('keyup', (e) => {
  console.log("[keyup] key:", e.key);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    user.dx = 0;
  }
});

// 조이스틱 컨트롤 (모바일)
const joystickContainer = document.getElementById('joystickContainer');
const joystickKnob = document.getElementById('joystickKnob');
let joystickActive = false;
function updateJoystick(e) {
  let touch = (e.changedTouches) ? e.changedTouches[0] : e;
  console.log("[updateJoystick]", e.type, "clientX:", touch.clientX, "clientY:", touch.clientY);
  const rect = joystickContainer.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  const dx = x - rect.width / 2;
  const dy = y - rect.height / 2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const maxDistance = rect.width / 2;
  let angle = Math.atan2(dy, dx);
  if(distance > maxDistance) {
    const clampedX = Math.cos(angle) * maxDistance;
    const clampedY = Math.sin(angle) * maxDistance;
    joystickKnob.style.left = (rect.width/2 + clampedX - joystickKnob.offsetWidth/2) + 'px';
    joystickKnob.style.top = (rect.height/2 + clampedY - joystickKnob.offsetHeight/2) + 'px';
  } else {
    joystickKnob.style.left = (x - joystickKnob.offsetWidth/2) + 'px';
    joystickKnob.style.top = (y - joystickKnob.offsetHeight/2) + 'px';
  }
  const threshold = 10;
  if(Math.abs(dx) > threshold) {
    user.dx = (dx / maxDistance) * user.speed;
  } else {
    user.dx = 0;
  }
  console.log("[updateJoystick] dx:", dx, "user.dx:", user.dx);
}
joystickContainer.addEventListener('touchstart', (e) => { 
  e.preventDefault();
  console.log("[joystickContainer] touchstart", e);
  joystickActive = true;
  updateJoystick(e);
}, { passive: false });
joystickContainer.addEventListener('touchmove', (e) => {
  if(joystickActive) {
    e.preventDefault();
    updateJoystick(e);
  }
}, { passive: false });
joystickContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  console.log("[joystickContainer] touchend", e);
  joystickActive = false;
  user.dx = 0;
  joystickKnob.style.left = (joystickContainer.offsetWidth/2 - joystickKnob.offsetWidth/2) + 'px';
  joystickKnob.style.top = (joystickContainer.offsetHeight/2 - joystickKnob.offsetHeight/2) + 'px';
}, { passive: false });
if(window.PointerEvent) {
  joystickContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    console.log("[joystickContainer] pointerdown", e);
    joystickActive = true;
    updateJoystick(e);
  }, { passive: false });
  joystickContainer.addEventListener('pointermove', (e) => {
    if(joystickActive) {
      e.preventDefault();
      updateJoystick(e);
    }
  }, { passive: false });
  joystickContainer.addEventListener('pointerup', (e) => {
    e.preventDefault();
    console.log("[joystickContainer] pointerup", e);
    joystickActive = false;
    user.dx = 0;
    joystickKnob.style.left = (joystickContainer.offsetWidth/2 - joystickKnob.offsetWidth/2) + 'px';
    joystickKnob.style.top = (joystickContainer.offsetHeight/2 - joystickKnob.offsetHeight/2) + 'px';
  }, { passive: false });
}

// 점프 버튼 이벤트 (모바일)
const btnJump = document.getElementById('btnJump');
btnJump.addEventListener('touchstart', (e) => { 
  e.preventDefault();
  console.log("[btnJump] touchstart", e);
  if(user.onGround) {
    user.vy = jumpForce;
    user.onGround = false;
    console.log("[btnJump] Jump triggered via touch");
  }
}, { passive: false });
btnJump.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  console.log("[btnJump] pointerdown", e);
  if(user.onGround) {
    user.vy = jumpForce;
    user.onGround = false;
    console.log("[btnJump] Jump triggered via pointer");
  }
}, { passive: false });
btnJump.addEventListener('mousedown', (e) => {
  console.log("[btnJump] mousedown", e);
  if(user.onGround) {
    user.vy = jumpForce;
    user.onGround = false;
    console.log("[btnJump] Jump triggered via mousedown");
  }
});

// 파티클 함수들 (랜덤 색상, 생성, 업데이트, 그리기)
function randomColor() {
  const colors = ["red", "orange", "yellow", "lime", "cyan", "magenta", "purple"];
  return colors[Math.floor(Math.random() * colors.length)];
}
function createParticles() {
  particles = [];
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
  console.log("[createParticles] particles count:", particles.length);
}
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
  celebrationInterval = setInterval(() => {
    celebrationCountdown--;
    console.log("[celebrateGoal] Countdown:", celebrationCountdown);
    if (celebrationCountdown <= 0) {
      clearInterval(celebrationInterval);
      resetBall();
      paused = false;
      celebrationMessage = "";
      console.log("[celebrateGoal] Celebration ended, game resumed");
    }
  }, 1000);
}

// 업데이트 함수: 플레이어, PC, 공 업데이트 및 충돌, 득점 판정
function update() {
  // 사용자 업데이트
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
  
  // PC 업데이트 (간단 AI)
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
  
  // 공 업데이트
  ball.vy += gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.y + ball.radius > floorY) {
    ball.y = floorY - ball.radius;
    ball.vy = -ball.vy * ballElasticity;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy * ballElasticity;
  }
  if (ball.x - ball.radius < 0) {
    if (ball.y > leftGoal.y && ball.y < leftGoal.y + leftGoal.height) {
      pcScore++;
      console.log("[update] PC scored! Score:", pcScore);
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
      console.log("[update] User scored! Score:", userScore);
      celebrateGoal("User");
      return;
    } else {
      ball.x = canvas.width - ball.radius;
      ball.vx = -ball.vx * ballElasticity;
    }
  }
  
  // 플레이어-공 충돌 처리
  if (circleRectCollision(ball, user)) {
    if (!ball.collidedWithUser) {
      console.log("[update] Collision: User & Ball");
      handlePlayerBallCollision(user, 'user');
      ball.collidedWithUser = true;
    }
  } else {
    ball.collidedWithUser = false;
  }
  if (circleRectCollision(ball, pc)) {
    if (!ball.collidedWithPC) {
      console.log("[update] Collision: PC & Ball");
      handlePlayerBallCollision(pc, 'pc');
      ball.collidedWithPC = true;
    }
  } else {
    ball.collidedWithPC = false;
  }
}

// 플레이어-공 충돌 시 충격 부여
function handlePlayerBallCollision(player, type) {
  const BASE_IMPULSE_X = 4;     // 기본 수평 충격 값
  const BASE_IMPULSE_Y = -15;   // 기본 수직 충격 값
  // powerShot 플래그가 true일 경우 충격 값에 multiplier를 적용 (강슛)
  const multiplier = (player.powerShot) ? 2 : 1;
  let impulseX, impulseY;
  
  if (type === 'user') {
    // 사용자의 현재 이동 방향 (dx)이 있을 경우 그 값을 반영, 없으면 사용자 중심을 기준으로 결정
    impulseX = multiplier * (user.dx !== 0 ? user.dx : (ball.x < user.x + user.width / 2 ? -BASE_IMPULSE_X : BASE_IMPULSE_X));
    // 강슛일 경우 수직 충격도 베이스 값에 multiplier를 곱해 증가시킴
    impulseY = BASE_IMPULSE_Y * multiplier;
    user.powerShot = false;  // 강슛 사용 후 플래그 초기화
  } else {
    // PC의 경우는 기존 방식대로 처리 (강슛 기능이 사용되지 않음)
    impulseX = (ball.x < pc.x + pc.width / 2 ? -BASE_IMPULSE_X : BASE_IMPULSE_X);
    impulseY = BASE_IMPULSE_Y;
    pc.powerShot = false;
  }
  
  ball.vx = impulseX;
  ball.vy = impulseY;
  console.log("[handlePlayerBallCollision]", type, "impulseX:", impulseX, "impulseY:", impulseY, "multiplier:", multiplier);
}

// 득점 후 공과 플레이어 위치 리셋
function resetBall() {
  // 공 초기화
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  
  // 사용자 초기화
  user.x = 100;
  user.y = floorY - user.height;
  user.dx = 0;
  user.vy = 0;
  user.onGround = true;
  user.powerShot = false;
  
  // PC 초기화
  pc.x = canvas.width - 100 - pc.width;
  pc.y = floorY - pc.height;
  pc.dx = 0;
  pc.vy = 0;
  pc.onGround = true;
  pc.powerShot = false;
  
  // 파티클 초기화
  particles = [];
  
  console.log("[resetBall] Game objects reset to initial positions");
}

// 그리기 함수
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 배경 이미지 그리기
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

  // 골대 그리기 (색상 변경)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(leftGoal.x, leftGoal.y, leftGoal.width, leftGoal.height);
  ctx.fillStyle = '#0000FF';
  ctx.fillRect(rightGoal.x, rightGoal.y, rightGoal.width, rightGoal.height);
  
  // 플레이어 이미지 그리기
  ctx.drawImage(userImage, user.x, user.y, user.width, user.height);
  ctx.drawImage(pcImage, pc.x, pc.y, pc.width, pc.height);
  
  // 공 그리기 (흰색 원)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 파티클 업데이트 및 그리기
  updateParticles();
  drawParticles();
  
  // 점수 및 남은 시간 표시
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`사용자: ${userScore}`, 50, 30);
  ctx.fillText(`PC: ${pcScore}`, canvas.width - 150, 30);
  ctx.fillText(`남은 시간: ${formatTime(timeRemaining)}`, canvas.width / 2 - 60, 30);
  
  // 축하 메시지 및 카운트다운 표시
  if (paused && celebrationMessage) {
    ctx.fillStyle = 'orange';
    ctx.font = '50px Arial';
    ctx.fillText(celebrationMessage, canvas.width/2 - ctx.measureText(celebrationMessage).width/2, canvas.height/2 - 30);
    let countdownText = `Restarting in ${celebrationCountdown}...`;
    ctx.font = '40px Arial';
    ctx.fillText(countdownText, canvas.width/2 - ctx.measureText(countdownText).width/2, canvas.height/2 + 30);
  }
}

// 포맷 함수
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// 게임 종료 후 승자 메시지
function displayWinner() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  let message = (userScore > pcScore) ? '승리했습니다!' : (pcScore > userScore) ? '패배했습니다!' : '비겼습니다!';
  ctx.fillText(message, canvas.width/2 - ctx.measureText(message).width/2, canvas.height/2);
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
requestAnimationFrame(gameLoop);

// 전체 화면 모드 전환 및 오버레이 숨김을 위한 함수
function startGame() {
  try {
    // Fullscreen API로 전체 화면 요청 (브라우저마다 벤더 프리픽스가 있을 수 있으므로 고려)
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) { // Safari
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { // IE11
      document.documentElement.msRequestFullscreen();
    }
    // 오버레이 숨기기
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    console.log("[startGame] 전체 화면 모드로 전환 시도됨");
  } catch (error) {
    console.error("전체 화면 모드 전환 중 오류 발생:", error);
    alert("전체 화면 모드 전환에 실패했습니다. 브라우저 설정을 확인해주세요.");
  }
}

// DOMContentLoaded 이벤트에서 오버레이에 클릭 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('fullscreenOverlay');
  if (overlay) {
    overlay.addEventListener('click', startGame);
  }
});
