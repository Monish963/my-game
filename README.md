# 🚀 Space Strike - Neon Arcade Shooter

A complete retro-futuristic 2D space shooter web game built with pure vanilla **HTML5**, **CSS3**, and **JavaScript** (no external libraries or frameworks).

---

## 🎮 How to Play

### Launching the Game
Open [`index.html`](file:///C:/Users/Alina%20Banu/.gemini/antigravity/scratch/space-dodge/index.html) directly in any modern web browser (Google Chrome, Edge, Firefox, Safari).

### Controls
| Control Type | Keys / Actions | Action |
| :--- | :--- | :--- |
| **Keyboard** | <kbd>A</kbd> <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd> | Steer spaceship left / right |
| **Mouse / Touch** | Move mouse / Drag touch pointer | Smooth horizontal steering |
| **Firing** | **Automatic** | Fires continuous plasma bolts upward! |
| **Pause** | <kbd>P</kbd> or <kbd>ESC</kbd> or ⏸ button | Pause / Resume gameplay |
| **Audio** | <kbd>M</kbd> or 🔊 button | Toggle Sound FX on / off |
| **Restart** | <kbd>Space</kbd> or <kbd>Enter</kbd> or REDEPLOY button | Quickly restart after Game Over |

---

## 🌟 Game Mechanics & Features

### 1. 🛸 Player Ship (आपका जहाज)
- Smooth left–right movement with dynamic banking tilt animations.
- Fires laser bullets from bottom to top.
- Starts with **3 Lives** (displayed as ❤️❤️❤️ in the HUD) and temporary invulnerability after taking a hit.

### 2. ⚡ Weapon & Fire System (गोलीबारी प्रणाली)
- **Starting Weapon:** Single high-velocity cyan laser beam.
- **Weapon Upgrades (🟣 Purple Drop):**
  - **Level 1:** Single Center Laser
  - **Level 2:** Dual Wing Blasters
  - **Level 3:** Triple Spread Cannons (-14°, 0°, +14°)
  - **Level 4:** Quad Heavy Plasma Battery
- **Fire Speed Upgrades (🟢 Green Drop):** Increases rate of fire up to hyper-rapid bursts.

### 3. 👾 Enemy Armada & Power Numbers (दुश्मन व पावर नंबर)
- **Visible Power Numbers (🔢):** Every falling object displays a bold, glowing number in its center showing its exact remaining Power/HP.
- Each bullet hit reduces the number. When it reaches 0, the object detonates!
- **Scout Drone (Small):** Fast, Power: 1 – 3, 50+ points.
- **Armored Cruiser (Medium):** Normal speed, Power: 3 – 8, 100+ points.
- **Heavy Destroyer (Large):** Heavy asteroid, Power: 6 – 20+, 200+ points.
- **Mothership Boss:** Displays its huge power number in its core and top HUD health bar.
- Enemies flash white upon bullet impact and explode into glowing particles when destroyed.

### 4. 🎁 Power-up Drops (पावर-अप्स)
Enemies drop glowing power-up orbs when destroyed:
- 🟢 **Green Drop:** Fire Speed Boost (तेज गोलीबारी)
- 🔵 **Blue Drop:** Flight Thrust Boost (तेज जहाज की चाल)
- 🟣 **Purple Drop:** Cannon Upgrade (डबल/ट्रिपल गोलियां)
- 🟡 **Gold Drop:** Energy Shield + Extra Life (शील्ड व एक्स्ट्रा लाइफ)

### 5. 👑 Colossal Mothership Boss Battles
- A massive Mothership spawns every 500 score points!
- Accompanied by a pulsing warning siren and red alert banner (`⚠️ WARNING: BOSS APPROACHING ⚠️`).
- Includes a dedicated **Top Boss Health Bar**.
- Sweeps horizontally and fires red plasma orbs down at the player.
- Defeating the boss awards **+500 points** and guarantees multiple power-up drops!

### 6. 🛡️ Life & Shield Protection
- The **Gold Shield (🟡)** wraps your ship in a rotating golden force-field that absorbs an entire collision or projectile impact.
- When lives drop to 0, an immediate **Game Over** screen appears with final score, enemies destroyed, high score, and a **REDEPLOY** restart button.
