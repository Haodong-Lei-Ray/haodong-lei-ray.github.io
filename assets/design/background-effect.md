# 流体 ASCII 背景特效（Codex 风格）

交互式背景：紫色渐变 + 字符场 + **流体模拟**（鼠标移动注入"墨水"，墨水会平流、消散）。
纯原生 JS/Canvas，无任何外部库。

## 三个文件

| 文件 | 作用 |
|------|------|
| `js/background.js` | 全部逻辑：流体解算器 + 字符渲染 + 安全区遮罩 |
| `css/style.css` | 渐变层 `#bg-gradient`、画布 `#bg-canvas`、主题颜色变量 |
| `index.html` | `<body>` 开头插入两个空容器 + 末尾引入脚本 |

---

## 一、调参数（改 `js/background.js` 顶部 `// ----- Tunables` 区）

### 外观
| 参数 | 当前值 | 说明 |
|------|--------|------|
| `CELL_PX` | `8` | 字符网格大小（px）。**越小字符越细密** |
| `RAMP` | `[' ','·','_','-','>','○']` | 亮度阶梯：从暗到亮的字符 |
| `CONTRAST` / `GAMMA` | `1.9` / `0.6` | 密度→亮度映射（gamma 越小，暗部越容易显现）|
| `THRESHOLD` | `0.12` | 低于此值的格子不画（保持留白）|

### 透明度（让特效更隐约就调这里）
| 参数 | 当前值 | 说明 |
|------|--------|------|
| `ALPHA_MAX` | `0.45` | 整体不透明度上限，**越小越淡** |
| `ALPHA_BASE` | `0.05` | 最暗字符的透明度下限 |
| `ALPHA_GAIN` | `0.40` | 靠近墨水时变亮的幅度 |

### 流体手感（`SIM` 对象）
| 参数 | 当前值 | 说明 |
|------|--------|------|
| `densDecay` | `0.5` | 墨水消散速度，**越小消失越快**（0.99≈拖尾很久，0.5≈一闪）|
| `velDecay` | `0.90` | 速度衰减，越小墨水停得越快、扩散范围越小 |
| `diff` | `0.0` | 密度扩散，>0 会让墨迹外摊变糊 |
| `iter` | `4` | 解算迭代次数，越大越精确越耗性能 |

### 鼠标注入（`INJECT` 对象）
| 参数 | 当前值 | 说明 |
|------|--------|------|
| `density` | `105` | 每次注入的墨量 |
| `gain` | `0.2` | 速度增益，**越小跟随范围越贴光标** |
| `radius` | `1` | 注入的格子半径 |

### 静止环境层
- `AMBIENT_AMP`（`0.05`）：静止时的微弱底纹强度，设 `0` 则静止时完全空白。

### 避让内容 / 限制范围
| 参数 | 当前值 | 说明 |
|------|--------|------|
| `SAFE_SELECTOR` | 一组选择器 | 这些元素（文字/按钮/图片…）上方**不画字符**，保证可读 |
| `SAFE_PAD` / `SAFE_FEATHER` | `6` / `16` | 内容框外扩的硬边距 / 柔和羽化带（px）|
| `CUTOFF_SELECTOR` | `'#about'` | 特效只显示到该元素**底部**为止，下方全部不画 |
| `CUTOFF_FEATHER` | `70` | 截止线上方的淡出带（px）|

> 想让特效铺满整页：把 `CUTOFF_SELECTOR` 改成一个不存在的选择器（如 `'#__none__'`），回退逻辑会让它覆盖整个视口。

### 颜色（改 `css/style.css`）
- `--bg-glyph`：字符颜色（`R, G, B` 三元组，JS 会读取）。
- `--bg-grad-1/2/3`：渐变光晕颜色；`--bg-grad-base`：底色（默认对齐页面背景 `--color-bg-alt`）。
- 亮/暗主题各有一套，自动切换。

---

## 二、移植到任意网页（4 步）

**1.** 拷贝 `js/background.js` 到目标项目。

**2.** 在 `<body>` 最开头加两个容器：
```html
<body>
  <div id="bg-gradient" aria-hidden="true"></div>
  <canvas id="bg-canvas" aria-hidden="true"></canvas>
  <!-- 你的页面内容... -->
```

**3.** 加 CSS（颜色按需改；`--bg-glyph` 必填）：
```css
:root {
  --bg-grad-1: #c7d0ff; --bg-grad-2: #d9ccf2; --bg-grad-3: #cfe0f5;
  --bg-grad-base: #e3e7ea;
  --bg-glyph: 70, 84, 150;            /* 字符颜色 RGB */
  --font-mono: 'JetBrains Mono', monospace;
}
#bg-gradient {
  position: fixed; inset: 0; z-index: -2; pointer-events: none;
  background:
    radial-gradient(60% 60% at 78% 18%, var(--bg-grad-1) 0%, transparent 62%),
    radial-gradient(55% 55% at 18% 30%, var(--bg-grad-2) 0%, transparent 60%),
    radial-gradient(70% 70% at 50% 92%, var(--bg-grad-3) 0%, transparent 64%),
    var(--bg-grad-base);
  opacity: 0.55;
}
#bg-canvas { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
```
> 关键：两层用 `position: fixed` + 负 `z-index` + `pointer-events: none`，永远在内容之下、不挡点击。
> 页面各区块的背景若是**不透明**色块，会盖住特效——把它们设为 `transparent` 即可透出。

**4.** 在 `</body>` 前引入脚本：
```html
<script src="js/background.js"></script>
```

**5.（按页面调整）** 改 `background.js` 里的 `SAFE_SELECTOR` 匹配你页面的文字/按钮，
改 `CUTOFF_SELECTOR` 决定特效显示到哪、或让它铺满整页。

---

## 三、特性说明
- **性能**：流体在粗网格（视口宽/18）上解算，再双线性采样到字符网格；实测 1440×900 连续交互 **~60 FPS**。
- **遮罩自动更新**：滚动 / 缩放 / 字体加载后自动重算安全区（节流 `SAFE_REBUILD_MS`）。
- **无障碍**：尊重 `prefers-reduced-motion`，会降级为静态淡纹理、关闭鼠标交互。
- **触摸**：支持 `touchmove`。
