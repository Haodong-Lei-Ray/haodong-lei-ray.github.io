/**
 * Pixel Pet — AI Companion (Cutewind)
 * Sprite-driven：appear → wait ⇄ chat
 */

(function () {
  'use strict';

  var BASE = 'module/pet/assests/main/animate/';
  var STATE_WAIT = 'wait';
  var STATE_CHAT = 'chat';
  var CHAT_CLIP_COUNT = 3; // chat1.gif … chat3.gif
  var chatClipIndex = 0;

  // GIF durations in milliseconds (based on original MP4 durations)
  var GIF_DURATIONS = {
    'appear/appear1.gif': 5100,
    'wait/wait1.gif': 3100,
    'chat/chat1.gif': 10100,
    'chat/chat2.gif': 5100,
    'chat/chat3.gif': 5900
  };

  var petSoul = '';
  var petOpeningWord = 'Yo! Ask me anything~ 🎮';
  var petName = 'Pixel Pet';
  var waitBubbleText = '';
  var petInject = '';
  var pageContext = '';
  var petEl, videoEl, chatEl, bubbleEl;
  var chatOpen = false;
  var currentState = '';
  var isWaiting = false;
  var bubbleTimer = null;

  // ---- Model selection -------------------------------------------------
  var MODELS = (typeof AI_CONFIG !== 'undefined' && AI_CONFIG.models) || [];
  var currentModel = MODELS[0] || null; // overridden by region detection on load

  // Label shown in the dropdown — region-locked models get a tag.
  function modelLabel(m) {
    if (m.foreignOnly) return m.label + ' (outside China only)';
    if (m.cnOnly) return m.label + ' (China only)';
    return m.label;
  }

  // Detect whether the visitor is on a China network. China IP → glm, else gemini.
  // Fail-safe to 'CN' (glm): if the geo lookup is blocked/slow we assume China,
  // because foreign models would be unreachable there anyway.
  function detectRegion() {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function (region) { if (!done) { done = true; resolve(region); } };
      // hard timeout so the chat is never blocked waiting on geo-IP
      setTimeout(function () { finish('CN'); }, 3000);
      fetch('https://ipapi.co/json/', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var cc = (d && (d.country_code || d.country) || '').toUpperCase();
          finish(cc === 'CN' ? 'CN' : 'OTHER');
        })
        .catch(function () { finish('CN'); });
    });
  }

  // Resolve the configured default model id for a region into a MODELS entry.
  function defaultModelFor(region) {
    var defs = (AI_CONFIG && AI_CONFIG.defaults) || {};
    var wantId = region === 'OTHER' ? defs.foreign : defs.cn;
    var hit = MODELS.filter(function (m) { return m.model === wantId; })[0];
    return hit || MODELS[0] || null;
  }

  // Unified chat call — branches on the provider's `api` shape.
  // Returns a Promise resolving to the reply text.
  function callModel(sel, systemPrompt, history) {
    var provider = (AI_CONFIG.providers || {})[sel.provider];
    if (!provider) return Promise.reject(new Error('unknown provider: ' + sel.provider));

    if (provider.api === 'gemini') {
      // Google native generateContent: system_instruction + contents[{role,parts}]
      var url = provider.baseUrl + '/models/' + sel.model + ':generateContent';
      var contents = history.map(function (m) {
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        };
      });
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': provider.apiKey
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { temperature: 0.9 }
        })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('Gemini HTTP ' + r.status);
          return r.json();
        })
        .then(function (data) {
          var cand = data.candidates && data.candidates[0];
          var parts = cand && cand.content && cand.content.parts;
          var text = parts && parts.map(function (p) { return p.text || ''; }).join('');
          if (!text) throw new Error('Gemini: empty response');
          return text;
        });
    }

    // default: OpenAI-style /chat/completions (GLM)
    var messages = [{ role: 'system', content: systemPrompt }].concat(history);
    return fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + provider.apiKey
      },
      body: JSON.stringify({
        model: sel.model,
        messages: messages,
        temperature: 0.9,
        stream: false
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('GLM HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var text = data.choices && data.choices[0] && data.choices[0].message.content;
        if (!text) throw new Error('GLM: empty response');
        return text;
      });
  }

  // ---- Load soul + opening word + name + wait bubble + inject.json ----
  Promise.all([
    fetch('module/pet/assests/main/prompt/soul.md?v=' + Date.now()).then(function (r) { return r.text(); }),
    fetch('module/pet/assests/main/prompt/openingword.md?v=' + Date.now()).then(function (r) { return r.text(); }),
    fetch('module/pet/assests/main/prompt/name.txt?v=' + Date.now()).then(function (r) { return r.text(); }),
    fetch('module/pet/assests/main/prompt/wait.txt?v=' + Date.now()).then(function (r) { return r.text(); }),
    fetch('module/pet/assests/main/prompt/inject.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        // Collect all text entries
        var parts = [];
        var textMap = cfg.text || {};
        Object.keys(textMap).forEach(function (k) { parts.push(textMap[k]); });
        // Fetch all file entries (only .txt supported)
        var fileFetches = (cfg.files || []).map(function (path) {
          return fetch(path + '?v=' + Date.now())
            .then(function (r) { return r.text(); })
            .catch(function () { return ''; });
        });
        return Promise.all(fileFetches).then(function (fileTexts) {
          fileTexts.forEach(function (t) { if (t) parts.push(t.trim()); });
          return parts.join('\n\n');
        });
      })
      .catch(function () { return ''; })
  ]).then(function (results) {
    petSoul = results[0].trim();
    petOpeningWord = results[1].trim();
    petName = results[2].trim() || 'Pixel Pet';
    waitBubbleText = results[3].trim();
    petInject = results[4];
    initPet();
  }).catch(function () {
    console.error('Pet: failed to load prompt files');
  });

  // ---- Capture current page text as context (so pet can read the page) ----
  function capturePageContext() {
    // Clone <main>/<body> content, strip the pet's own UI, collapse whitespace
    var src = document.querySelector('main') || document.body;
    if (!src) return '';
    var clone = src.cloneNode(true);
    // Remove pet + chat + scripts/styles from the clone
    var kill = clone.querySelectorAll('.pixel-pet, .pet-chat, script, style, noscript, svg');
    for (var i = 0; i < kill.length; i++) {
      kill[i].parentNode && kill[i].parentNode.removeChild(kill[i]);
    }
    var text = (clone.innerText || clone.textContent || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    var title = document.title || '';
    // Cap length to keep token cost reasonable (~6000 chars)
    if (text.length > 6000) text = text.slice(0, 6000) + '…';
    return '【当前网页：' + title + '】\n' + text;
  }

  // ---- Build pet ----
  function buildPet() {
    var pet = document.createElement('div');
    pet.className = 'pixel-pet';
    pet.title = 'Click to chat!';
    pet.style.cssText = 'position:fixed;bottom:10px;left:10px;right:auto;z-index:999;cursor:pointer;';

    // Use <img> for GIF animations (GIF cannot be played by <video>)
    videoEl = document.createElement('img');
    videoEl.className = 'pet-video';
    videoEl.style.maxWidth = '140px';
    videoEl.style.maxHeight = '140px';
    videoEl.style.width = 'auto';
    videoEl.style.height = 'auto';
    videoEl.style.display = 'block';

    pet.appendChild(videoEl);
    return pet;
  }

  // ---- Build chat ----
  function buildChat() {
    var chat = document.createElement('div');
    chat.className = 'pet-chat';
    chat.style.cssText = 'position:fixed;bottom:170px;left:10px;right:auto;';
    chat.innerHTML = ''
      + '<div class="pet-chat-header">'
      + '  <span>' + petName + '</span>'
      + '  <div class="pet-chat-header-right">'
      + '    <select class="pet-model-select" title="Switch model"></select>'
      + '    <button class="pet-chat-close">&times;</button>'
      + '  </div>'
      + '</div>'
      + '<div class="pet-chat-body">'
      + '  <div class="pet-chat-msg pet-msg-bot">' + petOpeningWord + '</div>'
      + '</div>'
      + '<div class="pet-chat-input">'
      + '  <input type="text" class="pet-input" placeholder="Say something..." maxlength="200">'
      + '  <button class="pet-send-btn">Send</button>'
      + '</div>';
    return chat;
  }

  // ---- Build wait bubble (wind-magic NPC speech) ----
  function buildBubble() {
    var bubble = document.createElement('div');
    bubble.className = 'pet-bubble';
    bubble.innerHTML = ''
      + '<span class="pet-bubble-wind">🌀</span>'
      + '<span class="pet-bubble-text">' + waitBubbleText + '</span>';
    return bubble;
  }

  // ---- Video playback helpers (now using <img> for GIF) ----
  // For GIF: set src and use setTimeout based on known duration to trigger onEnded
  function playVideo(src, loop, onEnded) {
    if (!videoEl) return;
    videoEl.src = src;
    // If there's an onEnded callback and not looping, schedule it after the GIF duration
    if (onEnded && !loop) {
      var relPath = src.replace(BASE, '');
      var duration = GIF_DURATIONS[relPath] || 5000; // fallback 5s
      setTimeout(onEnded, duration);
    }
  }

  function playAppear() {
    playVideo(BASE + 'appear/appear1.gif', false, function () {
      playWait();
    });
  }

  function playWait() {
    currentState = STATE_WAIT;
    playVideo(BASE + 'wait/wait1.gif', true);
  }

  function playChat() {
    currentState = STATE_CHAT;
    chatClipIndex = 0;
    playNextChatClip();
  }

  // Round-robin through chat1 → chat2 → chat3 → chat1 … while in chat state
  function playNextChatClip() {
    if (currentState !== STATE_CHAT) return; // chat closed → stop cycling
    var n = chatClipIndex + 1; // 1-based filename (chat1.gif …)
    chatClipIndex = (chatClipIndex + 1) % CHAT_CLIP_COUNT;
    playVideo(BASE + 'chat/chat' + n + '.gif', false, playNextChatClip);
  }

  // ---- Wait bubble: blink in every 10s like a pixel-game NPC ----
  function startBubbleLoop() {
    if (bubbleTimer) clearInterval(bubbleTimer);
    bubbleTimer = setInterval(function () {
      // Only show while idle in wait state (not chatting)
      if (chatOpen || currentState !== STATE_WAIT) return;
      flashBubble();
    }, 10000);
  }

  function flashBubble() {
    if (!bubbleEl) return;
    bubbleEl.classList.add('show');
    setTimeout(function () {
      bubbleEl.classList.remove('show');
    }, 3500); // visible for 3.5s, then fades out
  }

  function hideBubble() {
    if (bubbleEl) bubbleEl.classList.remove('show');
  }

  // ---- Init ----
  function initPet() {
    pageContext = capturePageContext();

    petEl = buildPet();
    chatEl = buildChat();
    bubbleEl = buildBubble();
    document.body.appendChild(petEl);
    document.body.appendChild(chatEl);
    document.body.appendChild(bubbleEl);

    // Bind chat controls
    bindChat();

    // Populate the model dropdown + pick a default by region (China → glm, else gemini)
    var modelSel = chatEl.querySelector('.pet-model-select');
    if (modelSel) {
      MODELS.forEach(function (m, i) {
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = modelLabel(m);
        modelSel.appendChild(opt);
      });
      modelSel.addEventListener('change', function () {
        currentModel = MODELS[parseInt(modelSel.value, 10)] || currentModel;
      });
      detectRegion().then(function (region) {
        var def = defaultModelFor(region);
        if (def) {
          currentModel = def;
          modelSel.value = String(MODELS.indexOf(def));
        }
      });
    }

    // Play appear → wait on load
    playAppear();

    // Start NPC-style bubble blink loop
    startBubbleLoop();

    // ---- Chat logic ----
    var bodyEl = chatEl.querySelector('.pet-chat-body');
    var inputEl = chatEl.querySelector('.pet-input');
    var sendBtn = chatEl.querySelector('.pet-send-btn');

    function addMessage(text, role) {
      var div = document.createElement('div');
      div.className = 'pet-chat-msg pet-msg-' + role;
      div.textContent = text;
      bodyEl.appendChild(div);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function setThinking(on) {
      isWaiting = on;
      sendBtn.disabled = on;
      inputEl.disabled = on;
      sendBtn.textContent = on ? '...' : 'Send';
      if (!on) inputEl.focus();
    }

    var chatHistory = [];

    function sendMessage() {
      if (isWaiting) return;
      var text = inputEl.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      inputEl.value = '';
      chatHistory.push({ role: 'user', content: text });
      setThinking(true);

      var systemPrompt = petSoul;
      if (petInject) {
        systemPrompt += '\n\n【额外背景信息】\n' + petInject;
      }
      if (pageContext) {
        systemPrompt += '\n\n你正在这个网页上陪伴主人，可以参考以下网页内容来回答关于主人的问题：\n' + pageContext;
      }

      if (!currentModel) {
        setThinking(false);
        chatHistory.pop();
        addMessage('(no model configured...)', 'bot');
        return;
      }

      callModel(currentModel, systemPrompt, chatHistory)
        .then(function (reply) {
          setThinking(false);
          reply = reply || '(zzz... pet is sleeping)';
          chatHistory.push({ role: 'assistant', content: reply });
          addMessage(reply, 'bot');
        })
        .catch(function () {
          setThinking(false);
          chatHistory.pop(); // remove the failed user message from history
          addMessage('(connection lost... zzz 🐾) network failure — maybe you should change the model ↑', 'bot');
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // ---- Toggle chat ----
  function bindChat() {
    petEl.addEventListener('click', function () {
      chatOpen = !chatOpen;
      if (chatOpen) {
        hideBubble();
        chatEl.classList.add('open');
        petEl.classList.add('active');
        chatEl.querySelector('.pet-input').focus();
        playChat();
      } else {
        chatEl.classList.remove('open');
        petEl.classList.remove('active');
        playWait();
      }
    });

    chatEl.querySelector('.pet-chat-close').addEventListener('click', function (e) {
      e.stopPropagation();
      chatOpen = false;
      chatEl.classList.remove('open');
      petEl.classList.remove('active');
      playWait();
    });
  }

})();
