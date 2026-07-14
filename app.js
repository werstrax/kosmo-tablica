/* ==========================================================================
   Космо-Таблица — логика приложения
   Ваниль JS, без библиотек. Прогресс хранится в localStorage.
   Философия: НЕ зубрёжка. Сначала фокусы-секреты, потом умная тренировка,
   которая сама подсовывает трудные примеры и показывает нужный приём.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- Состояние и хранилище ---------------- */
  const STORE_KEY = "kosmo_tablica_v1";
  const MAX = 10; // таблица до 10

  const defaultState = () => ({
    name: "друг",
    stars: 0,
    bestStreak: 0,
    mastery: {},        // "a_b" -> 0..3
    lessonsSeen: {},     // id секрета -> true
    mascot: "🐨"
  });

  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {}
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
  }
  function key(a, b) { return a + "_" + b; }
  function getMastery(a, b) { return S.mastery[key(a, b)] || 0; }
  function setMastery(a, b, lvl) {
    lvl = Math.max(0, Math.min(3, lvl));
    S.mastery[key(a, b)] = lvl;
    // Умножение коммутативно: если знаешь 3×7 — почти знаешь 7×3.
    const back = key(b, a);
    if ((S.mastery[back] || 0) < lvl - 1) S.mastery[back] = lvl - 1;
    save();
  }

  /* ---------------- Утилиты ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  function randInt(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[randInt(arr.length)]; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------------- Звук (мягкий, через Web Audio) ---------------- */
  let audioCtx = null;
  function beep(freq, dur, type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  const sndGood = () => { beep(660, 0.12); setTimeout(() => beep(880, 0.16), 90); };
  const sndBad = () => beep(180, 0.25, "triangle");
  const sndWin = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 120)); };

  /* ---------------- Уровни игрока ---------------- */
  function levelName(known) {
    if (known >= 90) return "🏆 Профессор";
    if (known >= 70) return "🚀 Космонавт";
    if (known >= 45) return "🌟 Знаток";
    if (known >= 20) return "📈 Ученик";
    return "🐣 Новичок";
  }

  function countKnown() {
    let known = 0, learn = 0;
    for (let a = 1; a <= MAX; a++)
      for (let b = 1; b <= MAX; b++) {
        const m = getMastery(a, b);
        if (m >= 3) known++;
        else if (m >= 1) learn++;
      }
    return { known, learn, total: MAX * MAX };
  }

  function addStars(n) {
    S.stars += n;
    save();
    const badge = $("#starsBadge");
    $("#starCount").textContent = S.stars;
    badge.classList.add("pop");
    setTimeout(() => badge.classList.remove("pop"), 260);
  }

  /* ==========================================================================
     СЕКРЕТЫ-ФОКУСЫ (методики запоминания)
     ========================================================================== */
  const TRICKS = [
    {
      id: "x1", emo: "1️⃣", title: "Умножаем на 1", sub: "Число не меняется",
      body: () => `
        <p>Умножить на <b>1</b> — самый лёгкий фокус в мире! Число остаётся <b>таким же</b>.</p>
        <div class="demo-box"><div class="big-eq">7 × <span class="hl">1</span> = 7</div></div>
        <div class="step"><span class="n">💡</span><div>Один раз взяли 7 конфет — значит у нас 7 конфет. Вот и всё!</div></div>
        <p class="muted">Так что вся строчка на 1 уже выучена 🎉</p>`
    },
    {
      id: "x10", emo: "🔟", title: "Умножаем на 10", sub: "Просто дорисуй ноль",
      body: () => `
        <p>Умножить на <b>10</b> — дорисуй справа <b>ноль</b>. И готово!</p>
        <div class="demo-box"><div class="big-eq">6 × <span class="hl">10</span> = 6<span class="hl">0</span></div></div>
        <div class="step"><span class="n">💡</span><div>8 → 8<b>0</b>, &nbsp; 4 → 4<b>0</b>, &nbsp; 9 → 9<b>0</b>. Ноль — как подарок!</div></div>`
    },
    {
      id: "x2", emo: "👯", title: "Умножаем на 2", sub: "Это удвоение",
      body: () => `
        <p>Умножить на <b>2</b> — это <b>прибавить число само к себе</b> (удвоить).</p>
        <div class="demo-box"><div class="big-eq">2 × 7 = 7 + 7 = <span class="hl">14</span></div></div>
        <div class="step"><span class="n">💡</span><div>Как близнецы: было одно — стало два одинаковых. 6+6=12, 8+8=16.</div></div>`
    },
    {
      id: "x4", emo: "🎿", title: "Умножаем на 4", sub: "Удвой два раза",
      body: () => `
        <p>Умножить на <b>4</b> — <b>удвой, а потом ещё раз удвой</b>.</p>
        <div class="demo-box"><div class="big-eq">4 × 7 → 7+7=<b>14</b> → 14+14=<span class="hl">28</span></div></div>
        <div class="step"><span class="n">1</span><div>Сначала удвоили 7 → получили 14.</div></div>
        <div class="step"><span class="n">2</span><div>Удвоили 14 → получили 28. Готово!</div></div>`
    },
    {
      id: "x5", emo: "🕐", title: "Умножаем на 5", sub: "Как часики: 5,10,15…",
      body: () => `
        <p>На <b>5</b> ответ всегда заканчивается на <b>0</b> или <b>5</b> — прямо как минуты на часах!</p>
        <div class="demo-box">
          <div class="big-eq">5 · 1=5 · 2=<span class="hl">10</span> · 3=15 · 4=<span class="hl">20</span> · 5=25…</div>
        </div>
        <div class="step"><span class="n">✨</span><div><b>Супер-фокус:</b> умножаешь 5 на чётное — возьми половинку и допиши ноль. 5×8 → половина 8 это 4 → <b>40</b>.</div></div>
        <div class="step"><span class="n">✨</span><div>5 на нечётное — заканчивается на <b>5</b>. 5×7 = 35.</div></div>`
    },
    {
      id: "x9", emo: "🖐️", title: "Умножаем на 9 — волшебные пальцы", sub: "Самый крутой фокус!",
      interactive: "fingers",
      body: () => `
        <p><b>Разложи 10 пальцев.</b> Чтобы посчитать <b>9 × N</b> — загни <b>N-й палец</b> слева.</p>
        <p>Пальцы <b>слева</b> от загнутого — это <b>десятки</b>, а <b>справа</b> — <b>единицы</b>. Магия! 🪄</p>
        <div id="fingerDemo"></div>
        <div class="slider-row">
          <b>9 ×</b>
          <input type="range" id="fingerSlider" min="1" max="9" value="3" />
          <b><span id="fingerN">3</span></b>
        </div>
        <div class="demo-box"><div class="big-eq" id="fingerEq"></div></div>
        <div class="step"><span class="n">💡</span><div>Ещё проще: у ответа <b>первая цифра на 1 меньше</b>, а две цифры <b>вместе дают 9</b>. 9×6 → 5_ и 5+4=9 → <b>54</b>.</div></div>`
    },
    {
      id: "x3", emo: "🎈", title: "Умножаем на 3", sub: "Удвой и добавь ещё разок",
      body: () => `
        <p>Умножить на <b>3</b> — это <b>два раза</b> плюс <b>ещё один раз</b>.</p>
        <div class="demo-box"><div class="big-eq">3 × 6 = (6+6) + 6 = 12 + 6 = <span class="hl">18</span></div></div>
        <div class="step"><span class="n">💡</span><div>Сначала удвой (это ×2), потом прибавь само число.</div></div>`
    },
    {
      id: "flip", emo: "🔁", title: "Переставляй множители", sub: "Режет таблицу пополам!",
      body: () => `
        <p>От перестановки ответ <b>не меняется</b>: <b>8 × 3</b> — это то же самое, что <b>3 × 8</b>.</p>
        <div class="demo-box"><div class="big-eq">8 × 3 = <span class="hl">3 × 8</span> = 24</div></div>
        <div class="step"><span class="n">💡</span><div>Если пример кажется трудным — <b>переверни</b> его! Часто так вспомнить легче. И учить надо в <b>2 раза меньше</b> 🎉</div></div>`
    },
    {
      id: "squares", emo: "⬜", title: "Квадраты — число на само себя", sub: "Красивая диагональ",
      body: () => `
        <p>Когда число умножают <b>само на себя</b> — это «квадрат». Их приятно знать наизусть:</p>
        <div class="demo-box"><div class="big-eq" style="font-size:1.3rem;line-height:1.8">
          2×2=4 · 3×3=9 · 4×4=16<br>5×5=25 · 6×6=<span class="hl">36</span> · 7×7=<span class="hl">49</span><br>8×8=<span class="hl">64</span> · 9×9=81 · 10×10=100
        </div></div>
        <div class="step"><span class="n">💡</span><div>Их всего 9. Зная квадраты, легко считать соседей: 6×7 = 6×6 + 6 = 36+6 = 42.</div></div>`
    },
    {
      id: "hard", emo: "🧩", title: "Трудная тройка: 6, 7, 8", sub: "Хитрости и рифмы",
      body: () => `
        <p>Самые «неподатливые» примеры. Разбивай их на лёгкие или запоминай рифмой:</p>
        <div class="demo-box"><div class="big-eq" style="font-size:1.2rem;line-height:1.9">
          <span class="hl">6×7=42</span> &nbsp; 6×8=<b>48</b><br>
          <span class="hl">7×8=56</span> &nbsp; («5-6-7-8» → 56=7·8)<br>
          6×6=36 · 7×7=49 · 8×8=64
        </div></div>
        <div class="step"><span class="n">✨</span><div><b>Разбивай:</b> 6×7 = 6×5 + 6×2 = 30 + 12 = <b>42</b>.</div></div>
        <div class="step"><span class="n">✨</span><div><b>Через 10:</b> 8×7 = 8×10 − 8×3 = 80 − 24 = <b>56</b>.</div></div>`
    }
  ];

  /* ------ Подсказка-стратегия для конкретного примера a×b ------ */
  function strategyFor(a, b) {
    // Ставим больший множитель первым для удобных приёмов
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const ans = a * b;

    if (lo === 1) return { emo: "1️⃣", title: "Умножение на 1", text: `На 1 число не меняется. Ответ — ${hi}.` };
    if (b === 10 || a === 10) return { emo: "🔟", title: "Умножение на 10", text: `Допиши ноль справа: ${hi} → <b>${hi}0</b>.` };
    if (lo === 2) return { emo: "👯", title: "Удвоение", text: `Это ${hi}+${hi} = <b>${ans}</b>.` };
    if (lo === 5) {
      if (hi % 2 === 0) return { emo: "🕐", title: "Фокус пятёрки", text: `Половина от ${hi} — это ${hi/2}, допиши ноль → <b>${(hi/2)}0</b>.` };
      return { emo: "🕐", title: "Фокус пятёрки", text: `На 5 нечётное заканчивается на 5. Считай: 5,10,…,${ans}. Ответ <b>${ans}</b>.` };
    }
    if (lo === 9 || hi === 9) {
      const n = (a === 9) ? b : a;
      return { emo: "🖐️", title: "Волшебные пальцы (×9)", text: `9×${n}: первая цифра ${n-1}, а вторая ${10-n} (вместе 9) → <b>${9*n}</b>.` };
    }
    if (lo === 4) return { emo: "🎿", title: "Удвой дважды", text: `${hi}+${hi}=${hi*2}, потом ${hi*2}+${hi*2} = <b>${ans}</b>.` };
    if (lo === 3) return { emo: "🎈", title: "Удвой и добавь", text: `${hi}+${hi}=${hi*2}, плюс ещё ${hi} = <b>${ans}</b>.` };
    if (a === b) return { emo: "⬜", title: "Квадрат", text: `${a} умножаем само на себя = <b>${ans}</b>. Это стоит запомнить!` };
    // 6,7,8 между собой — разбивка через 5
    return {
      emo: "🧩", title: "Разбей на части",
      text: `${hi}×${lo} = ${hi}×5 + ${hi}×${lo-5} = ${hi*5} + ${hi*(lo-5)} = <b>${ans}</b>.`
    };
  }

  /* ==========================================================================
     НАВИГАЦИЯ
     ========================================================================== */
  function go(screen) {
    $$(".screen").forEach(s => s.classList.remove("active"));
    const target = $("#screen-" + screen);
    if (target) target.classList.add("active");
    $$(".nav button").forEach(b => b.classList.toggle("active", b.dataset.go === screen));
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (screen === "home") renderHome();
    if (screen === "tricks") renderTricks();
    if (screen === "practice") startPractice();
    if (screen === "games") showGamesMenu();
    if (screen === "progress") renderProgress();
  }

  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) { go(goEl.dataset.go); return; }
    const gameEl = e.target.closest("[data-game]");
    if (gameEl) { startGame(gameEl.dataset.game); return; }
  });

  /* ==========================================================================
     ГЛАВНАЯ
     ========================================================================== */
  function renderHome() {
    const { known, learn, total } = countKnown();
    const pct = Math.round((known / total) * 100);
    $("#nameInput").value = S.name;
    $("#starCount").textContent = S.stars;
    $("#ringPct").textContent = pct;
    $("#ring").style.setProperty("--p", pct);
    $("#knownCount").textContent = known;
    $("#learnCount").textContent = learn;
    $("#streakCount").textContent = S.bestStreak;
    $("#levelName").textContent = levelName(known);
    $("#mascot").textContent = S.mascot;

    const mottos = [
      "Давай сегодня подружимся с таблицей умножения ✨",
      "Каждый день — по чуть-чуть, и ты станешь профи! 🚀",
      "Помни: это не зубрёжка, а весёлые фокусы 🪄",
      "Ты уже молодец, что учишься! Продолжаем 💪"
    ];
    $("#homeMotto").textContent = pct >= 100
      ? "🏆 Ты выучила ВСЮ таблицу! Ты чемпион!"
      : pick(mottos);
  }

  // редактирование имени
  document.addEventListener("input", (e) => {
    if (e.target.id === "nameInput") {
      S.name = e.target.value.trim() || "друг";
      save();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "nameInput" && !e.target.value.trim()) {
      e.target.value = "друг";
    }
  });
  // смена маскота по клику
  document.addEventListener("click", (e) => {
    if (e.target.id === "mascot") {
      const zoo = ["🐨","🦊","🐰","🐼","🦄","🐯","🐣","🐙","🦁","🐸"];
      const i = zoo.indexOf(S.mascot);
      S.mascot = zoo[(i + 1) % zoo.length];
      e.target.textContent = S.mascot;
      save();
      beep(520, 0.1);
    }
  });

  /* ==========================================================================
     СЕКРЕТЫ
     ========================================================================== */
  function renderTricks() {
    const host = $("#tricksList");
    host.innerHTML = "";
    TRICKS.forEach(t => {
      const seen = S.lessonsSeen[t.id];
      const card = el("button", "trick-card");
      card.innerHTML = `
        <span class="emo">${t.emo}</span>
        <span>
          <div class="tt">${t.title}</div>
          <div class="ts">${t.sub}</div>
        </span>
        ${seen ? '<span class="seen">✓</span>' : ''}`;
      card.addEventListener("click", () => openTrick(t.id));
      host.appendChild(card);
    });
  }

  function openTrick(id) {
    const t = TRICKS.find(x => x.id === id);
    if (!t) return;
    const modal = $("#modal");
    modal.innerHTML = `
      <button class="close" id="modalClose">✕</button>
      <h2><span class="emo">${t.emo}</span>${t.title}</h2>
      ${t.body()}
      <div class="spacer"></div>
      <button class="btn wide" id="trickGot">Понятно! ${!S.lessonsSeen[id] ? '(+2 ⭐)' : ''}</button>
    `;
    $("#modalBack").classList.add("show");
    $("#modalClose").addEventListener("click", closeModal);
    $("#trickGot").addEventListener("click", () => {
      if (!S.lessonsSeen[id]) {
        S.lessonsSeen[id] = true;
        save();
        addStars(2);
        burstConfetti();
      }
      closeModal();
    });

    if (t.interactive === "fingers") setupFingers();
  }
  function closeModal() { $("#modalBack").classList.remove("show"); }
  $("#modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closeModal(); });

  // Интерактивные пальцы для ×9
  function setupFingers() {
    const slider = $("#fingerSlider");
    const render = () => {
      const n = +slider.value;
      $("#fingerN").textContent = n;
      const host = $("#fingerDemo");
      host.innerHTML = "";
      const hands = el("div", "hands");
      for (let i = 1; i <= 10; i++) {
        if (i === 6) hands.appendChild(el("div", "hand-gap"));
        const f = el("div", "finger");
        if (i === n) { f.classList.add("down"); f.textContent = "✕"; }
        else if (i < n) { f.classList.add("tens"); }
        else { f.classList.add("ones"); }
        hands.appendChild(f);
      }
      host.appendChild(hands);
      const tens = n - 1, ones = 10 - n;
      $("#fingerEq").innerHTML = `9 × ${n} = <span class="hl">${tens}${ones}</span> &nbsp; <small style="font-size:.9rem;color:var(--ink-soft)">(${tens} слева · ${ones} справа)</small>`;
    };
    slider.addEventListener("input", render);
    render();
  }

  /* ==========================================================================
     ТРЕНИРОВКА (адаптивная)
     ========================================================================== */
  let practice = null;

  // Выбираем пример: приоритет — плохо выученным, но иногда повторяем известное.
  function nextQuestion(avoid) {
    const pool = [];
    for (let a = 2; a <= MAX; a++) {
      for (let b = 2; b <= MAX; b++) {
        const m = getMastery(a, b);
        // вес: чем меньше знаем — тем чаще. +1 базово.
        let w = (3 - m) * 3 + 1;
        const k = key(a, b);
        if (avoid && avoid === k) w = 0; // не повторять тот же пример подряд
        for (let i = 0; i < w; i++) pool.push([a, b]);
      }
    }
    // немного лёгких (×1, ×10) для уверенности
    if (Math.random() < 0.15) {
      const easyB = pick([1, 10]);
      pool.push([pick([2,3,4,5,6,7,8,9]), easyB]);
    }
    return pick(pool);
  }

  function makeOptions(ans) {
    const set = new Set([ans]);
    const cands = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 3, ans - 3];
    shuffle(cands);
    for (const c of cands) {
      if (set.size >= 4) break;
      if (c > 0 && c <= 100) set.add(c);
    }
    while (set.size < 4) set.add(randInt(100) + 1);
    return shuffle(Array.from(set));
  }

  function startPractice() {
    practice = { total: 0, correct: 0, streak: 0, last: null };
    renderQuestion($("#practiceCard"), practice, () => go("progress"));
  }

  function renderQuestion(host, sess, onExit) {
    const [a, b] = nextQuestion(sess.last);
    sess.last = key(a, b);
    sess.a = a; sess.b = b;
    const ans = a * b;
    const options = makeOptions(ans);

    host.innerHTML = `
      <div class="qbar">
        <button class="btn ghost" id="qExit">← Выйти</button>
        <div class="qprogress"><span style="width:${Math.min(100, sess.correct * 10)}%"></span></div>
        <div class="stat">✅ <b id="qScore">${sess.correct}</b></div>
      </div>
      <div class="question" id="qText">${a} × ${b}</div>
      <div class="answers" id="qAnswers"></div>
      <button class="btn ghost hint-btn" id="hintBtn">🤔 Показать секрет</button>
      <div class="hint-box" id="hintBox"></div>
      <div class="feedback" id="qFeedback"></div>
    `;
    const answersHost = $("#qAnswers", host);
    options.forEach(opt => {
      const btn = el("button", "ans", opt);
      btn.addEventListener("click", () => onAnswer(btn, opt, ans, host, sess, onExit));
      answersHost.appendChild(btn);
    });
    $("#qExit", host).addEventListener("click", onExit);
    $("#hintBtn", host).addEventListener("click", () => {
      const s = strategyFor(a, b);
      const box = $("#hintBox", host);
      box.innerHTML = `<h4>${s.emo} ${s.title}</h4><div>${s.text}</div>`;
      box.classList.add("show");
    });
  }

  function onAnswer(btn, chosen, ans, host, sess, onExit) {
    const answered = $$(".ans", host).some(b => b.disabled);
    if (answered) return;
    $$(".ans", host).forEach(b => b.disabled = true);
    sess.total++;
    const q = $("#qText", host);
    const fb = $("#qFeedback", host);
    const a = sess.a, b = sess.b;

    if (chosen === ans) {
      btn.classList.add("correct");
      q.classList.add("pop");
      sess.correct++;
      sess.streak++;
      if (sess.streak > S.bestStreak) { S.bestStreak = sess.streak; }
      setMastery(a, b, getMastery(a, b) + 1);
      addStars(1);
      sndGood();
      fb.className = "feedback good";
      fb.textContent = pick(["Верно! 🎉", "Супер! ⭐", "Красота! 💫", "Молодец! 👏", "Точно в цель! 🎯"]);
      $("#qScore", host).textContent = sess.correct;
      if (sess.streak > 0 && sess.streak % 5 === 0) burstConfetti();
    } else {
      btn.classList.add("wrong");
      q.classList.add("shake");
      sess.streak = 0;
      setMastery(a, b, Math.max(1, getMastery(a, b) - 1));
      sndBad();
      // подсветить верный
      $$(".ans", host).forEach(x => { if (+x.textContent === ans) x.classList.add("correct"); });
      fb.className = "feedback bad";
      const s = strategyFor(a, b);
      fb.innerHTML = `Правильно: <b>${ans}</b>. ${s.emo} ${s.text}`;
    }
    save();
    setTimeout(() => renderQuestion(host, sess, onExit), chosen === ans ? 850 : 2600);
  }

  /* ==========================================================================
     ИГРЫ
     ========================================================================== */
  function showGamesMenu() {
    $("#gamesMenu").style.display = "";
    $("#gameCard").style.display = "none";
  }
  function startGame(g) {
    $("#gamesMenu").style.display = "none";
    const host = $("#gameCard");
    host.style.display = "";
    if (g === "battle") startBattle(host);
    if (g === "pairs") startPairs(host);
  }

  /* ------ Космо-битва: сколько верных за 60 секунд ------ */
  function startBattle(host) {
    const sess = { total: 0, correct: 0, streak: 0, last: null, time: 60, timer: null, over: false };
    const tick = () => {
      sess.time--;
      const chip = $("#battleTimer", host);
      if (chip) chip.textContent = "⏱️ " + sess.time;
      if (sess.time <= 0) endBattle();
    };
    sess.timer = setInterval(tick, 1000);

    function draw() {
      if (sess.over) return;
      const [a, b] = nextQuestion(sess.last);
      sess.last = key(a, b); sess.a = a; sess.b = b;
      const ans = a * b;
      const options = makeOptions(ans);
      host.innerHTML = `
        <div class="qbar">
          <button class="btn ghost" id="bExit">← Выйти</button>
          <div class="timer-chip" id="battleTimer">⏱️ ${sess.time}</div>
          <div class="stat">✅ <b id="bScore">${sess.correct}</b></div>
        </div>
        <div class="question" id="bText">${a} × ${b}</div>
        <div class="answers" id="bAnswers"></div>
        <div class="feedback" id="bFeed"></div>`;
      const ah = $("#bAnswers", host);
      options.forEach(opt => {
        const btn = el("button", "ans", opt);
        btn.addEventListener("click", () => {
          if (sess.over) return;
          sess.total++;
          if (opt === ans) {
            sess.correct++; sess.streak++;
            setMastery(a, b, getMastery(a, b) + 1);
            addStars(1); sndGood();
            $("#bScore", host).textContent = sess.correct;
            $("#bText", host).classList.add("pop");
          } else {
            sess.streak = 0;
            setMastery(a, b, Math.max(1, getMastery(a, b) - 1));
            sndBad();
            btn.classList.add("wrong");
          }
          if (sess.correct > S.bestStreak) S.bestStreak = Math.max(S.bestStreak, sess.streak);
          save();
          setTimeout(draw, opt === ans ? 250 : 550);
        });
        ah.appendChild(btn);
      });
      $("#bExit", host).addEventListener("click", () => { clearInterval(sess.timer); sess.over = true; showGamesMenu(); });
    }

    function endBattle() {
      clearInterval(sess.timer);
      sess.over = true;
      const bonus = sess.correct * 2;
      addStars(bonus);
      sndWin();
      burstConfetti();
      let emoji = sess.correct >= 20 ? "🏆" : sess.correct >= 12 ? "🚀" : sess.correct >= 6 ? "🌟" : "💪";
      host.innerHTML = `
        <div class="center">
          <div class="result-emoji">${emoji}</div>
          <h2>Время вышло!</h2>
          <p>Правильных ответов: <b style="font-size:1.4rem">${sess.correct}</b></p>
          <p>Бонус к звёздам: <b>+${bonus} ⭐</b></p>
          <div class="row" style="justify-content:center">
            <button class="btn" id="againBtn">🔁 Ещё раз</button>
            <button class="btn ghost" id="menuBtn">🎮 К играм</button>
          </div>
        </div>`;
      $("#againBtn", host).addEventListener("click", () => startBattle(host));
      $("#menuBtn", host).addEventListener("click", showGamesMenu);
    }

    draw();
  }

  /* ------ Найди пару: пример ↔ ответ ------ */
  function startPairs(host) {
    // берём 6 примеров с приоритетом «трудных»
    const chosen = [];
    const usedAns = new Set();
    let guard = 0;
    while (chosen.length < 6 && guard++ < 200) {
      const [a, b] = nextQuestion(null);
      const ans = a * b;
      if (usedAns.has(ans)) continue;   // чтобы ответы не повторялись
      usedAns.add(ans);
      chosen.push({ a, b, ans });
    }
    let cards = [];
    chosen.forEach((c, i) => {
      cards.push({ id: i, kind: "q", text: `${c.a}×${c.b}` });
      cards.push({ id: i, kind: "a", text: "" + c.ans });
    });
    shuffle(cards);

    const sess = { flipped: [], matched: 0, moves: 0 };
    host.innerHTML = `
      <div class="qbar">
        <button class="btn ghost" id="pExit">← Выйти</button>
        <div class="stat">🃏 Пары: <b id="pMatched">0</b>/6</div>
        <div class="stat">🎯 <b id="pMoves">0</b></div>
      </div>
      <p class="center muted">Соедини пример с его ответом!</p>
      <div class="pairs-grid" id="pairsGrid"></div>
      <div class="feedback center" id="pFeed"></div>`;

    const grid = $("#pairsGrid", host);
    cards.forEach((c, idx) => {
      const btn = el("button", "pair-card");
      btn.dataset.idx = idx;
      btn.dataset.pid = c.id;
      btn.textContent = "?";
      btn.addEventListener("click", () => flip(btn, c));
      grid.appendChild(btn);
    });
    $("#pExit", host).addEventListener("click", showGamesMenu);

    function flip(btn, c) {
      if (btn.classList.contains("flipped") || btn.classList.contains("done")) return;
      if (sess.flipped.length >= 2) return;
      btn.classList.add("flipped");
      btn.textContent = c.text;
      sess.flipped.push({ btn, c });
      beep(600, 0.08);
      if (sess.flipped.length === 2) {
        sess.moves++;
        $("#pMoves", host).textContent = sess.moves;
        const [x, y] = sess.flipped;
        if (x.c.id === y.c.id && x.c.kind !== y.c.kind) {
          // пара!
          setTimeout(() => {
            x.btn.classList.add("done"); y.btn.classList.add("done");
            sess.flipped = [];
            sess.matched++;
            $("#pMatched", host).textContent = sess.matched;
            sndGood();
            addStars(1);
            if (sess.matched === 6) winPairs();
          }, 350);
        } else {
          setTimeout(() => {
            x.btn.classList.remove("flipped"); x.btn.textContent = "?";
            y.btn.classList.remove("flipped"); y.btn.textContent = "?";
            sess.flipped = [];
            sndBad();
          }, 800);
        }
      }
    }

    function winPairs() {
      sndWin(); burstConfetti();
      const bonus = Math.max(3, 15 - sess.moves);
      addStars(bonus);
      $("#pFeed", host).innerHTML = `🎉 Все пары найдены за ${sess.moves} ходов! <b>+${bonus} ⭐</b>`;
      setTimeout(() => {
        host.innerHTML += "";
        const again = el("div", "center");
        again.style.marginTop = "12px";
        again.innerHTML = `<button class="btn" id="pAgain">🔁 Ещё раз</button> <button class="btn ghost" id="pMenu">🎮 К играм</button>`;
        host.appendChild(again);
        $("#pAgain", host).addEventListener("click", () => startPairs(host));
        $("#pMenu", host).addEventListener("click", showGamesMenu);
      }, 400);
    }
  }

  /* ==========================================================================
     ПРОГРЕСС (карта 10x10)
     ========================================================================== */
  function renderProgress() {
    const host = $("#gridHost");
    const table = el("table", "mult-grid");
    // шапка
    let head = "<tr><th>×</th>";
    for (let b = 1; b <= MAX; b++) head += `<th>${b}</th>`;
    head += "</tr>";
    let rows = "";
    for (let a = 1; a <= MAX; a++) {
      rows += `<tr><th>${a}</th>`;
      for (let b = 1; b <= MAX; b++) {
        const m = getMastery(a, b);
        rows += `<td class="l${m}" title="${a}×${b}=${a*b}">${a * b}</td>`;
      }
      rows += "</tr>";
    }
    table.innerHTML = head + rows;
    host.innerHTML = "";
    host.appendChild(table);
  }

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Точно сбросить весь прогресс и звёзды? Это не отменить.")) {
      const name = S.name, mascot = S.mascot;
      S = defaultState();
      S.name = name; S.mascot = mascot;
      save();
      renderProgress();
      go("home");
    }
  });

  /* ==========================================================================
     КОНФЕТТИ
     ========================================================================== */
  const cv = $("#confetti");
  const ctx = cv.getContext("2d");
  let confetti = [];
  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  window.addEventListener("resize", resize); resize();

  function burstConfetti() {
    const colors = ["#ff7ac6", "#ffd166", "#37d67a", "#4ec6ff", "#7b5cff"];
    for (let i = 0; i < 90; i++) {
      confetti.push({
        x: cv.width / 2 + (Math.random() - 0.5) * 200,
        y: cv.height / 3,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -9 - 3,
        g: 0.28 + Math.random() * 0.1,
        size: 5 + Math.random() * 7,
        color: pick(colors),
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        life: 90 + Math.random() * 40
      });
    }
    if (!confetti._running) loopConfetti();
  }
  function loopConfetti() {
    confetti._running = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    confetti = confetti.filter(p => p.life > 0);
    confetti.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (confetti.length > 0) requestAnimationFrame(loopConfetti);
    else { confetti._running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ==========================================================================
     СТАРТ
     ========================================================================== */
  renderHome();
  // мягко предложить начать с секретов, если совсем новичок
  window.KosmoTablica = { reset: () => { localStorage.removeItem(STORE_KEY); location.reload(); } };
})();
