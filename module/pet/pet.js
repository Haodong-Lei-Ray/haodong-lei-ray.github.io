/**
 * Pixel Pet — AI Companion
 * A pixel-style companion that answers one Q&A at a time
 */

(function () {
  'use strict';

  // Load pet soul from soul.md
  var petSoul = '';
  fetch('module/pet/soul.md?v=' + Date.now())
    .then(function (r) { return r.text(); })
    .then(function (text) {
      petSoul = text.trim();
      initPet();
    })
    .catch(function () {
      petSoul = '你是一个可爱的像素宠物伙伴。';
      initPet();
    });

  function initPet() {

  // ---- Pixel Pet Sprite (8x8 grid, each cell is a box-shadow pixel) ----
  // 0=empty, 1=body(#f4a460), 2=dark(#8b5e3c), 3=eye(#222), 4=cheek(#ff9999)
  const PIXEL_SIZE = 6;
  const sprite = [
    0,0,0,1,1,0,0,0,
    0,0,1,1,1,1,0,0,
    0,1,3,1,1,3,1,0,
    0,1,1,1,1,1,1,0,
    0,1,1,4,4,1,1,0,
    0,1,2,1,1,2,1,0,
    0,0,1,1,1,1,0,0,
    0,0,0,2,2,0,0,0,
  ];

  const COLORS = {
    1: '#f4a460',
    2: '#8b5e3c',
    3: '#1a1a2e',
    4: '#ff9999',
  };

  // ---- Build pet DOM ----
  function buildPet() {
    const pet = document.createElement('div');
    pet.className = 'pixel-pet';
    pet.title = 'Click to chat!';

    const canvas = document.createElement('div');
    canvas.className = 'pet-canvas';
    canvas.style.width = (8 * PIXEL_SIZE) + 'px';
    canvas.style.height = (8 * PIXEL_SIZE) + 'px';

    // Generate box-shadow pixel art
    const shadows = [];
    sprite.forEach(function (v, i) {
      if (v === 0) return;
      const x = (i % 8) * PIXEL_SIZE;
      const y = Math.floor(i / 8) * PIXEL_SIZE;
      shadows.push(x + 'px ' + y + 'px 0 ' + COLORS[v]);
    });
    canvas.style.boxShadow = shadows.join(',');
    canvas.style.width = PIXEL_SIZE + 'px';
    canvas.style.height = PIXEL_SIZE + 'px';
    canvas.style.margin = '0';

    // Speech indicator
    const indicator = document.createElement('div');
    indicator.className = 'pet-indicator';
    indicator.textContent = '💬';

    pet.appendChild(canvas);
    pet.appendChild(indicator);
    return pet;
  }

  // ---- Build chat UI ----
  function buildChat() {
    const chat = document.createElement('div');
    chat.className = 'pet-chat';
    chat.innerHTML = ''
      + '<div class="pet-chat-header">'
      + '  <span>Pixel Pet</span>'
      + '  <button class="pet-chat-close">&times;</button>'
      + '</div>'
      + '<div class="pet-chat-body">'
      + '  <div class="pet-chat-msg pet-msg-bot">Yo! Ask me anything~ 🎮</div>'
      + '</div>'
      + '<div class="pet-chat-input">'
      + '  <input type="text" class="pet-input" placeholder="Say something..." maxlength="200">'
      + '  <button class="pet-send-btn">Send</button>'
      + '</div>';
    return chat;
  }

  // ---- Insert into page ----
  const petEl = buildPet();
  const chatEl = buildChat();
  document.body.appendChild(petEl);
  document.body.appendChild(chatEl);

  // ---- State ----
  let chatOpen = false;

  // ---- Toggle chat ----
  petEl.addEventListener('click', function () {
    chatOpen = !chatOpen;
    if (chatOpen) {
      chatEl.classList.add('open');
      petEl.classList.add('active');
      chatEl.querySelector('.pet-input').focus();
    } else {
      chatEl.classList.remove('open');
      petEl.classList.remove('active');
    }
  });

  // Close button
  chatEl.querySelector('.pet-chat-close').addEventListener('click', function (e) {
    e.stopPropagation();
    chatOpen = false;
    chatEl.classList.remove('open');
    petEl.classList.remove('active');
  });

  // ---- Chat logic ----
  var isWaiting = false;
  const bodyEl = chatEl.querySelector('.pet-chat-body');
  const inputEl = chatEl.querySelector('.pet-input');
  const sendBtn = chatEl.querySelector('.pet-send-btn');

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = 'pet-chat-msg pet-msg-' + role;
    div.textContent = text;
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function setThinking(on) {
    isWaiting = on;
    sendBtn.disabled = on;
    inputEl.disabled = on;
    if (on) {
      sendBtn.textContent = '...';
    } else {
      sendBtn.textContent = 'Send';
      inputEl.focus();
    }
  }

  function sendMessage() {
    if (isWaiting) return;
    var text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    inputEl.value = '';

    // Remove old bot messages (keep one Q&A)
    var oldBots = bodyEl.querySelectorAll('.pet-msg-bot');
    for (var i = 0; i < oldBots.length - 1; i++) {
      oldBots[i].remove();
    }

    setThinking(true);

    fetch(AI_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AI_CONFIG.apiKey,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: petSoul },
          { role: 'user', content: text }
        ],
        temperature: 0.9,
        stream: false,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setThinking(false);
        var reply = (data.choices && data.choices[0] && data.choices[0].message.content)
          || '(zzz... pet is sleeping)';
        addMessage(reply, 'bot');
      })
      .catch(function () {
        setThinking(false);
        addMessage('(connection lost... try again!)', 'bot');
      });
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage();
  });

  // ---- Pet idle animations ----
  var mood = 0;
  var moods = ['💬', '✨', '💤', '❤️'];
  setInterval(function () {
    mood = (mood + 1) % moods.length;
    petEl.querySelector('.pet-indicator').textContent = moods[mood];
  }, 4000);

  } // end initPet

})();
