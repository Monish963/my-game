/**
 * ============================================================================
 * Space Strike - Neon Arcade Shooter Engine
 * Pure Vanilla JavaScript (No External Libraries)
 *
 * Architecture:
 * - Delta-time based 60+ FPS game loop
 * - Web Audio API procedural sound synthesizer (Lasers, Explosions, Power-ups, Boss Sirens)
 * - Full bullet & weapon upgrade system (Single, Double, Triple, Quad spread)
 * - Power-up drops: 🟢 Green (Fire Speed), 🔵 Blue (Thrust), 🟣 Purple (Cannons), 🟡 Gold (Shield/Life)
 * - Enemy armada with diverse HP, sizes, hit-flashing, and point rewards
 * - Dynamic Mothership Boss battles with top HUD health bar and energy attacks
 * - Health/Lives & Energy Shield protection system
 * - Responsive desktop (Keyboard A/D/Arrows, Mouse) and mobile touch controls
 * ============================================================================
 */

(() => {
  "use strict";

  /* ==========================================================================
     1. Game Configuration & Tuning
     ========================================================================== */
  const CONFIG = {
    WIDTH: 600,
    HEIGHT: 850,

    // Player default stats
    BASE_PLAYER_SPEED: 400,
    MAX_PLAYER_SPEED: 650,
    PLAYER_RADIUS: 20,
    INITIAL_LIVES: 3,
    MAX_LIVES: 5,
    INVULNERABLE_DURATION: 1.8, // Seconds of invincibility after getting hit

    // Fire & Weapon system
    BASE_FIRE_COOLDOWN: 0.28,   // Seconds between shots initially
    MIN_FIRE_COOLDOWN: 0.10,    // Fastest possible rapid-fire cooldown
    BULLET_SPEED: 820,
    BULLET_RADIUS: 4,

    // Enemy spawn & progression
    INITIAL_SPAWN_INTERVAL: 1.15,
    MIN_SPAWN_INTERVAL: 0.35,
    BASE_ENEMY_SPEED: 180,
    BOSS_SCORE_TRIGGER: 500,     // Every 500 points spawns a Boss!

    // Power-up drops
    DROP_CHANCE: 0.35,          // 35% chance an enemy drops a power-up
    DROP_SPEED: 140,
    DROP_RADIUS: 14,

    // LocalStorage key
    STORAGE_KEY: "space_strike_highscore_v2"
  };

  /* ==========================================================================
     2. Web Audio API Procedural Synthesizer
     ========================================================================== */
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.initialized = true;
        }
      } catch (err) {
        console.warn("Web Audio API not supported:", err);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    // UI Click
    playClick() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    // Sci-fi Laser Pew
    playLaser() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    // Metallic hit impact
    playHit() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }

    // Power-up pickup chime
    playPowerUp(type) {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const freqs = {
        green: [523.25, 659.25, 783.99],   // C, E, G
        blue: [440.00, 554.37, 659.25],    // A, C#, E
        purple: [587.33, 739.99, 880.00],  // D, F#, A
        gold: [523.25, 659.25, 783.99, 1046.50] // C major chord arpeggio
      }[type] || [523, 659, 783];

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    }

    // Shield Break
    playShieldBreak() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    // Enemy explosion
    playExplosion(isLarge = false) {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const duration = isLarge ? 0.6 : 0.35;

      // Noise buffer
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isLarge ? 900 : 1400, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isLarge ? 0.35 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration + 0.05);
    }

    // Boss Warning Siren
    playBossWarning() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.linearRampToValueAtTime(750, now + 0.3);
      osc.frequency.linearRampToValueAtTime(350, now + 0.6);
      osc.frequency.linearRampToValueAtTime(750, now + 0.9);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.15);
    }

    // High score fanfare
    playNewRecord() {
      if (this.muted || !this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.07, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.28);
      });
    }
  }

  /* ==========================================================================
     3. Starfield Parallax Background
     ========================================================================== */
  class Starfield {
    constructor(count, width, height) {
      this.width = width;
      this.height = height;
      this.stars = [];

      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 80 + 35,
          alpha: Math.random() * 0.7 + 0.3,
          color: Math.random() > 0.8 ? "#00f3ff" : (Math.random() > 0.9 ? "#ff007f" : "#ffffff")
        });
      }
    }

    update(dt, speedMultiplier) {
      const warp = 1 + (speedMultiplier - 1) * 0.7;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.y += s.speed * warp * dt;
        if (s.y > this.height) {
          s.y = 0;
          s.x = Math.random() * this.width;
          s.alpha = Math.random() * 0.7 + 0.3;
        }
      }
    }

    draw(ctx, speedMultiplier) {
      ctx.save();
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        const stretch = speedMultiplier > 1.3 ? s.size * (1 + (speedMultiplier - 1) * 2) : s.size;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.size * 0.7, stretch, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     4. Bullet Class (Bottom-to-Top firing)
     ========================================================================== */
  class Bullet {
    constructor(x, y, vx = 0, vy = -CONFIG.BULLET_SPEED, isEnemy = false) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = CONFIG.BULLET_RADIUS;
      this.isEnemy = isEnemy;
      this.color = isEnemy ? "#ff0055" : "#00f3ff";
      this.alive = true;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.y < -20 || this.y > CONFIG.HEIGHT + 20 || this.x < -20 || this.x > CONFIG.WIDTH + 20) {
        this.alive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (this.isEnemy) {
        // Red enemy plasma ball
        ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      } else {
        // Player laser projectile
        ctx.ellipse(this.x, this.y, this.radius * 0.8, this.radius * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     5. Power-up Drop Entity (🟢 Green, 🔵 Blue, 🟣 Purple, 🟡 Gold)
     ========================================================================== */
  class PowerUp {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // "green", "blue", "purple", "gold"
      this.radius = CONFIG.DROP_RADIUS;
      this.speed = CONFIG.DROP_SPEED;
      this.vy = this.speed * (0.8 + Math.random() * 0.4);
      this.vx = (Math.random() - 0.5) * 40;
      this.rotation = 0;
      this.alive = true;

      // Color & glow setup
      this.colors = {
        green: { hex: "#00ff66", label: "SPEED" },
        blue: { hex: "#0088ff", label: "THRUST" },
        purple: { hex: "#b026ff", label: "CANNON" },
        gold: { hex: "#ffd700", label: "SHIELD" }
      }[this.type];
    }

    update(dt) {
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.rotation += 2.5 * dt;

      // Gently bounce on walls
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx);
      } else if (this.x + this.radius > CONFIG.WIDTH) {
        this.x = CONFIG.WIDTH - this.radius;
        this.vx = -Math.abs(this.vx);
      }

      if (this.y > CONFIG.HEIGHT + 40) {
        this.alive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Pulsing outer glow ring
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
      ctx.shadowColor = this.colors.hex;
      ctx.shadowBlur = 14 * pulse;

      // Outer diamond / circle
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
      ctx.fill();
      ctx.strokeStyle = this.colors.hex;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Rotating inner symbol
      ctx.rotate(this.rotation);
      ctx.beginPath();
      ctx.rect(-5, -5, 10, 10);
      ctx.fillStyle = this.colors.hex;
      ctx.fill();

      ctx.restore();
    }
  }

  /* ==========================================================================
     6. Particle & Floating Text FX System
     ========================================================================== */
  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.shockwaves = [];
      this.floatingTexts = [];
    }

    // Engine flame trail
    emitThruster(x, y, vx) {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y,
          vx: vx * 0.15 + (Math.random() - 0.5) * 30,
          vy: Math.random() * 120 + 80,
          size: Math.random() * 3.5 + 2,
          life: 1.0,
          decay: Math.random() * 2.5 + 2.0,
          color: Math.random() > 0.4 ? "#00f3ff" : "#ffaa00"
        });
      }
    }

    // Explosion sparks & shockwave
    emitExplosion(x, y, color = "#ff007f", count = 35) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 280 + 50;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 5 + 2,
          life: 1.0,
          decay: Math.random() * 1.6 + 0.8,
          color: [color, "#ffffff", "#ffaa00", "#00f3ff"][Math.floor(Math.random() * 4)]
        });
      }

      this.shockwaves.push({
        x: x,
        y: y,
        radius: 6,
        maxRadius: count > 40 ? 120 : 65,
        speed: 220,
        life: 1.0,
        color: color
      });
    }

    // Floating combat text (+RAPID FIRE, +DOUBLE SHOT, +100)
    addFloatingText(x, y, text, color = "#00f3ff") {
      this.floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        vy: -55,
        life: 1.0,
        decay: 1.1
      });
    }

    update(dt) {
      // Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      // Shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += sw.speed * dt;
        sw.life = 1.0 - (sw.radius / sw.maxRadius);
        if (sw.radius >= sw.maxRadius || sw.life <= 0) this.shockwaves.splice(i, 1);
      }

      // Floating Texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= ft.decay * dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    draw(ctx) {
      ctx.save();
      // Particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shockwaves
      for (let i = 0; i < this.shockwaves.length; i++) {
        const sw = this.shockwaves[i];
        ctx.globalAlpha = Math.max(0, sw.life * 0.8);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3.5 * sw.life;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating Texts
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = "bold 13px 'Consolas', monospace";
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }

    clear() {
      this.particles = [];
      this.shockwaves = [];
      this.floatingTexts = [];
    }
  }

  /* ==========================================================================
     7. Player Interceptor Entity
     ========================================================================== */
  class Player {
    constructor(x, y) {
      this.initialX = x;
      this.initialY = y;
      this.reset();
    }

    reset() {
      this.x = this.initialX;
      this.y = this.initialY;
      this.vx = 0;
      this.radius = CONFIG.PLAYER_RADIUS;
      this.tilt = 0;
      this.alive = true;

      // Combat & Upgrade Stats
      this.lives = CONFIG.INITIAL_LIVES;
      this.hasShield = false;
      this.weaponLevel = 1;       // 1 = single, 2 = double, 3 = triple, 4 = quad
      this.fireSpeedLevel = 1;    // 1 to 4 (Green drop increases this)
      this.thrustSpeedLevel = 1;  // 1 to 4 (Blue drop increases this)
      this.speed = CONFIG.BASE_PLAYER_SPEED;
      this.fireCooldown = CONFIG.BASE_FIRE_COOLDOWN;
      this.fireTimer = 0;

      // Invulnerability state
      this.invulnerableTimer = 0;
    }

    // Apply Upgrades
    upgradeWeapon() {
      if (this.weaponLevel < 4) {
        this.weaponLevel++;
      }
    }

    upgradeFireSpeed() {
      if (this.fireSpeedLevel < 4) {
        this.fireSpeedLevel++;
        this.fireCooldown = Math.max(
          CONFIG.MIN_FIRE_COOLDOWN,
          CONFIG.BASE_FIRE_COOLDOWN - (this.fireSpeedLevel - 1) * 0.055
        );
      }
    }

    upgradeThrustSpeed() {
      if (this.thrustSpeedLevel < 4) {
        this.thrustSpeedLevel++;
        this.speed = Math.min(
          CONFIG.MAX_PLAYER_SPEED,
          CONFIG.BASE_PLAYER_SPEED + (this.thrustSpeedLevel - 1) * 75
        );
      }
    }

    grantShieldOrLife() {
      this.hasShield = true;
      if (this.lives < CONFIG.MAX_LIVES) {
        this.lives++;
      }
    }

    takeHit() {
      if (this.invulnerableTimer > 0) return false;

      if (this.hasShield) {
        this.hasShield = false;
        this.invulnerableTimer = 1.2;
        return "shield_absorbed";
      }

      this.lives--;
      this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;

      if (this.lives <= 0) {
        this.alive = false;
        return "destroyed";
      }
      return "damaged";
    }

    update(dt, input, particles, bullets, sound) {
      if (!this.alive) return;

      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }

      // Horizontal Left-Right steering
      let moveX = 0;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;

      // Mouse / Touch pointer control
      if (input.pointerActive) {
        const dx = input.pointerX - this.x;
        if (Math.abs(dx) > 6) {
          const targetVx = Math.sign(dx) * Math.min(Math.abs(dx) * 12, this.speed);
          this.vx += (targetVx - this.vx) * 14 * dt;
        } else {
          this.vx *= 0.7;
        }
      } else {
        this.vx = moveX * this.speed;
      }

      this.x += this.vx * dt;

      // Dynamic banking tilt
      const targetTilt = (this.vx / this.speed) * 0.45;
      this.tilt += (targetTilt - this.tilt) * 10 * dt;

      // Clamping inside horizontal screen bounds
      const padding = this.radius + 12;
      this.x = Math.max(padding, Math.min(CONFIG.WIDTH - padding, this.x));

      // Thruster exhaust particles
      particles.emitThruster(this.x, this.y + 20, this.vx);

      // Automatic Bottom-to-Top Cannon Firing
      this.fireTimer += dt;
      if (this.fireTimer >= this.fireCooldown) {
        this.fireTimer = 0;
        this.shoot(bullets, sound);
      }
    }

    shoot(bullets, sound) {
      sound.playLaser();
      const noseY = this.y - 24;

      switch (this.weaponLevel) {
        case 1:
          // Single center cannon
          bullets.push(new Bullet(this.x, noseY, 0, -CONFIG.BULLET_SPEED));
          break;
        case 2:
          // Dual wing cannons
          bullets.push(new Bullet(this.x - 12, this.y, 0, -CONFIG.BULLET_SPEED));
          bullets.push(new Bullet(this.x + 12, this.y, 0, -CONFIG.BULLET_SPEED));
          break;
        case 3:
          // Triple spread cannons
          bullets.push(new Bullet(this.x, noseY, 0, -CONFIG.BULLET_SPEED));
          bullets.push(new Bullet(this.x - 14, this.y, -140, -CONFIG.BULLET_SPEED * 0.96));
          bullets.push(new Bullet(this.x + 14, this.y, 140, -CONFIG.BULLET_SPEED * 0.96));
          break;
        case 4:
        default:
          // Quad heavy spread
          bullets.push(new Bullet(this.x - 8, noseY, 0, -CONFIG.BULLET_SPEED));
          bullets.push(new Bullet(this.x + 8, noseY, 0, -CONFIG.BULLET_SPEED));
          bullets.push(new Bullet(this.x - 18, this.y, -180, -CONFIG.BULLET_SPEED * 0.95));
          bullets.push(new Bullet(this.x + 18, this.y, 180, -CONFIG.BULLET_SPEED * 0.95));
          break;
      }
    }

    draw(ctx) {
      if (!this.alive) return;

      // Flash when invulnerable after taking damage
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        return;
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.tilt);

      // Glowing Energy Shield if active
      if (this.hasShield) {
        ctx.save();
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
        ctx.strokeStyle = "#ffd700";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, (this.radius + 12) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 215, 0, 0.12)";
        ctx.fill();
        ctx.restore();
      }

      // Neon Interceptor Fuselage
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(0, -26);           // Nose tip
      ctx.lineTo(20, 16);           // Right wing tip
      ctx.lineTo(9, 12);            // Right inner wing
      ctx.lineTo(0, 19);            // Engine nozzle
      ctx.lineTo(-9, 12);           // Left inner wing
      ctx.lineTo(-20, 16);          // Left wing tip
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, -26, 0, 19);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, "#00f3ff");
      grad.addColorStop(1, "#003b8e");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Cockpit Canopy
      ctx.beginPath();
      ctx.ellipse(0, -5, 4, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.hasShield ? "#ffd700" : "#ff007f";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fill();

      // Wing Cannons
      if (this.weaponLevel >= 2) {
        ctx.fillStyle = "#00f3ff";
        ctx.fillRect(-15, 4, 3, 10);
        ctx.fillRect(12, 4, 3, 10);
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     8. Enemy Armada Entities (Scout, Cruiser, Destroyer)
     ========================================================================== */
  class Enemy {
    constructor(width, speedMultiplier, currentScore = 0) {
      const roll = Math.random();
      const scoreTier = Math.floor(currentScore / 250);

      if (roll < 0.45) {
        // Small Scout: Fast, low HP (Power: 1 - 3)
        this.type = "scout";
        this.radius = 18;
        this.maxHp = Math.max(1, 1 + Math.floor(scoreTier * 0.4));
        this.speed = (CONFIG.BASE_ENEMY_SPEED + 60) * speedMultiplier;
        this.scoreVal = this.maxHp * 30 + 20;
        this.color = "#00ffcc";
        this.vertexCount = 5;
      } else if (roll < 0.8) {
        // Medium Cruiser: Normal, medium HP (Power: 3 - 8)
        this.type = "cruiser";
        this.radius = 28;
        this.maxHp = Math.max(3, 3 + Math.floor(scoreTier * 0.8));
        this.speed = CONFIG.BASE_ENEMY_SPEED * speedMultiplier;
        this.scoreVal = this.maxHp * 35;
        this.color = "#ffaa00";
        this.vertexCount = 7;
      } else {
        // Large Heavy Destroyer: Slower, high HP (Power: 6 - 20)
        this.type = "destroyer";
        this.radius = 40;
        this.maxHp = Math.max(6, 6 + Math.floor(scoreTier * 1.5));
        this.speed = (CONFIG.BASE_ENEMY_SPEED - 35) * speedMultiplier;
        this.scoreVal = this.maxHp * 40;
        this.color = "#ff007f";
        this.vertexCount = 8;
      }

      this.hp = this.maxHp;
      this.x = Math.random() * (width - this.radius * 2) + this.radius;
      this.y = -this.radius * 2;
      this.vx = (Math.random() - 0.5) * 50;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 2;
      this.hitFlashTimer = 0;
      this.alive = true;

      // Procedural polygon offsets for varied alien asteroid geometry
      this.offsets = [];
      for (let i = 0; i < this.vertexCount; i++) {
        this.offsets.push(0.75 + Math.random() * 0.45);
      }
    }

    takeDamage(dmg = 1) {
      this.hp -= dmg;
      this.hitFlashTimer = 0.08;
      if (this.hp <= 0) {
        this.alive = false;
        return true; // Destroyed
      }
      return false;
    }

    update(dt) {
      this.y += this.speed * dt;
      this.x += this.vx * dt;
      this.rotation += this.rotSpeed * dt;

      if (this.hitFlashTimer > 0) {
        this.hitFlashTimer -= dt;
      }

      // Boundary bounce
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx);
      } else if (this.x + this.radius > CONFIG.WIDTH) {
        this.x = CONFIG.WIDTH - this.radius;
        this.vx = -Math.abs(this.vx);
      }

      if (this.y - this.radius > CONFIG.HEIGHT + 40) {
        this.alive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const isHit = this.hitFlashTimer > 0;
      const strokeCol = isHit ? "#ffffff" : this.color;

      // 1. Draw Asteroid / Enemy Polygon Body (Rotated)
      ctx.save();
      ctx.rotate(this.rotation);
      ctx.shadowColor = strokeCol;
      ctx.shadowBlur = isHit ? 22 : 12;

      ctx.beginPath();
      const step = (Math.PI * 2) / this.vertexCount;
      for (let i = 0; i < this.vertexCount; i++) {
        const r = this.radius * this.offsets[i];
        const px = Math.cos(i * step) * r;
        const py = Math.sin(i * step) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = isHit ? "#ffffff" : "#111425";
      ctx.fill();

      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore(); // Restore rotation so Power Number stays perfectly upright & legible

      // 2. Draw Prominent Power / HP Number in the Center (Upright)
      const fontSize = Math.max(12, Math.floor(this.radius * 0.72));
      ctx.font = `900 ${fontSize}px "Segoe UI", "Consolas", monospace, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Dark Outline for high contrast readability
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      ctx.strokeText(this.hp, 0, 0);

      // Bright Glowing Number showing remaining Power/HP
      ctx.fillStyle = isHit ? "#000000" : "#ffffff";
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillText(this.hp, 0, 0);

      // 3. Health bar for Cruiser & Destroyer when damaged
      if (this.maxHp > 1 && this.hp < this.maxHp) {
        const barW = this.radius * 1.4;
        const barH = 4;
        const hpRatio = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(-barW / 2, -this.radius - 8, barW, barH);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(-barW / 2, -this.radius - 8, barW * hpRatio, barH);
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     9. Colossal Mothership Boss Entity
     ========================================================================== */
  class Boss {
    constructor(level = 1) {
      this.level = level;
      this.width = 150;
      this.height = 70;
      this.radius = 55; // Collision radius
      this.x = CONFIG.WIDTH / 2;
      this.y = -100;
      this.targetY = 135;
      this.maxHp = 35 + (level - 1) * 25;
      this.hp = this.maxHp;
      this.speedX = 130 + level * 20;
      this.direction = 1;
      this.fireTimer = 0;
      this.fireInterval = Math.max(0.7, 1.4 - level * 0.15);
      this.alive = true;
      this.entering = true;
      this.hitFlashTimer = 0;
    }

    takeDamage(dmg = 1) {
      this.hp -= dmg;
      this.hitFlashTimer = 0.08;
      if (this.hp <= 0) {
        this.alive = false;
        return true;
      }
      return false;
    }

    update(dt, bullets) {
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      // Entrance animation
      if (this.entering) {
        this.y += 120 * dt;
        if (this.y >= this.targetY) {
          this.y = this.targetY;
          this.entering = false;
        }
        return;
      }

      // Side-to-side sweeping movement
      this.x += this.speedX * this.direction * dt;
      if (this.x > CONFIG.WIDTH - this.width / 2 - 15) {
        this.direction = -1;
      } else if (this.x < this.width / 2 + 15) {
        this.direction = 1;
      }

      // Fire Energy Blasts at player
      this.fireTimer += dt;
      if (this.fireTimer >= this.fireInterval) {
        this.fireTimer = 0;
        // Dual laser orbs from boss wings
        bullets.push(new Bullet(this.x - 45, this.y + 25, (Math.random() - 0.5) * 80, 260, true));
        bullets.push(new Bullet(this.x + 45, this.y + 25, (Math.random() - 0.5) * 80, 260, true));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const isHit = this.hitFlashTimer > 0;
      const strokeCol = isHit ? "#ffffff" : "#ff007f";
      ctx.shadowColor = strokeCol;
      ctx.shadowBlur = isHit ? 25 : 18;

      // Mothership Heavy Hull
      ctx.beginPath();
      ctx.moveTo(0, 36);             // Central Cannon
      ctx.lineTo(65, 15);            // Right Wing Front
      ctx.lineTo(75, -20);           // Right Wing Back
      ctx.lineTo(30, -32);           // Right Engine
      ctx.lineTo(0, -22);            // Core Deck
      ctx.lineTo(-30, -32);          // Left Engine
      ctx.lineTo(-75, -20);          // Left Wing Back
      ctx.lineTo(-65, 15);           // Left Wing Front
      ctx.closePath();

      ctx.fillStyle = isHit ? "#ffffff" : "#101428";
      ctx.fill();

      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glowing Power Core
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#ffaa00";
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 15;
      ctx.fill();

      // Boss Power / HP Number inside core
      ctx.font = "bold 13px 'Consolas', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.shadowBlur = 0;
      ctx.fillText(this.hp, 0, 0);

      // Wing Turrets
      ctx.fillStyle = "#ff007f";
      ctx.fillRect(-48, 18, 6, 12);
      ctx.fillRect(42, 18, 6, 12);

      ctx.restore();
    }
  }

  /* ==========================================================================
     10. Input Controller (Keyboard & Mouse / Touch)
     ========================================================================== */
  class InputController {
    constructor(canvas, onTogglePause) {
      this.left = false;
      this.right = false;
      this.pointerActive = false;
      this.pointerX = CONFIG.WIDTH / 2;
      this.canvas = canvas;
      this.onTogglePause = onTogglePause;

      this.bindKeyboard();
      this.bindMouseAndTouch();
    }

    bindKeyboard() {
      window.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        if (key === "arrowleft" || key === "a") this.left = true;
        if (key === "arrowright" || key === "d") this.right = true;

        if (key === "p" || key === "escape") {
          if (this.onTogglePause) this.onTogglePause();
        }
      });

      window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (key === "arrowleft" || key === "a") this.left = false;
        if (key === "arrowright" || key === "d") this.right = false;
      });
    }

    bindMouseAndTouch() {
      const getCoord = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        return (clientX - rect.left) * (CONFIG.WIDTH / rect.width);
      };

      // Mouse movements
      this.canvas.addEventListener("mousemove", (e) => {
        this.pointerActive = true;
        this.pointerX = getCoord(e);
      });

      this.canvas.addEventListener("mouseleave", () => {
        this.pointerActive = false;
      });

      // Touch events for mobile
      const onTouchStart = (e) => {
        this.pointerActive = true;
        this.pointerX = getCoord(e);
      };

      const onTouchMove = (e) => {
        if (!this.pointerActive) return;
        this.pointerX = getCoord(e);
      };

      const onTouchEnd = () => {
        this.pointerActive = false;
      };

      this.canvas.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
      window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }

    reset() {
      this.left = false;
      this.right = false;
      this.pointerActive = false;
    }
  }

  /* ==========================================================================
     11. Main Game Engine & Loop
     ========================================================================== */
  class Game {
    constructor() {
      // DOM Elements
      this.canvas = document.getElementById("game-canvas");
      this.ctx = this.canvas.getContext("2d");

      this.hud = document.getElementById("hud");
      this.currentScoreEl = document.getElementById("current-score");
      this.hudHighScoreEl = document.getElementById("hud-high-score");
      this.livesDisplay = document.getElementById("lives-display");

      this.bossBarContainer = document.getElementById("boss-bar-container");
      this.bossHpFill = document.getElementById("boss-hp-fill");
      this.bossHpText = document.getElementById("boss-hp-text");
      this.bossAlert = document.getElementById("boss-alert");

      this.powerupTray = document.getElementById("powerup-tray");
      this.badgeWeaponText = document.getElementById("badge-weapon-text");
      this.badgeFireRateText = document.getElementById("badge-firerate-text");
      this.badgeSpeedText = document.getElementById("badge-speed-text");
      this.badgeShield = document.getElementById("badge-shield");

      this.soundBtn = document.getElementById("sound-btn");
      this.soundIcon = document.getElementById("sound-icon");
      this.pauseBtn = document.getElementById("pause-btn");

      this.startScreen = document.getElementById("start-screen");
      this.startBtn = document.getElementById("start-btn");
      this.startHighScoreEl = document.getElementById("start-high-score");

      this.gameOverScreen = document.getElementById("game-over-screen");
      this.restartBtn = document.getElementById("restart-btn");
      this.mainMenuBtn = document.getElementById("main-menu-btn");
      this.finalScoreEl = document.getElementById("final-score");
      this.finalKillsEl = document.getElementById("final-kills");
      this.gameOverHighScoreEl = document.getElementById("gameover-high-score");
      this.newHighScoreBadge = document.getElementById("new-high-score-badge");

      this.pauseScreen = document.getElementById("pause-screen");
      this.resumeBtn = document.getElementById("resume-btn");
      this.touchHint = document.getElementById("touch-hint");

      // Game States: "MENU", "PLAYING", "PAUSED", "GAMEOVER"
      this.state = "MENU";

      // Engines & Controllers
      this.sound = new SoundManager();
      this.input = new InputController(this.canvas, () => this.togglePause());
      this.starfield = new Starfield(100, CONFIG.WIDTH, CONFIG.HEIGHT);
      this.particles = new ParticleSystem();
      this.player = new Player(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 120);

      // Entity Lists
      this.bullets = [];
      this.enemies = [];
      this.powerups = [];
      this.boss = null;
      this.bossLevel = 1;
      this.nextBossScore = CONFIG.BOSS_SCORE_TRIGGER;

      // Stats
      this.lastTime = 0;
      this.score = 0;
      this.kills = 0;
      this.highScore = this.loadHighScore();
      this.speedMultiplier = 1.0;
      this.spawnTimer = 0;
      this.spawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;

      this.initDisplay();
      this.bindUI();
      this.updateHighScoresDisplay();

      // Begin animation loop
      requestAnimationFrame((t) => this.loop(t));
    }

    loadHighScore() {
      try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        return saved ? parseInt(saved, 10) || 0 : 0;
      } catch (e) {
        return 0;
      }
    }

    saveHighScore(newScore) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, newScore.toString());
      } catch (e) {
        console.warn("localStorage write disabled:", e);
      }
    }

    initDisplay() {
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(this.canvas.width / CONFIG.WIDTH, this.canvas.height / CONFIG.HEIGHT);
      };

      window.addEventListener("resize", resize);
      resize();
    }

    bindUI() {
      this.startBtn.addEventListener("click", () => {
        this.sound.init();
        this.sound.playClick();
        this.startGame();
      });

      this.restartBtn.addEventListener("click", () => {
        this.sound.playClick();
        this.startGame();
      });

      this.mainMenuBtn.addEventListener("click", () => {
        this.sound.playClick();
        this.showMainMenu();
      });

      this.soundBtn.addEventListener("click", () => {
        this.sound.init();
        const muted = this.sound.toggleMute();
        this.soundIcon.textContent = muted ? "🔇" : "🔊";
      });

      this.pauseBtn.addEventListener("click", () => this.togglePause());
      this.resumeBtn.addEventListener("click", () => this.togglePause());

      window.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        if (key === "m") {
          this.sound.init();
          const muted = this.sound.toggleMute();
          this.soundIcon.textContent = muted ? "🔇" : "🔊";
        }
        if (this.state === "GAMEOVER" && (e.code === "Space" || key === "enter")) {
          e.preventDefault();
          this.sound.playClick();
          this.startGame();
        }
      });
    }

    updateHighScoresDisplay() {
      this.hudHighScoreEl.textContent = this.highScore;
      this.startHighScoreEl.textContent = this.highScore;
      this.gameOverHighScoreEl.textContent = this.highScore;
    }

    updateHUD() {
      // Score
      this.currentScoreEl.textContent = this.score;

      // Lives Display
      this.livesDisplay.innerHTML = "";
      for (let i = 0; i < CONFIG.MAX_LIVES; i++) {
        const span = document.createElement("span");
        span.className = "life-pip";
        if (i < this.player.lives) {
          span.textContent = "❤️";
        } else {
          span.textContent = "🖤";
          span.classList.add("lost");
        }
        this.livesDisplay.appendChild(span);
      }

      // Power-up Badges
      const weaponNames = ["SINGLE", "DOUBLE", "TRIPLE", "HYPER"];
      this.badgeWeaponText.textContent = weaponNames[this.player.weaponLevel - 1] || "SINGLE";
      this.badgeFireRateText.textContent = `SPD x${this.player.fireSpeedLevel}`;
      this.badgeSpeedText.textContent = `THRUST x${this.player.thrustSpeedLevel}`;

      if (this.player.hasShield) {
        this.badgeShield.classList.remove("hidden");
      } else {
        this.badgeShield.classList.add("hidden");
      }

      // Boss HP Bar
      if (this.boss && this.boss.alive) {
        this.bossBarContainer.classList.remove("hidden");
        const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
        this.bossHpFill.style.width = `${ratio * 100}%`;
        this.bossHpText.textContent = `${Math.ceil(ratio * 100)}%`;
      } else {
        this.bossBarContainer.classList.add("hidden");
      }
    }

    startGame() {
      this.sound.init();
      this.sound.playClick();
      this.state = "PLAYING";

      // Reset entities
      this.score = 0;
      this.kills = 0;
      this.speedMultiplier = 1.0;
      this.spawnTimer = 0;
      this.spawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;
      this.nextBossScore = CONFIG.BOSS_SCORE_TRIGGER;
      this.bossLevel = 1;
      this.boss = null;

      this.bullets = [];
      this.enemies = [];
      this.powerups = [];
      this.particles.clear();
      this.player.reset();
      this.input.reset();

      // UI States
      this.startScreen.classList.remove("active");
      this.gameOverScreen.classList.remove("active");
      this.pauseScreen.classList.remove("active");
      this.hud.classList.remove("hidden");
      this.powerupTray.classList.remove("hidden");
      this.bossAlert.classList.add("hidden");

      this.updateHUD();

      // Show mobile touch steer hint briefly
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        this.touchHint.classList.remove("hidden");
        setTimeout(() => this.touchHint.classList.add("hidden"), 3000);
      }
    }

    showMainMenu() {
      this.state = "MENU";
      this.startScreen.classList.add("active");
      this.gameOverScreen.classList.remove("active");
      this.pauseScreen.classList.remove("active");
      this.hud.classList.add("hidden");
      this.powerupTray.classList.add("hidden");
      this.bossBarContainer.classList.add("hidden");
      this.bossAlert.classList.add("hidden");
      this.updateHighScoresDisplay();
    }

    togglePause() {
      if (this.state !== "PLAYING" && this.state !== "PAUSED") return;

      this.sound.playClick();
      if (this.state === "PLAYING") {
        this.state = "PAUSED";
        this.pauseScreen.classList.add("active");
      } else {
        this.state = "PLAYING";
        this.pauseScreen.classList.remove("active");
        this.lastTime = performance.now();
      }
    }

    triggerBossEncounter() {
      this.sound.playBossWarning();
      this.bossAlert.classList.remove("hidden");

      setTimeout(() => {
        this.bossAlert.classList.add("hidden");
        if (this.state === "PLAYING") {
          this.boss = new Boss(this.bossLevel);
        }
      }, 1800);
    }

    gameOver() {
      if (this.state === "GAMEOVER") return;
      this.state = "GAMEOVER";
      this.player.alive = false;
      this.input.reset();

      // Massive ship detonation
      this.particles.emitExplosion(this.player.x, this.player.y, "#00f3ff", 70);
      this.sound.playExplosion(true);

      // High Score check
      let isNewHighScore = false;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore(this.highScore);
        isNewHighScore = true;
        setTimeout(() => this.sound.playNewRecord(), 250);
      }

      this.updateHighScoresDisplay();
      this.finalScoreEl.textContent = this.score;
      this.finalKillsEl.textContent = this.kills;

      if (isNewHighScore && this.score > 0) {
        this.newHighScoreBadge.classList.remove("hidden");
      } else {
        this.newHighScoreBadge.classList.add("hidden");
      }

      this.bossBarContainer.classList.add("hidden");
      this.bossAlert.classList.add("hidden");
      this.gameOverScreen.classList.remove("hidden");
      this.gameOverScreen.classList.add("active");
    }

    /* ==========================================================================
       Game Loop & Logic Updates
       ========================================================================== */
    loop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      let dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      if (dt > 0.1) dt = 0.1;

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      // Background & Particles always animate
      const bgSpeed = this.state === "PLAYING" ? this.speedMultiplier : 0.8;
      this.starfield.update(dt, bgSpeed);
      this.particles.update(dt);

      if (this.state !== "PLAYING") return;

      // Update Player
      this.player.update(dt, this.input, this.particles, this.bullets, this.sound);

      // Dynamic Difficulty scaling over score
      this.speedMultiplier = Math.min(2.5, 1.0 + (this.score / 1200) * 0.4);
      this.spawnInterval = Math.max(
        CONFIG.MIN_SPAWN_INTERVAL,
        CONFIG.INITIAL_SPAWN_INTERVAL - (this.score / 1500) * 0.3
      );

      // Check Boss Spawn condition
      if (this.score >= this.nextBossScore && !this.boss) {
        this.nextBossScore += CONFIG.BOSS_SCORE_TRIGGER + this.bossLevel * 250;
        this.triggerBossEncounter();
      }

      // Update Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.update(dt);
        if (!b.alive) {
          this.bullets.splice(i, 1);
        }
      }

      // Update Power-up Drops & Collection
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const drop = this.powerups[i];
        drop.update(dt);

        // Player Collection check
        const distToPlayer = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
        if (distToPlayer < this.player.radius + drop.radius + 6) {
          this.applyPowerUp(drop);
          this.powerups.splice(i, 1);
          continue;
        }

        if (!drop.alive) {
          this.powerups.splice(i, 1);
        }
      }

      // Update Enemies & Spawning (only spawn minions if boss is not active)
      if (!this.boss) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTimer = 0;
          this.enemies.push(new Enemy(CONFIG.WIDTH, this.speedMultiplier, this.score));
        }
      }

      // Enemy Updates & Collisions
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(dt);

        // 1. Bullet vs Enemy Collisions
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const b = this.bullets[j];
          if (b.isEnemy) continue; // Only player bullets hurt enemies

          const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (dist < enemy.radius + b.radius) {
            this.sound.playHit();
            b.alive = false;
            this.bullets.splice(j, 1);

            const isDead = enemy.takeDamage(1);
            if (isDead) {
              this.destroyEnemy(enemy);
              this.enemies.splice(i, 1);
              break;
            }
          }
        }

        // 2. Player vs Enemy Collision
        if (enemy.alive) {
          const distToPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (distToPlayer < (this.player.radius * 0.75) + (enemy.radius * 0.75)) {
            const hitResult = this.player.takeHit();
            if (hitResult === "shield_absorbed") {
              this.sound.playShieldBreak();
              this.particles.emitExplosion(this.player.x, this.player.y, "#ffd700", 30);
              this.particles.addFloatingText(this.player.x, this.player.y - 30, "SHIELD BROKEN", "#ffd700");
            } else if (hitResult === "damaged") {
              this.sound.playExplosion();
              this.particles.emitExplosion(this.player.x, this.player.y, "#ff007f", 25);
            } else if (hitResult === "destroyed") {
              this.gameOver();
              return;
            }

            // Destroy colliding enemy
            this.destroyEnemy(enemy, false);
            this.enemies.splice(i, 1);
          }
        }

        if (!enemy.alive) {
          this.enemies.splice(i, 1);
        }
      }

      // Update Boss
      if (this.boss) {
        this.boss.update(dt, this.bullets);

        // 1. Player Bullets vs Boss
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const b = this.bullets[j];
          if (b.isEnemy) continue;

          const dist = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
          if (dist < this.boss.radius + b.radius) {
            this.sound.playHit();
            b.alive = false;
            this.bullets.splice(j, 1);

            const isBossDead = this.boss.takeDamage(1);
            if (isBossDead) {
              this.defeatBoss();
              break;
            }
          }
        }

        // 2. Player vs Boss Body Collision
        if (this.boss && this.boss.alive) {
          const distToBoss = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
          if (distToBoss < this.boss.radius + this.player.radius) {
            const hitResult = this.player.takeHit();
            if (hitResult === "shield_absorbed") {
              this.sound.playShieldBreak();
            } else if (hitResult === "destroyed") {
              this.gameOver();
              return;
            }
          }
        }
      }

      // Enemy Bullets vs Player Collision
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b.isEnemy) continue;

        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < this.player.radius + b.radius) {
          b.alive = false;
          this.bullets.splice(i, 1);

          const hitResult = this.player.takeHit();
          if (hitResult === "shield_absorbed") {
            this.sound.playShieldBreak();
            this.particles.emitExplosion(this.player.x, this.player.y, "#ffd700", 25);
          } else if (hitResult === "destroyed") {
            this.gameOver();
            return;
          }
        }
      }

      this.updateHUD();
    }

    destroyEnemy(enemy, awardScore = true) {
      this.sound.playExplosion(enemy.type === "destroyer");
      this.particles.emitExplosion(enemy.x, enemy.y, enemy.color, enemy.type === "destroyer" ? 45 : 25);

      if (awardScore) {
        this.score += enemy.scoreVal;
        this.kills++;
        this.particles.addFloatingText(enemy.x, enemy.y, `+${enemy.scoreVal}`, enemy.color);

        // Power-up Drop Chance
        const dropRoll = Math.random();
        const dropThreshold = enemy.type === "destroyer" ? 0.75 : CONFIG.DROP_CHANCE;

        if (dropRoll < dropThreshold) {
          const types = ["green", "blue", "purple", "gold"];
          // Gold is rarer
          const picked = Math.random() < 0.2 ? "gold" : types[Math.floor(Math.random() * 3)];
          this.powerups.push(new PowerUp(enemy.x, enemy.y, picked));
        }
      }
    }

    defeatBoss() {
      this.sound.playExplosion(true);
      this.particles.emitExplosion(this.boss.x, this.boss.y, "#ff007f", 80);

      this.score += 500;
      this.kills++;
      this.particles.addFloatingText(this.boss.x, this.boss.y, "BOSS DEFEATED! +500", "#ffd700");

      // Boss guaranteed drops: Gold + Purple + Green
      this.powerups.push(new PowerUp(this.boss.x - 30, this.boss.y, "gold"));
      this.powerups.push(new PowerUp(this.boss.x, this.boss.y - 15, "purple"));
      this.powerups.push(new PowerUp(this.boss.x + 30, this.boss.y, "green"));

      this.boss = null;
      this.bossLevel++;
      this.updateHUD();
    }

    applyPowerUp(drop) {
      this.sound.playPowerUp(drop.type);

      switch (drop.type) {
        case "green":
          this.player.upgradeFireSpeed();
          this.particles.addFloatingText(this.player.x, this.player.y - 35, "+FIRE RATE UP!", "#00ff66");
          break;
        case "blue":
          this.player.upgradeThrustSpeed();
          this.particles.addFloatingText(this.player.x, this.player.y - 35, "+SPEED BOOST!", "#0088ff");
          break;
        case "purple":
          this.player.upgradeWeapon();
          this.particles.addFloatingText(this.player.x, this.player.y - 35, "+WEAPON UPGRADED!", "#b026ff");
          break;
        case "gold":
          this.player.grantShieldOrLife();
          this.particles.addFloatingText(this.player.x, this.player.y - 35, "+SHIELD & LIFE!", "#ffd700");
          break;
      }

      this.score += 25;
      this.updateHUD();
    }

    render() {
      this.ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

      // 1. Starfield
      this.starfield.draw(this.ctx, this.speedMultiplier);

      // 2. Power-up Drops
      for (let i = 0; i < this.powerups.length; i++) {
        this.powerups[i].draw(this.ctx);
      }

      // 3. Bullets
      for (let i = 0; i < this.bullets.length; i++) {
        this.bullets[i].draw(this.ctx);
      }

      // 4. Enemies
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].draw(this.ctx);
      }

      // 5. Boss
      if (this.boss) {
        this.boss.draw(this.ctx);
      }

      // 6. Player Ship
      this.player.draw(this.ctx);

      // 7. Particles & Combat FX
      this.particles.draw(this.ctx);
    }
  }

  // Launch once DOM is ready
  window.addEventListener("DOMContentLoaded", () => {
    new Game();
  });
})();
