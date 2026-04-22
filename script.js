// Vercel 배포 재시도를 위한 주석 추가
const canvas = document.getElementById('experiment-canvas');
const ctx = canvas.getContext('2d');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');
const currentStepText = document.getElementById('current-step');
const guideText = document.getElementById('guide-text');
const magnet = document.getElementById('magnet');
const infoBox = document.getElementById('info-box');

const btnStartExp = document.getElementById('btn-start-exp');
const introOverlay = document.getElementById('intro-overlay');
const app = document.getElementById('app');

let step = 'START';
let particles = [];
let ironParticles = [];
let effects = []; 
let mouseX = 0, mouseY = 0;
let isMouseDown = false;
let mixProgress = 0;
let crushCount = 0;
let pestleScale = 1.0; 
let gaugeBounce = 0; 
let bowlTargetX = 0; 
const CRUSH_GOAL = 25; 

const bowl = { x: 0, y: 0, radius: 0 };

btnStartExp.onclick = function() {
    introOverlay.style.display = 'none';
    app.classList.remove('hidden');
    app.style.display = 'block';
    resizeCanvas();
    initExperiment();
    step = 'CRUSH';
    currentStepText.innerText = '부수기';
    guideText.innerText = '나무 공이로 시리얼을 꾹꾹 눌러 가루로 만드세요!';
    btnNext.innerText = '물 붓기 단계로';
    btnNext.disabled = true;
    requestAnimationFrame(update);
};

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;
    
    // 캔버스 크기 업데이트
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // 모바일/PC에 따른 보울 위치 최적화
    if (window.innerWidth <= 768) {
        bowl.x = canvas.width / 2;
        bowl.y = canvas.height / 2 + 20;
        bowl.radius = Math.min(canvas.width, canvas.height) * 0.42;
    } else {
        bowl.x = canvas.width / 2 + 60;
        bowl.y = canvas.height / 2 + 25;
        bowl.radius = Math.min(canvas.width, canvas.height) * 0.35;
    }
    bowlTargetX = bowl.x;
}
window.addEventListener('resize', resizeCanvas);

class EffectParticle {
    constructor(x, y, color, type) {
        this.x = x; this.y = y;
        this.size = type === 'confetti' ? Math.random() * 6 + 3 : (type === 'bubble' ? Math.random() * 4 + 2 : Math.random() * 3 + 1);
        this.vx = (Math.random() - 0.5) * (type === 'confetti' ? 12 : 6);
        this.vy = (Math.random() - 0.5) * (type === 'confetti' ? 12 : 6);
        if (type === 'splash') this.vy = -Math.random() * 8;
        if (type === 'bubble') { this.vx *= 0.5; this.vy = -Math.random() * 2 - 1; }
        this.life = 1.0;
        this.color = color;
        this.type = type; 
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.type === 'confetti' || this.type === 'splash') this.vy += 0.25; 
        if (this.type === 'bubble') this.vx += Math.sin(Date.now() / 200) * 0.1;
        this.life -= (this.type === 'dust' || this.type === 'splash') ? 0.05 : (this.type === 'bubble' ? 0.01 : 0.015);
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.beginPath();
        if (this.type === 'confetti') ctx.fillRect(this.x, this.y, this.size, this.size);
        else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            if (this.type === 'bubble') { ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke(); }
            else ctx.fill();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, size, type, snackType) {
        this.x = x; this.y = y; this.size = size; this.type = type;
        this.snackType = snackType !== undefined ? snackType : Math.floor(Math.random() * 3);
        this.rotation = Math.random() * Math.PI * 2;
        this.isAttached = false;
        this.relX = 0; this.relY = 0;
        this.opacity = 1;
        this.color = this.getParticleColor();
        this.isPowder = size < 4;
        if (this.snackType === 1 && !this.isPowder) {
            this.vertices = [];
            for (let i = 0; i < 6; i++) this.vertices.push(0.8 + Math.random() * 0.5);
        }
    }
    getParticleColor() {
        if (this.type === 'iron') return '#111';
        const colors = ['#795548', '#ffca28', '#a1887f'];
        return colors[this.snackType] || '#a1887f';
    }
    draw() {
        if (this.type === 'iron') {
            if (step !== 'EXTRACT' && step !== 'FINISH') return;
            if (!(Math.sqrt((mouseX-this.x)**2 + (mouseY-this.y)**2) < 150 || this.isAttached)) return;
        }
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.globalAlpha = this.opacity;
        if (this.type === 'cereal') {
            ctx.fillStyle = this.color;
            if (this.isPowder) { ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill(); }
            else {
                if (this.snackType === 0) { ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2, true); ctx.fill(); }
                else if (this.snackType === 1) {
                    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i/6)*Math.PI*2; const r = this.size*this.vertices[i]; if(i==0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill();
                } else { ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2); }
            }
        } else {
            ctx.fillStyle = '#212121'; ctx.beginPath(); for(let i=0; i<5; i++) { const a=(i/5)*Math.PI*2; const r=this.size*(0.8+Math.random()*0.4); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    update() {
        if (this.isAttached) { this.x = mouseX + this.relX; this.y = mouseY + this.relY; return; }
        
        const dx_bowl = bowlTargetX - bowl.x;
        if (Math.abs(dx_bowl) > 0.1) this.x += dx_bowl * 0.1;

        if (step === 'MIX' && isMouseDown) {
            const dx = this.x - bowl.x; const dy = this.y - bowl.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < bowl.radius) {
                const angle = Math.atan2(dy, dx);
                const swirlForce = 0.05;
                this.x -= Math.sin(angle) * dist * swirlForce;
                this.y += Math.cos(angle) * dist * swirlForce;
                this.x += (Math.random()-0.5) * 2;
                this.y += (Math.random()-0.5) * 2;
            }
        }

        if (this.type === 'iron' && step === 'EXTRACT') {
            const dx = mouseX - this.x; const dy = mouseY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 80) { 
                const force = Math.min(5, 400 / (dist * dist + 10));
                this.x += (Math.random()-0.5)*2 + dx*force*0.1;
                this.y += (Math.random()-0.5)*2 + dy*force*0.1;
                if (dist < 15) {
                    this.isAttached = true;
                    const side = Math.random() > 0.5 ? 18 : -18;
                    this.relX = side + (Math.random() - 0.5) * 15;
                    this.relY = (Math.random() - 0.5) * 15;
                }
            }
        }

        // [경계선 구속 로직]
        const finalDx = this.x - bowl.x;
        const finalDy = this.y - bowl.y;
        const finalDist = Math.sqrt(finalDx*finalDx + finalDy*finalDy);
        const limit = bowl.radius - this.size - 5;
        if (finalDist > limit) {
            const angle = Math.atan2(finalDy, finalDx);
            this.x = bowl.x + Math.cos(angle) * limit;
            this.y = bowl.y + Math.sin(angle) * limit;
        }
    }
}

function initExperiment() {
    particles = []; ironParticles = []; effects = []; crushCount = 0; mixProgress = 0;
    for (let i = 0; i < 350; i++) {
        const r = Math.sqrt(Math.random()) * (bowl.radius - 25);
        const a = Math.random() * Math.PI * 2;
        particles.push(new Particle(bowl.x + Math.cos(a)*r, bowl.y + Math.sin(a)*r, 8 + Math.random()*6, 'cereal'));
    }
    for (let i = 0; i < 45; i++) {
        const r = Math.sqrt(Math.random()) * (bowl.radius - 35);
        const a = Math.random() * Math.PI * 2;
        ironParticles.push(new Particle(bowl.x + Math.cos(a)*r, bowl.y + Math.sin(a)*r, 1.8, 'iron'));
    }
}

function drawSuccessMessage(msg1, msg2) {
    ctx.save();
    const bx = canvas.width / 2 + 40; const by = 35;
    ctx.fillStyle = '#2e7d32'; ctx.textAlign = 'center'; ctx.font = 'bold 24px Pretendard'; ctx.fillText(msg1, bx, by);
    if (msg2) { ctx.font = 'bold 18px Pretendard'; ctx.fillText(msg2, bx, by + 30); }
    ctx.restore();
}

function drawWaterPouring() {
    if (step !== 'MIX') return;
    ctx.save();
    const isPouring = isMouseDown;
    const angle = isPouring ? -Math.PI / 2.5 : -Math.PI / 10;
    if (isPouring) {
        ctx.beginPath(); ctx.moveTo(mouseX - 25, mouseY + 5); ctx.quadraticCurveTo(mouseX - 35, mouseY + 80, bowl.x, bowl.y);
        ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(135, 206, 235, 0.4)'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mouseX - 25, mouseY + 5); ctx.quadraticCurveTo(mouseX - 35, mouseY + 80, bowl.x, bowl.y);
        ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -Date.now() / 15; ctx.stroke();
        if (Math.random() > 0.3) effects.push(new EffectParticle(bowl.x + (Math.random()-0.5)*60, bowl.y + (Math.random()-0.5)*40, '#81d4fa', 'splash'));
        if (Math.random() > 0.7) effects.push(new EffectParticle(bowl.x + (Math.random()-0.5)*bowl.radius, bowl.y + bowl.radius*0.5, 'rgba(255,255,255,0.5)', 'bubble'));
        const dx = mouseX - bowl.x; const dy = mouseY - bowl.y;
        if (Math.sqrt(dx*dx + dy*dy) < bowl.radius + 150) {
            mixProgress = Math.min(100, mixProgress + 0.6);
            particles.forEach(p => p.opacity = Math.max(0.1, 1 - mixProgress/100));
        }
    }
    ctx.translate(mouseX, mouseY); ctx.rotate(angle);
    ctx.fillStyle = '#e0f7fa'; ctx.fillRect(-22, -45, 44, 90); 
    ctx.fillStyle = 'rgba(135, 206, 235, 0.7)'; ctx.fillRect(-22, 10 - (mixProgress*0.4), 44, 35 + (mixProgress*0.4)); ctx.restore();
    ctx.fillStyle = '#333'; ctx.font = 'bold 16px Pretendard'; ctx.textAlign = 'center';
    ctx.fillText(`물 채우기: ${Math.floor(mixProgress)}%`, canvas.width / 2, canvas.height - 30);
    if (mixProgress >= 100) { drawSuccessMessage('✨ 슬러리 완성! ✨', '이제 철분을 추출해볼까요?'); btnNext.disabled = false; }
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (step === 'FINISH') {
        ctx.save();
        ctx.fillStyle = '#4a90e2'; ctx.font = 'bold 36px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('🎓 시리얼 철분 탐험가', canvas.width/2, canvas.height/2 - 30);
        ctx.fillStyle = '#555'; ctx.font = 'bold 20px Pretendard';
        ctx.fillText('훌륭해요! 철분의 비밀을 모두 알아냈어요!', canvas.width/2, canvas.height/2 + 30);
        ctx.restore();
    } else {
        const dx_bowl = bowlTargetX - bowl.x;
        if (Math.abs(dx_bowl) > 0.1) bowl.x += dx_bowl * 0.1;

        ctx.save();
        ctx.beginPath(); ctx.ellipse(bowl.x, bowl.y + bowl.radius, bowl.radius * 0.8, 20, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fill();
        const bowlGrad = ctx.createRadialGradient(bowl.x-20, bowl.y-20, 10, bowl.x, bowl.y, bowl.radius);
        bowlGrad.addColorStop(0, '#ffffff'); bowlGrad.addColorStop(1, '#f0f0f0');
        ctx.beginPath(); ctx.arc(bowl.x, bowl.y, bowl.radius, 0, Math.PI * 2);
        ctx.fillStyle = bowlGrad; ctx.fill();
        ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 6; ctx.stroke();
        ctx.restore();

        if (step === 'MIX' || step === 'EXTRACT') {
            ctx.save(); ctx.beginPath(); ctx.arc(bowl.x, bowl.y, bowl.radius - 3, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = `rgba(135, 206, 235, ${mixProgress / 180})`; ctx.fill(); 
            ctx.restore();
        }

        particles.forEach(p => { p.update(); p.draw(); });
        if (step === 'EXTRACT') {
            ctx.save(); ctx.beginPath(); ctx.arc(mouseX, mouseY, 80, 0, Math.PI*2); ctx.strokeStyle = 'rgba(64, 196, 255, 0.15)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
            let attachedCount = 0;
            ironParticles.forEach(p => { p.update(); p.draw(); if (p.isAttached) attachedCount++; });
            if (attachedCount >= ironParticles.length * 0.9) {
                drawSuccessMessage('✨ 철분 추출 성공! ✨', '정말 많이 들어있네요! 결과 확인을 누르세요.');
                btnNext.disabled = false;
            }
        }
    }

    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].update(); effects[i].draw();
        if (effects[i].life <= 0) effects.splice(i, 1);
    }

    drawWaterPouring();

    if (step === 'CRUSH') {
        const progress = Math.min(crushCount / CRUSH_GOAL, 1);
        gaugeBounce += (0 - gaugeBounce) * 0.15;
        ctx.save();
        const gx = 30, gy = 60, gw = 40, gh = 280;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(gx - 10, gy - 40, gw + 20, gh + 60); 
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillText('💪', gx + gw/2, gy - 10 - Math.abs(gaugeBounce) * 2);
        ctx.fillStyle = '#f5f5f5'; ctx.fillRect(gx, gy, gw, gh);
        const grad = ctx.createLinearGradient(0, gy + gh, 0, gy); grad.addColorStop(0, '#ff9800'); grad.addColorStop(1, '#ffeb3b');
        ctx.fillStyle = grad; const fillH = gh * progress; ctx.fillRect(gx, gy + (gh - fillH) - (gaugeBounce * 5), gw, fillH + (gaugeBounce * 5));
        ctx.fillStyle = '#555'; ctx.font = 'bold 14px Pretendard'; ctx.fillText(`${Math.floor(progress * 100)}%`, gx + gw/2, gy + gh + 15);
        if (progress >= 1) { drawSuccessMessage('✨ 미션 완료! ✨', '이제 물을 부어볼까요?'); btnNext.disabled = false; }
        ctx.restore();
        pestleScale += (1.0 - pestleScale) * 0.2;
        ctx.save(); ctx.translate(mouseX, mouseY); ctx.scale(pestleScale, pestleScale);
        ctx.fillStyle = '#a1887f'; ctx.fillRect(-8, -80, 16, 80);
        const pGrad = ctx.createRadialGradient(0, 5, 2, 0, 5, 30); pGrad.addColorStop(0, '#8d6e63'); pGrad.addColorStop(1, '#5d4037');
        ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(0, 5, 28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    requestAnimationFrame(update);
}

function handleInputMove(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        // 터치 시 스크롤 방지
        if (step === 'CRUSH' || step === 'MIX' || step === 'EXTRACT') {
            e.preventDefault();
        }
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
    
    if (step === 'EXTRACT') {
        magnet.style.left = `${mouseX}px`;
        magnet.style.top = `${mouseY}px`;
    }
}

function handleInputDown(e) {
    isMouseDown = true;
    handleInputMove(e); // 좌표 업데이트

    if (step === 'CRUSH') {
        const newParts = [];
        let hitAny = false;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 50 && p.size > 2) {
                hitAny = true;
                for (let j = 0; j < 3; j++) {
                    newParts.push(new Particle(p.x + (Math.random() - 0.5) * 15, p.y + (Math.random() - 0.5) * 15, p.size * 0.55, 'cereal', p.snackType));
                }
                if (Math.random() > 0.95) effects.push(new EffectParticle(p.x, p.y, p.color, 'dust'));
                particles.splice(i, 1);
            }
        }
        if (hitAny) {
            crushCount++;
            pestleScale = 0.8;
            gaugeBounce = 2.0;
            if (crushCount === CRUSH_GOAL) {
                for (let i = 0; i < 100; i++) effects.push(new EffectParticle(canvas.width / 2, canvas.height / 2, `hsl(${Math.random() * 360}, 100%, 60%)`, 'confetti'));
            }
        }
        particles.push(...newParts);
    }
}

function handleInputUp() {
    isMouseDown = false;
}

canvas.addEventListener('mousemove', handleInputMove);
canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('mouseup', handleInputUp);

// 터치 이벤트 추가
canvas.addEventListener('touchmove', handleInputMove, { passive: false });
canvas.addEventListener('touchstart', handleInputDown, { passive: false });
canvas.addEventListener('touchend', handleInputUp, { passive: false });

btnNext.addEventListener('click', () => {
    if (step === 'CRUSH') {
        step = 'MIX'; currentStepText.innerText = '물 붓기'; guideText.innerText = '마우스로 물통을 들고 보울에 물을 쏟아부으세요! (마우스 클릭 유지)'; bowlTargetX = canvas.width / 2; btnNext.innerText = '철분 추출 단계로'; btnNext.disabled = true;
    } else if (step === 'MIX') {
        step = 'EXTRACT'; currentStepText.innerText = '철분 추출'; guideText.innerText = '자석을 그릇 위에서 움직여보세요. 숨겨진 철분이 나타납니다!'; magnet.classList.remove('hidden'); btnNext.innerText = '결과 확인';
    } else if (step === 'EXTRACT') {
        step = 'FINISH'; currentStepText.innerText = '실험 완료'; guideText.innerText = '축하합니다! 시리얼 속 철분 찾기 미션을 완수했습니다.';
        particles = []; ironParticles = []; effects = [];
        magnet.classList.add('hidden'); infoBox.classList.remove('hidden'); btnNext.classList.add('hidden');
        for(let i=0; i<150; i++) effects.push(new EffectParticle(canvas.width/2, canvas.height/2, `hsl(${Math.random()*360}, 100%, 60%)`, 'confetti'));
    }
});

btnReset.addEventListener('click', () => location.reload());
