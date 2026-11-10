
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const fighters = [
  { name: 'VANTA', style: 'STRIKER', stats: [4, 3, 4], color: '#ff7046', accent: '#ffd36e', shape: 0 },
  { name: 'KAIRO', style: 'COUNTERPUNCHER', stats: [3, 4, 4], color: '#69dfd0', accent: '#d8f36a', shape: 1 },
  { name: 'NYX', style: 'TRICKSTER', stats: [3, 5, 3], color: '#b187ff', accent: '#ff78ae', shape: 2 },
  { name: 'BRICK', style: 'HEAVYWEIGHT', stats: [5, 2, 3], color: '#e5b35a', accent: '#ff765d', shape: 3 }
];
const palettes = ['#ff7046', '#69dfd0', '#b187ff', '#e5b35a', '#8fda67'];
const stages = [
  { name: 'NIGHT MARKET', theme: 'NEON DISTRICT', desc: 'AFTER HOURS. NO RULES.', colors: ['#17152a', '#3e2148', '#f77058'], kind: 0 },
  { name: 'IRON YARD', theme: 'INDUSTRIAL ZONE', desc: 'BUILT TO TAKE A HIT.', colors: ['#20232b', '#574536', '#e6a650'], kind: 1 },
  { name: 'SUNSET ROOFTOP', theme: 'ABOVE THE CITY', desc: 'NOWHERE LEFT TO RUN.', colors: ['#26314b', '#984c56', '#f6a56b'], kind: 2 },
  { name: 'FROST TEMPLE', theme: 'THE HIGH NORTH', desc: 'COLD HANDS. CLEAR MIND.', colors: ['#112b3b', '#28616c', '#9de6e8'], kind: 3 }
];
const state = { fighter: 0, opponent: 1, stage: 0, color: 0, ai: 3, rounds: 2, seconds: 60, meter: true, hazards: false, sound: true };
const game = { running: false, over: false, round: 1, wins: [0, 0], time: 60, roundPause: 0, player: null, enemy: null, keys: {}, particles: [], shake: 0, hazardClock: 0, hazardFlash: 0, raf: 0 };
let audioContext = null;
function playTone(freq, duration, type = 'sine') {
  if (!state.sound) return;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const osc = audioContext.createOscillator(), gain = audioContext.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(.055, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration); } catch (_) {}
}
function fitCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect(), w = Math.max(1, rect.width), h = Math.max(1, rect.height), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, w, h };
}
function drawStage(ctx, w, h, stage, time = 0, full = false) {
  if (!stage) return;
  const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, stage.colors[0]); grad.addColorStop(.68, stage.colors[1]); grad.addColorStop(1, '#17171d'); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // Distant skyline and atmospheric lights.
  for (let i = 0; i < 13; i++) { const bw = w / 15, bh = h * (.12 + ((i * 37) % 23) / 100), x = i * w / 12 - bw * .2; ctx.fillStyle = i % 2 ? '#11131bcc' : '#20202bcc'; ctx.fillRect(x, h * .59 - bh, bw, bh); ctx.fillStyle = stage.colors[2]; ctx.globalAlpha = .22 + .18 * Math.sin(time * 2 + i); for (let j = 0; j < 3; j++) ctx.fillRect(x + 7 + j * 13, h * .59 - bh + 10 + (j % 2) * 15, 3, 4); }
  ctx.globalAlpha = 1;
  if (stage.kind === 0) { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ef7e51' : '#69dfd0'; ctx.globalAlpha = .42; ctx.fillRect((i * w / 7 + time * 10) % w, h * .25 + (i % 3) * h * .07, 2, h * .22); } }
  if (stage.kind === 1) { ctx.strokeStyle = '#d6a86a55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w * .12, h * .15); ctx.lineTo(w * .12, h * .56); ctx.lineTo(w * .32, h * .56); ctx.stroke(); ctx.fillStyle = '#e6a65055'; ctx.fillRect(w * .67, h * .26, w * .08, h * .15); }
  if (stage.kind === 2) { ctx.fillStyle = '#f6d990'; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(w * .78, h * .27, h * .08, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (stage.kind === 3) { ctx.fillStyle = '#9de6e822'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * (.1 + i * .2), h * .6); ctx.lineTo(w * (.2 + i * .2), h * .22); ctx.lineTo(w * (.3 + i * .2), h * .6); ctx.fill(); } }
  const floor = h * .81; const floorGrad = ctx.createLinearGradient(0, floor, 0, h); floorGrad.addColorStop(0, '#222129'); floorGrad.addColorStop(1, '#101116'); ctx.fillStyle = floorGrad; ctx.fillRect(0, floor, w, h - floor);
  ctx.strokeStyle = `${stage.colors[2]}66`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, floor); ctx.lineTo(w, floor); ctx.stroke();
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * w * .12, floor); ctx.lineTo(w / 2 + i * w * .3, h); ctx.stroke(); }
  if (full) { ctx.fillStyle = '#fff'; ctx.globalAlpha = .05; ctx.fillRect(0, floor - 1, w, 2); ctx.globalAlpha = 1; }
}
function drawFighter(ctx, x, ground, scale, character, color, facing = 1, pose = 'idle', time = 0) {
  const bob = pose === 'walk' ? Math.sin(time * 12) * 4 : Math.sin(time * 3) * 2, s = scale;
  ctx.save(); ctx.translate(x, ground + bob * s); ctx.scale(facing * s, s);
  ctx.fillStyle = '#090a0d66'; ctx.beginPath(); ctx.ellipse(0, 0, 35, 8, 0, 0, Math.PI * 2); ctx.fill();
  const kickPose = pose === 'kick', attackPose = pose === 'attack', blockPose = pose === 'block', hitPose = pose === 'hit';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Legs, with pose-driven striking silhouette.
  ctx.strokeStyle = '#20232b'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-7, -47); ctx.lineTo(-12, -20); ctx.lineTo(-17, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -47); ctx.lineTo(kickPose ? 37 : 12, kickPose ? -38 : -21); ctx.lineTo(kickPose ? 57 : 18, kickPose ? -37 : -4); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-17, -4); ctx.lineTo(-27, -2); ctx.moveTo(kickPose ? 57 : 18, kickPose ? -37 : -4); ctx.lineTo(kickPose ? 66 : 27, kickPose ? -36 : -2); ctx.stroke();
  // Torso, shoulder armor and arms.
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-17, -89); ctx.lineTo(13, -89); ctx.lineTo(20, -50); ctx.lineTo(11, -43); ctx.lineTo(-13, -43); ctx.lineTo(-21, -54); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#161820'; ctx.fillRect(-10, -70, 20, 7); ctx.fillStyle = character.accent; ctx.fillRect(-8, -68, 16, 3);
  ctx.strokeStyle = '#272a34'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-15, -81); ctx.lineTo(-25, blockPose ? -101 : -66); ctx.lineTo(-31, blockPose ? -108 : -54); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -81); ctx.lineTo(attackPose ? 34 : 24, attackPose ? -84 : -68); ctx.lineTo(attackPose ? 54 : 31, attackPose ? -81 : -55); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(attackPose ? 56 : 33, attackPose ? -82 : -54, 7, 0, Math.PI * 2); ctx.fill();
  // Head, visor and signature crest.
  ctx.fillStyle = '#d9c6b5'; ctx.beginPath(); ctx.arc(hitPose ? -3 : 1, -101, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = character.shape === 1 ? '#1a1d27' : color; ctx.beginPath(); ctx.moveTo(-13, -105); ctx.lineTo(-10, -119 - character.shape * 2); ctx.lineTo(2, -111); ctx.lineTo(13, -116); ctx.lineTo(14, -101); ctx.lineTo(-12, -99); ctx.closePath(); ctx.fill();
  ctx.fillStyle = character.accent; ctx.fillRect(2, -105, 12, 4); ctx.fillStyle = '#11131a'; ctx.fillRect(9, -105, 4, 4);
  if (pose === 'attack') { ctx.strokeStyle = `${color}66`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(40, -82, 21, -.8, .7); ctx.stroke(); }
  ctx.restore();
}
function drawPortrait(canvas, character, color) { const box = fitCanvas(canvas); if (!box) return; const { ctx, w, h } = box; ctx.clearRect(0, 0, w, h); const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#25242e'); g.addColorStop(1, '#111218'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); drawFighter(ctx, w * .5, h * .88, Math.min(w / 120, h / 180), character, color, 1, 'idle', performance.now() / 1000); }
function setActive(buttons, value) { buttons.forEach(button => button.classList.toggle('active', Number(button.dataset.value) === value)); }
function renderBuilder() {
  const player = fighters[state.fighter], rival = fighters[state.opponent], stage = stages[state.stage];
  $('#fighterSelect').innerHTML = fighters.map((f, i) => `<button class="fighter-option ${i === state.fighter ? 'active' : ''}" data-fighter="${i}" aria-pressed="${i === state.fighter}" style="--option-color:${f.color}"><span class="option-mark" style="--fighter-color:${f.color}">${String(i + 1).padStart(2, '0')}</span><span><strong>${f.name}</strong><small>${f.style}</small></span></button>`).join('');
  $('#fighterName').textContent = player.name; $('#fighterStyle').textContent = player.style; $('#callsign').value = player.callSign || player.name;
  $('#fighterStats').innerHTML = ['POWER', 'SPEED', 'RANGE'].map((name, i) => `<div class="stat-row"><span>${name}</span><div class="stat-meter">${Array.from({ length: 5 }, (_, n) => `<i class="${n < player.stats[i] ? 'filled' : ''}"></i>`).join('')}</div><b>${player.stats[i]}</b></div>`).join('');
  $('#swatches').innerHTML = palettes.map((c, i) => `<button class="swatch ${i === state.color ? 'active' : ''}" data-color="${i}" aria-label="Color ${i + 1}" style="--swatch:${c}"></button>`).join('');
  $('#opponentName').textContent = rival.name; $('#opponentStyle').textContent = rival.style; $('#aiLevel').value = state.ai; $('#aiLabel').textContent = ['CHILL', 'CAUTIOUS', 'TACTICAL', 'AGGRESSIVE', 'RELENTLESS'][state.ai - 1];
  $('#stageNumber').textContent = `STAGE ${String(state.stage + 1).padStart(2, '0')} / ${String(stages.length).padStart(2, '0')}`; $('#stageTheme').textContent = stage.theme; $('#stageName').innerHTML = stage.name.replace(' ', '<br/>'); $('#stageDesc').textContent = stage.desc; $('#stageBottomName').textContent = stage.name;
  $('#summaryPlayer').textContent = (player.callSign || player.name).toUpperCase(); $('#summaryOpponent').textContent = rival.name; $('#summaryRounds').textContent = `BEST OF ${state.rounds * 2 - 1}`; $('#summaryTime').textContent = state.seconds === 99 ? '∞ TIME' : `${state.seconds} SEC`; $('#summaryHazards').textContent = state.hazards ? 'HAZARDS ON' : 'CLEAN FIGHT';
  drawPortrait($('#portraitCanvas'), player, palettes[state.color]); drawPortrait($('#opponentCanvas'), rival, rival.color);
  const preview = fitCanvas($('#previewCanvas')); if (preview) drawStage(preview.ctx, preview.w, preview.h, stage, performance.now() / 1000);
  $('#stageDots').innerHTML = stages.map((_, i) => `<button class="stage-dot ${i === state.stage ? 'active' : ''}" data-stage="${i}" aria-label="Stage ${i + 1}"></button>`).join('');
}
function updateHud() {
  if (!game.player || !game.enemy) return;
  $('#playerHealth').style.width = `${Math.max(0, game.player.hp)}%`; $('#opponentHealth').style.width = `${Math.max(0, game.enemy.hp)}%`;
  $('#playerMeter').style.width = `${state.meter ? game.player.meter : 0}%`; $('#opponentMeter').style.width = `${state.meter ? game.enemy.meter : 0}%`;
  $('#hudPlayerName').textContent = (fighters[state.fighter].callSign || fighters[state.fighter].name).toUpperCase(); $('#hudOpponentName').textContent = fighters[state.opponent].name;
  $('#roundReadout').textContent = `ROUND ${game.round}  ·  ${game.wins[0]} — ${game.wins[1]}`;
  $('#roundIndicator').textContent = `ROUND ${game.round}`;
}
function makeCombatant(character, color, isPlayer) { return { character, color, isPlayer, x: isPlayer ? .3 : .7, facing: isPlayer ? 1 : -1, hp: 100, meter: 0, roundDamage: 0, pose: 'idle', poseTime: 0, attackCd: 0, attackDuration: .3, hitStun: 0, hitDone: false, guard: false, walk: 0, aiThink: .15, aiAction: 'approach' }; }
function beginRound() {
  game.time = state.seconds; game.player = makeCombatant(fighters[state.fighter], palettes[state.color], true); game.enemy = makeCombatant(fighters[state.opponent], fighters[state.opponent].color, false); game.particles = []; game.hazardClock = 0;
  $('#fightClock').textContent = state.seconds === 99 ? '∞' : state.seconds; $('#fightMessage').innerHTML = `<span>ROUND ${game.round}</span><b>FIGHT!</b>`; $('#fightMessage').classList.remove('show'); void $('#fightMessage').offsetWidth; $('#fightMessage').classList.add('show'); updateHud();
}
function startMatch() {
  cancelAnimationFrame(game.raf); game.running = true; game.over = false; game.round = 1; game.wins = [0, 0]; game.roundPause = 0; game.keys = {};
  $('#builder').classList.add('hidden'); $('#gameScreen').classList.add('active'); $('#gameScreen').setAttribute('aria-hidden', 'false'); beginRound(); game.last = performance.now(); game.raf = requestAnimationFrame(gameLoop);
}
function stopMatch() { game.running = false; cancelAnimationFrame(game.raf); game.keys = {}; $('#gameScreen').classList.remove('active'); $('#gameScreen').setAttribute('aria-hidden', 'true'); $('#builder').classList.remove('hidden'); renderBuilder(); }
function setupControls() {
  $('#fighterSelect').addEventListener('click', e => { const button = e.target.closest('[data-fighter]'); if (!button) return; state.fighter = Number(button.dataset.fighter); if (state.opponent === state.fighter) state.opponent = (state.fighter + 1) % fighters.length; renderBuilder(); });
  $('#swatches').addEventListener('click', e => { const button = e.target.closest('[data-color]'); if (button) { state.color = Number(button.dataset.color); renderBuilder(); } });
  $('#stageDots').addEventListener('click', e => { const button = e.target.closest('[data-stage]'); if (button) { state.stage = Number(button.dataset.stage); renderBuilder(); } });
  $('#prevStage').addEventListener('click', () => { state.stage = (state.stage + stages.length - 1) % stages.length; renderBuilder(); }); $('#nextStage').addEventListener('click', () => { state.stage = (state.stage + 1) % stages.length; renderBuilder(); });
  $('#swapFighter').addEventListener('click', () => { state.opponent = (state.opponent + 1) % fighters.length; if (state.opponent === state.fighter) state.opponent = (state.opponent + 1) % fighters.length; renderBuilder(); });
  $('#aiLevel').addEventListener('input', e => { state.ai = Number(e.target.value); renderBuilder(); });
  $('#roundOptions').addEventListener('click', e => { const b = e.target.closest('[data-value]'); if (b) { state.rounds = Number(b.dataset.value); setActive($$('#roundOptions [data-value]'), state.rounds); renderBuilder(); } });
  $('#timeOptions').addEventListener('click', e => { const b = e.target.closest('[data-value]'); if (b) { state.seconds = Number(b.dataset.value); setActive($$('#timeOptions [data-value]'), state.seconds); renderBuilder(); } });
  $('#meterToggle').addEventListener('click', e => { state.meter = !state.meter; e.currentTarget.classList.toggle('is-on', state.meter); e.currentTarget.setAttribute('aria-pressed', state.meter); e.currentTarget.querySelector('b').textContent = state.meter ? 'ENABLED' : 'DISABLED'; renderBuilder(); });
  $('#hazardToggle').addEventListener('click', e => { state.hazards = !state.hazards; e.currentTarget.classList.toggle('is-on', state.hazards); e.currentTarget.setAttribute('aria-pressed', state.hazards); e.currentTarget.querySelector('b').textContent = state.hazards ? 'ENABLED' : 'DISABLED'; renderBuilder(); });
  $('#callsign').addEventListener('input', e => { fighters[state.fighter].callSign = e.target.value.trim().slice(0, 14) || fighters[state.fighter].name; $('#fighterName').textContent = fighters[state.fighter].callSign.toUpperCase(); $('#summaryPlayer').textContent = fighters[state.fighter].callSign.toUpperCase(); });
  $('#launchButton').addEventListener('click', startMatch); $('#backButton').addEventListener('click', stopMatch); $('#restartButton').addEventListener('click', startMatch);
  $('#soundToggle').addEventListener('click', e => { state.sound = !state.sound; $('#soundState').textContent = state.sound ? 'ON' : 'OFF'; e.currentTarget.setAttribute('aria-pressed', state.sound); });
  window.addEventListener('resize', () => { if (!game.running) renderBuilder(); });
}
function setGuard(f,on){if(!f||f.hitStun>0)return;f.guard=on;if(on&&f.pose!=='attack'&&f.pose!=='kick')f.pose='block';else if(!on&&f.pose==='block')f.pose='idle'}
function startAttack(f,type){if(!game.running||game.over||game.roundPause>0||f.hitStun>0||f.attackCd>0||f.guard)return;if(type==='special'&&(!state.meter||f.meter<100))return;if(type==='special')f.meter=0;f.attackType=type;f.pose=type==='kick'?'kick':'attack';f.poseTime=0;f.hitDone=false;f.attackCd=type==='special'?.82:type==='kick'?.58:.43;f.attackDuration=type==='special'?.42:.29;playTone(type==='special'?150:type==='kick'?245:330,type==='special'?.25:.07,type==='special'?'sawtooth':'triangle');updateHud()}
function punch(f){startAttack(f,'punch')}function kick(f){startAttack(f,'kick')}function special(f){startAttack(f,'special')}
function spawnImpact(x,y,color,amount=9){for(let i=0;i<amount;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*190;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-35,life:.25+Math.random()*.32,max:.55,color,size:2+Math.random()*4})}}
function hit(attacker,target){const type=attacker.attackType,dist=Math.abs(target.x-attacker.x)*canvasLogicalWidth;const range=(type==='special'?195:type==='kick'?142:112)*Math.max(.7,canvasLogicalHeight/560);if(dist>range||target.hitStun>0)return;
 let damage=type==='special'?30:type==='kick'?12:8;damage*=attacker.character.stats[0]/4;if(target.guard)damage*=.24;
 target.hp=Math.max(0,target.hp-damage);target.roundDamage+=damage;if(!target.guard){target.hitStun=type==='special'?.52:type==='kick'?.32:.25;target.pose='hit';target.guard=false;target.x+=attacker.facing*(type==='special'?27:13)/canvasLogicalWidth;game.shake=type==='special'?11:5;spawnImpact(target.x*canvasLogicalWidth,canvasLogicalHeight*.58,attacker.color,type==='special'?22:10);playTone(type==='special'?95:130,.1,'square')}else{spawnImpact(target.x*canvasLogicalWidth,canvasLogicalHeight*.59,'#d7f0ff',5);playTone(185,.05,'triangle')}
 attacker.meter=Math.min(100,attacker.meter+(type==='special'?0:target.guard?4:damage*.9));if(state.meter)target.meter=Math.min(100,target.meter+(target.guard?3:damage*.58));updateHud();if(target.hp<=0)finishRound(attacker.isPlayer?0:1)
}
function finishRound(winner){if(game.over||game.roundPause>0)return;game.wins[winner]++;game.roundPause=1.8;game.player.guard=false;game.enemy.guard=false;const needed=state.rounds;const won=game.wins[winner]>=needed;if(won){game.over=true;$('#fightMessage').innerHTML=`<span>${winner===0?'RIFT VICTORY':'MATCH OVER'}</span><b>${winner===0?'YOU WIN':'RIVAL WINS'}</b>`;$('#fightMessage').classList.remove('show');void $('#fightMessage').offsetWidth;$('#fightMessage').classList.add('show');showToast(winner===0?'YOU TAKE THE RIFT':'THE RIVAL TAKES IT');playTone(winner===0?620:190,.36,winner===0?'triangle':'sawtooth')}else{$('#fightMessage').innerHTML=`<span>ROUND ${game.round} ${winner===0?'PLAYER':'RIVAL'} TAKES IT</span><b>ROUND ${game.round+1}</b>`;$('#fightMessage').classList.remove('show');void $('#fightMessage').offsetWidth;$('#fightMessage').classList.add('show');playTone(260,.16,'triangle')}}
function showToast(message){const t=$('#matchToast');t.textContent=message;t.classList.add('show')}
let canvasLogicalWidth=800,canvasLogicalHeight=500;
function updateGame(dt){const p=game.player,e=game.enemy;if(!p||!e)return;
 if(game.roundPause>0){game.roundPause-=dt;if(game.roundPause<=0&&!game.over){game.round++;beginRound()}return}
 if(game.over)return;
 game.time-=dt;if(state.seconds!==99){$('#fightClock').textContent=Math.max(0,Math.ceil(game.time));if(game.time<=0){finishRound(p.hp===e.hp?0:p.hp>e.hp?0:1);return}}
 const w=canvasLogicalWidth,h=canvasLogicalHeight,sx=w/900;
 for(const f of [p,e]){f.attackCd=Math.max(0,f.attackCd-dt);f.hitStun=Math.max(0,f.hitStun-dt);if(f.hitStun===0&&f.pose==='hit')f.pose='idle';f.walk=0;if(f.pose==='attack'||f.pose==='kick'){f.poseTime+=dt;if(!f.hitDone&&f.poseTime>=f.attackDuration*.36){f.hitDone=true;hit(f,f===p?e:p)}if(f.poseTime>f.attackDuration){f.pose='idle'}}}
 p.facing=e.x>=p.x?1:-1;e.facing=p.x>=e.x?1:-1;
 // Player movement. Guarding slows retreat and prevents attacking.
 if(p.hitStun===0&&p.pose!=='attack'&&p.pose!=='kick'){
   const left=game.keys.left,right=game.keys.right;let dir=(right?1:0)-(left?1:0);
   if(dir){let back=dir===-p.facing;p.x+=dir*(back?0.34:0.46)*dt*sx;p.walk=1;if(!p.guard)p.pose='walk'}else if(p.pose==='walk')p.pose='idle';
   p.guard=!!game.keys.guard;if(p.guard)p.pose='block';else if(p.pose==='block')p.pose='idle';
 }
 // Reactive CPU: closing pressure scales with the creator's temperament, with occasional feints and guards.
 e.aiThink-=dt;const dist=Math.abs(e.x-p.x)*w,aggr=state.ai/5;
 if(e.hitStun===0&&e.pose!=='attack'&&e.pose!=='kick'){
   if(e.aiThink<=0){e.aiThink=.22+Math.random()*.48-(aggr*.09);const danger=p.pose==='attack'||p.pose==='kick';if(danger&&dist<w*.19&&Math.random()<.12+aggr*.48){e.aiAction='guard';e.guard=true}else{e.guard=false;e.aiAction=dist>w*.19?'approach':Math.random()<(aggr*.22)?'guard':'attack'}}
   if(e.aiAction==='guard'&&dist<w*.22){e.guard=true;if(e.pose!=='attack'&&e.pose!=='kick')e.pose='block'}else if(e.guard){e.guard=false;if(e.pose==='block')e.pose='idle'}
   if(e.aiAction==='approach'&&dist>w*.12){e.x+=e.facing*(.27+aggr*.14)*dt*sx;e.walk=1;if(!e.guard)e.pose='walk'}else if(e.pose==='walk')e.pose='idle';
   if(e.aiAction==='attack'&&dist<w*(.18+aggr*.07)){e.aiAction='';const roll=Math.random();if(state.meter&&e.meter>=100&&roll<aggr*.22)special(e);else if(roll<.48)kick(e);else punch(e)}
 }
 // Soft boundaries and push-apart to avoid visual overlap.
 p.x=Math.max(.07,Math.min(.93,p.x));e.x=Math.max(.07,Math.min(.93,e.x));let gap=e.x-p.x;if(gap<.105){const push=(.105-gap)*.5;p.x-=push;e.x+=push;p.x=Math.max(.06,p.x);e.x=Math.min(.94,e.x)}
 if(state.hazards){game.hazardClock+=dt;if(game.hazardClock>7.5){game.hazardClock=0;game.hazardFlash=1.2;showToast('STAGE HAZARD! WATCH YOUR STEP');playTone(110,.25,'sawtooth');const target=p.x<.18||e.x>.82?(p.x<.18?p:e):Math.random()<.5?p:e;if(!target.guard){target.hp=Math.max(0,target.hp-8);spawnImpact(target.x*w,h*.75,'#ffb34a',14);updateHud();if(target.hp===0)finishRound(target===p?1:0)}}}
 game.hazardFlash=Math.max(0,game.hazardFlash-dt);game.shake=Math.max(0,game.shake-dt*22);
 for(let i=game.particles.length-1;i>=0;i--){let a=game.particles[i];a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=250*dt;a.vx*=.98;if(a.life<=0)game.particles.splice(i,1)}
 updateHud();
}
function renderGame(){const box=fitCanvas($('#gameCanvas'));if(!box)return;let{ctx,w,h}=box;canvasLogicalWidth=w;canvasLogicalHeight=h;const t=performance.now()/1000;ctx.save();if(game.shake){ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake)}drawStage(ctx,w,h,stages[state.stage],t,true);
 if(state.hazards&&game.hazardFlash>0){ctx.globalAlpha=Math.min(.28,game.hazardFlash*.3);ctx.fillStyle='#ff6235';ctx.fillRect(0,h*.6,w,h*.4);ctx.globalAlpha=1}
 const ground=h*.81,scale=Math.max(.63,Math.min(1.14,h/590));
 if(game.player&&game.enemy){let p=game.player,e=game.enemy;drawFighter(ctx,p.x*w,ground,scale,p.character,p.color,p.facing,p.pose,t);drawFighter(ctx,e.x*w,ground,scale,e.character,e.color,e.facing,e.pose,t+1.3)}
 for(const a of game.particles){ctx.globalAlpha=Math.max(0,a.life/a.max);ctx.fillStyle=a.color;ctx.shadowColor=a.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(a.x,a.y,a.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();
}
function gameLoop(now){if(!game.running)return;const dt=Math.min(.035,(now-game.last)/1000||0);game.last=now;updateGame(dt);renderGame();game.raf=requestAnimationFrame(gameLoop)}
function handleAction(key,down){if(!down)return;const p=game.player;if(!p)return;if(key==='punch')punch(p);if(key==='kick')kick(p);if(key==='special')special(p);if(key==='guard')setGuard(p,true)}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowleft','arrowright',' ','arrowup','arrowdown'].includes(key))e.preventDefault();if(key==='a'||key==='arrowleft')game.keys.left=true;if(key==='d'||key==='arrowright')game.keys.right=true;if(key==='l'||key==='arrowdown')game.keys.guard=true;if(!e.repeat){if(key==='j')handleAction('punch',true);if(key==='k')handleAction('kick',true);if(key===' '||key==='spacebar')handleAction('special',true)}});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(key==='a'||key==='arrowleft')game.keys.left=false;if(key==='d'||key==='arrowright')game.keys.right=false;if(key==='l'||key==='arrowdown'){game.keys.guard=false;if(game.player)setGuard(game.player,false)}});
$$('.touch-controls [data-key]').forEach(button=>{const k=button.dataset.key;button.addEventListener('pointerdown',e=>{e.preventDefault();game.keys[k]=true;button.setPointerCapture?.(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,()=>game.keys[k]=false))});
$$('.touch-controls [data-action]').forEach(button=>{const action=button.dataset.action;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);if(action==='block'){game.keys.guard=true;setGuard(game.player,true)}else handleAction(action,true)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,()=>{if(action==='block'){game.keys.guard=false;setGuard(game.player,false)}}))});
window.addEventListener('blur',()=>{game.keys={};if(game.player)setGuard(game.player,false)});
setupControls();renderBuilder();
