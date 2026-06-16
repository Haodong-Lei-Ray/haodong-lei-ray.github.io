要做一个“像素风网站”，核心不是某个框架，而是 **视觉约束 + 交互细节** 。CSS 决定“像不像”，JS 决定“有没有灵魂”。

我直接给你一套从基础 → 进阶 → 效果增强的完整思路（带代码），你照着拼就能出效果。

---

# 一、核心原则（不然很容易做成“假像素风”）

1. **低分辨率 + 放大显示**
2. **禁用平滑（抗锯齿）**
3. **有限色板（类似游戏机）**
4. **硬边界（no blur / no shadow blur）**

---

# 二、CSS：像素风的关键

## 1️⃣ 禁止图像平滑（最重要）

```css
img, canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

否则所有像素图都会被浏览器“抹平”。

---

## 2️⃣ 使用像素字体

推荐：

* Press Start 2P
* Pixelify Sans

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

```css
body {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
}
```

---

## 3️⃣ UI组件：像素按钮

```css
.pixel-btn {
  background: #222;
  color: #fff;
  padding: 10px 16px;
  border: 4px solid #fff;
  box-shadow: 4px 4px 0 #000;
  cursor: pointer;
}

.pixel-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 #000;
}
```

👉 关键：**用硬阴影模拟“像素厚度”**

---

## 4️⃣ 像素边框（经典技巧）

```css
.pixel-box {
  border: 4px solid black;
  box-shadow:
    4px 0 0 black,
    0 4px 0 black,
    4px 4px 0 black;
}
```

---

## 5️⃣ 限制颜色（非常重要）

不要用渐变！用固定调色板：

```css
:root {
  --bg: #1a1c2c;
  --primary: #5d275d;
  --accent: #b13e53;
  --light: #ef7d57;
}
```

👉 参考 NES / GameBoy 调色板

---

# 三、JS：让网站“像游戏”

CSS只能“看起来像”，JS才能“动起来像”。

---

## 1️⃣ 打字机效果

```js
function typeText(el, text, speed = 50) {
  let i = 0;
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(interval);
  }, speed);
}
```

---

## 2️⃣ 像素点击反馈（游戏感）

```js
document.querySelectorAll('.pixel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.style.background = '#555';
    setTimeout(() => {
      btn.style.background = '#222';
    }, 100);
  });
});
```

---

## 3️⃣ Canvas 像素动画（进阶）

```js
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const img = new Image();
img.src = 'sprite.png';

img.onload = () => {
  ctx.drawImage(img, 0, 0, 32, 32, 0, 0, 128, 128);
};
```

👉 小图放大显示 = 像素感

---

# 四、进阶效果（拉开差距）

## ✅ 1. CRT 显示器效果

```css
.crt {
  position: relative;
}

.crt::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    rgba(0,0,0,0.2),
    rgba(0,0,0,0.2) 1px,
    transparent 1px,
    transparent 2px
  );
}
```

---

## ✅ 2. 抖动动画（像素感更强）

```css
@keyframes shake {
  0% { transform: translate(0, 0); }
  25% { transform: translate(1px, 0); }
  50% { transform: translate(0, 1px); }
  75% { transform: translate(-1px, 0); }
  100% { transform: translate(0, 0); }
}
```

---

## ✅ 3. 8-bit 音效（JS）

```js
const audio = new Audio('click.wav');
button.onclick = () => audio.play();
```

👉 这一步会让体验直接“游戏化”

---

# 五、推荐资源（直接提升完成度）

### 像素素材

* itch.io（像素UI / sprite）
* opengameart

### 图标

* Pixelarticons

### 参考网站

* 像素作品集网站
* 独立游戏官网（很多是纯HTML+JS）

---

# 六、一个最小可运行结构

```html
<body class="crt">
  <h1>PIXEL SITE</h1>
  <button class="pixel-btn">START</button>
</body>
```

---

# 七、关键总结（最容易踩坑的点）

如果你只记三点：

1. **image-rendering: pixelated**
2. **硬阴影 + 无渐变**
3. **低分辨率素材放大**
