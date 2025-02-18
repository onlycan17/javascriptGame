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
  document.addEventListener('keydown', startBgMusic);
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
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  floorY = window.innerHeight - 50;

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
    x: window.innerWidth - goalWidth,
    y: floorY - goalHeight,
    width: goalWidth,
    height: goalHeight
  };

  // 플레이어 크기 (예: 90px x 90px)
  playerWidth = 90;
  playerHeight = 90;
  playerSpeed = 3;
  // 점프 높이를 골대 높이만큼 날 수 있도록: u = sqrt(2 * g * s)
  jumpForce = -Math.sqrt(2 * gravity * goalHeight);

  // 사용자와 PC 초기 위치 (화면 재설정 시 논리 좌표 기준)
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
    x: window.innerWidth - 100 - playerWidth,
    y: floorY - playerHeight,
    width: playerWidth,
    height: playerHeight,
    speed: playerSpeed,
    dx: 0,
    vy: 0,
    onGround: true,
    powerShot: false
  };

  // 공 초기 위치 중앙 (논리 좌표 기준)
  ball.x = window.innerWidth / 2;
  ball.y = window.innerHeight / 2;
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
function update(dt) {
  // 사용자 업데이트
  user.x += user.dx * dt;
  if (user.x < 0) user.x = 0;
  if (user.x + user.width > window.innerWidth) user.x = window.innerWidth - user.width;
  user.vy += gravity * dt;
  user.y += user.vy * dt;
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
  pc.x += pc.dx * dt;
  if (pc.x < window.innerWidth / 2) pc.x = window.innerWidth / 2;
  if (pc.x + pc.width > window.innerWidth) pc.x = window.innerWidth - pc.width;
  if (pc.onGround && ball.y < pc.y && Math.random() < 0.03) {
    pc.vy = jumpForce;
    pc.onGround = false;
    if (Math.random() < 0.5) {
      pc.powerShot = true;
    }
  }
  pc.vy += gravity * dt;
  pc.y += pc.vy * dt;
  if (pc.y >= floorY - pc.height) {
    pc.y = floorY - pc.height;
    pc.vy = 0;
    pc.onGround = true;
  }
  
  // 공 업데이트
  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
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
  if (ball.x + ball.radius > window.innerWidth) {
    if (ball.y > rightGoal.y && ball.y < rightGoal.y + rightGoal.height) {
      userScore++;
      console.log("[update] User scored! Score:", userScore);
      celebrateGoal("User");
      return;
    } else {
      ball.x = window.innerWidth - ball.radius;
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
  ball.x = window.innerWidth / 2;
  ball.y = window.innerHeight / 2;
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
  pc.x = window.innerWidth - 100 - pc.width;
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
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  
  // 배경 이미지 그리기 (논리 해상도 기준)
  ctx.drawImage(backgroundImage, 0, 0, window.innerWidth, window.innerHeight);

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
  ctx.fillText(`PC: ${pcScore}`, window.innerWidth - 150, 30);
  ctx.fillText(`남은 시간: ${formatTime(timeRemaining)}`, window.innerWidth / 2 - 60, 30);
  
  // 축하 메시지 및 카운트다운 표시
  if (paused && celebrationMessage) {
    ctx.fillStyle = 'orange';
    ctx.font = '50px Arial';
    ctx.fillText(celebrationMessage, window.innerWidth/2 - ctx.measureText(celebrationMessage).width/2, window.innerHeight/2 - 30);
    let countdownText = `Restarting in ${celebrationCountdown}...`;
    ctx.font = '40px Arial';
    ctx.fillText(countdownText, window.innerWidth/2 - ctx.measureText(countdownText).width/2, window.innerHeight/2 + 30);
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
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  let message = (userScore > pcScore) ? '승리했습니다!' : (pcScore > userScore) ? '패배했습니다!' : '비겼습니다!';
  ctx.fillText(message, window.innerWidth/2 - ctx.measureText(message).width/2, window.innerHeight/2);
}

// 1초마다 남은 시간 감소
setInterval(() => {
  if (timeRemaining > 0) {
    timeRemaining--;
  }
}, 1000);

// 메인 게임 루프 (프레임 독립적 업데이트를 위해 deltaTime 사용)
let lastTime = performance.now();
function gameLoop(timestamp) {
  // 60fps 기준 16.67ms당 1단위 dt 값
  let dt = (timestamp - lastTime) / 16.67;
  lastTime = timestamp;
  if (!paused) {
    update(dt);
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

// ===== 신규 추가: 모바일 터치 이벤트 (조이스틱 및 점프 버튼) =====
const joystickContainer = document.getElementById('joystickContainer');
const joystickKnob = document.getElementById('joystickKnob');
const btnJump = document.getElementById('btnJump');

let joystickActive = false;
let joystickStartX = 0, joystickStartY = 0;

if (joystickContainer && joystickKnob) {
  // 조이스틱 터치 시작
  joystickContainer.addEventListener('touchstart', (e) => {
    e.preventDefault(); // 기본 터치 동작 방지
    joystickActive = true;
    const touch = e.touches[0];
    const rect = joystickContainer.getBoundingClientRect();
    // 조이스틱 컨테이너 중심 좌표 계산
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
  });
  
  // 조이스틱 터치 이동
  joystickContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystickActive) return;
    const touch = e.touches[0];
    let offsetX = touch.clientX - joystickStartX;
    let offsetY = touch.clientY - joystickStartY;
    const maxDistance = joystickContainer.offsetWidth / 2;
    
    // 최대 이동 거리 제한
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      offsetX *= ratio;
      offsetY *= ratio;
    }
    
    // 조이스틱 노브 이동 반영
    joystickKnob.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    
    // 수평 이동만 적용하여 사용자 이동 제어 (좌우 이동)
    if (offsetX < -10) {
      user.dx = -user.speed;
    } else if (offsetX > 10) {
      user.dx = user.speed;
    } else {
      user.dx = 0;
    }
  });
  
  // 조이스틱 터치 종료
  joystickContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystickActive = false;
    joystickKnob.style.transform = 'translate(0, 0)';
    user.dx = 0;
  });
}

if (btnJump) {
  // 점프 버튼 터치 이벤트
  btnJump.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (user.onGround) {
      user.vy = jumpForce;
      user.onGround = false;
    }
  });
}
// ===== 종료 =====

// 페이지 로드 후 터치 이벤트로 전체 화면 요청 (지원하는 브라우저에서만 동작)
document.body.addEventListener("touchstart", function() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error("전체 화면 전환 오류:", err);
    });
  }
});
