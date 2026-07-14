/* ==========================================================================
   Космо-Таблица — логика приложения
   Ваниль JS, без библиотек. Прогресс хранится в localStorage.

   Философия: НЕ зубрёжка, а понятный ПОШАГОВЫЙ КУРС.
   Ребёнок идёт по ступенькам: ×2 → ×10 → ×5 → ... → «босс».
   На каждой ступеньке: короткий урок понятным языком →
   закрепление → экзамен. Сдал — открывается следующая.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- Состояние и хранилище ---------------- */
  const STORE_KEY = "kosmo_tablica_v2";
  const MAX = 10;

  const defaultState = () => ({
    name: "друг",
    stars: 0,
    bestStreak: 0,
    mastery: {},        // "a_b" -> 0..3
    course: {},          // levelId -> { done:true, best:N }
    mascot: "🐨"
  });

  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
      // мягкая миграция со старой версии
      const old = localStorage.getItem("kosmo_tablica_v1");
      if (old) {
        const o = JSON.parse(old);
        const s = defaultState();
        s.name = o.name || s.name; s.stars = o.stars || 0;
        s.mastery = o.mastery || {}; s.mascot = o.mascot || s.mascot;
        return s;
      }
    } catch (e) {}
    return defaultState();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }
  function key(a, b) { return a + "_" + b; }
  function getMastery(a, b) { return S.mastery[key(a, b)] || 0; }
  function setMastery(a, b, lvl) {
    lvl = Math.max(0, Math.min(3, lvl));
    S.mastery[key(a, b)] = lvl;
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

  /* ---------------- Звук ---------------- */
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
    S.stars += n; save();
    const badge = $("#starsBadge");
    $("#starCount").textContent = S.stars;
    badge.classList.add("pop");
    setTimeout(() => badge.classList.remove("pop"), 260);
  }

  /* ==========================================================================
     КУРС — ступеньки. Порядок как в методике: от лёгкого к трудному,
     каждый следующий опирается на предыдущий.
     ========================================================================== */
  const COURSE = [
    {
      id: "x2", n: 2, emoji: "👯", title: "Умножаем на 2", sub: "Удвоение — прибавь число к самому себе",
      lesson: () => lessonSkip(2, `
        <p><b>Умножить на 2 — значит взять число <u>два раза</u>.</b> Это как две одинаковые кучки.</p>
        <div class="demo-box"><div class="big-eq">2 × 6 = 6 + 6 = <span class="hl">12</span></div></div>
        <p>Самый простой способ — <b>прибавить число само к себе</b> (удвоить):</p>
        <div class="step"><span class="n">✨</span><div>2 × 7 → 7 + 7 = <b>14</b> &nbsp;•&nbsp; 2 × 8 → 8 + 8 = <b>16</b></div></div>
        <p>А ещё можно просто считать <b>двойками</b>, как песенку:</p>
      `)
    },
    {
      id: "x10", n: 10, emoji: "🔟", title: "Умножаем на 10", sub: "Дорисуй ноль — и готово",
      lesson: () => lessonSkip(10, `
        <p><b>Самая лёгкая строчка!</b> Чтобы умножить на 10 — просто <b>допиши справа ноль</b>.</p>
        <div class="demo-box"><div class="big-eq">7 × 10 = 7<span class="hl">0</span> &nbsp;•&nbsp; 4 × 10 = 4<span class="hl">0</span></div></div>
        <div class="step"><span class="n">🎁</span><div>Ноль — как подарок, который приклеивается справа. И всё!</div></div>
      `)
    },
    {
      id: "x5", n: 5, emoji: "🕐", title: "Умножаем на 5", sub: "Половина десятки • счёт по 5",
      lesson: () => lessonSkip(5, `
        <p>Ты уже знаешь <b>десятку</b>. А <b>пятёрка — это её половинка!</b></p>
        <div class="demo-box"><div class="big-eq">5 × 6 = (10 × 6) ÷ 2 = 60 ÷ 2 = <span class="hl">30</span></div></div>
        <div class="step"><span class="n">✨</span><div><b>Хитрость:</b> на <b>чётное</b> — ответ круглый (5×4=<b>20</b>). На <b>нечётное</b> — кончается на 5 (5×3=1<b>5</b>).</div></div>
        <p>И проще всего — считать <b>пятёрками</b>, как минуты на часах:</p>
      `)
    },
    {
      id: "x1", n: 1, emoji: "🪞", title: "Умножаем на 1", sub: "Число смотрит в зеркало",
      lesson: () => lessonSkip(1, `
        <p><b>Умножить на 1 — проще некуда.</b> Число как будто смотрит в зеркало и <b>остаётся собой</b>.</p>
        <div class="demo-box"><div class="big-eq">8 × 1 = <span class="hl">8</span> &nbsp;•&nbsp; 5 × 1 = <span class="hl">5</span></div></div>
        <div class="step"><span class="n">🪞</span><div>Один раз взяли — сколько взяли, столько и есть. Вся строчка уже выучена 🎉</div></div>
      `)
    },
    {
      id: "x3", n: 3, emoji: "🎈", title: "Умножаем на 3", sub: "Удвой и добавь ещё разок",
      lesson: () => lessonSkip(3, `
        <p><b>Умножить на 3 — взять число три раза.</b> Ты уже умеешь удваивать (×2) — просто <b>добавь ещё один разок</b>!</p>
        <div class="demo-box"><div class="big-eq">3 × 6 = (6 + 6) + 6 = 12 + 6 = <span class="hl">18</span></div></div>
        <div class="step"><span class="n">1</span><div>Удвой: 6 + 6 = 12 &nbsp;(это ×2, уже знаешь!)</div></div>
        <div class="step"><span class="n">2</span><div>Добавь само число: 12 + 6 = <b>18</b></div></div>
        <p>Считалочка тройками:</p>
      `)
    },
    {
      id: "x4", n: 4, emoji: "🎿", title: "Умножаем на 4", sub: "Удвой два раза подряд",
      lesson: () => lessonSkip(4, `
        <p><b>Умножить на 4 — это удвоить, а потом удвоить ещё раз.</b> Два прыжка!</p>
        <div class="demo-box"><div class="big-eq">4 × 7 → 7+7=<b>14</b> → 14+14=<span class="hl">28</span></div></div>
        <div class="step"><span class="n">1</span><div>Удвой число: 7 + 7 = 14</div></div>
        <div class="step"><span class="n">2</span><div>Удвой то, что получилось: 14 + 14 = <b>28</b></div></div>
        <p>Считалочка четвёрками:</p>
      `)
    },
    {
      id: "x9", n: 9, emoji: "🖐️", title: "Умножаем на 9", sub: "Волшебные пальцы + десятка минус",
      interactive: "fingers",
      lesson: () => `
        <div class="lesson">
        <p>У девятки <b>два фокуса</b>. Первый — <b>десятка минус разок</b>:</p>
        <div class="demo-box"><div class="big-eq">9 × 6 = (10 × 6) − 6 = 60 − 6 = <span class="hl">54</span></div></div>
        <p>А второй — <b>волшебные пальцы</b> 🪄. Разложи 10 пальцев и загни N-й слева:</p>
        <div id="fingerDemo"></div>
        <div class="slider-row"><b>9 ×</b>
          <input type="range" id="fingerSlider" min="1" max="9" value="3" />
          <b><span id="fingerN">3</span></b>
        </div>
        <div class="demo-box"><div class="big-eq" id="fingerEq"></div></div>
        <div class="step"><span class="n">💡</span><div>Пальцы <b>слева</b> от загнутого — десятки, <b>справа</b> — единицы. Ещё: две цифры ответа всегда дают в сумме 9.</div></div>
        </div>`
    },
    {
      id: "x6", n: 6, emoji: "🎯", title: "Умножаем на 6", sub: "Пятёрка плюс ещё одна группа",
      lesson: () => lessonSkip(6, `
        <p>Секрет шестёрки: <b>ты уже знаешь пятёрку!</b> Шестёрка — это на <b>одну группу больше</b>.</p>
        <div class="demo-box"><div class="big-eq">6 × 7 = (5 × 7) + 7 = 35 + 7 = <span class="hl">42</span></div></div>
        <div class="step"><span class="n">1</span><div>Возьми пятёрку: 5 × 7 = 35 &nbsp;(уже умеешь!)</div></div>
        <div class="step"><span class="n">2</span><div>Добавь ещё одну семёрку: 35 + 7 = <b>42</b></div></div>
        <p>Считалочка шестёрками:</p>
      `)
    },
    {
      id: "x7", n: 7, emoji: "🧩", title: "Умножаем на 7", sub: "Ты уже почти всё знаешь!",
      lesson: () => lessonSkip(7, `
        <p><b>Хорошая новость:</b> почти все примеры на 7 ты уже выучил в других строчках — они те же, только перевёрнутые! 🔁</p>
        <div class="demo-box"><div class="big-eq" style="font-size:1.15rem;line-height:1.9">
          2×7 · 3×7 · 4×7 · 5×7 · 6×7 — <span class="hl">уже знаешь!</span>
        </div></div>
        <p>Осталось запомнить всего чуть-чуть:</p>
        <div class="step"><span class="n">🌟</span><div><b>7 × 7 = 49</b> &nbsp;•&nbsp; <b>7 × 8 = 56</b> &nbsp;•&nbsp; <b>7 × 9 = 63</b></div></div>
        <div class="step"><span class="n">🪜</span><div>Лесенка-запоминалка: <b>5–6–7–8</b> → <b>56 = 7×8</b>. Легко!</div></div>
        <p>Считалочка семёрками:</p>
      `)
    },
    {
      id: "x8", n: 8, emoji: "💪", title: "Умножаем на 8", sub: "Богатырь: удвой трижды / десятка минус две",
      lesson: () => lessonSkip(8, `
        <p>Восьмёрка — богатырь. Два способа на выбор:</p>
        <div class="step"><span class="n">1</span><div><b>Удвой три раза:</b> 8×6 → 6→12→24→<b>48</b> (×2, ×2, ×2).</div></div>
        <div class="step"><span class="n">2</span><div><b>Десятка минус две группы:</b></div></div>
        <div class="demo-box"><div class="big-eq">8 × 6 = (10 × 6) − 6 − 6 = 60 − 12 = <span class="hl">48</span></div></div>
        <div class="step"><span class="n">🪜</span><div>И помни лесенку: <b>56 = 7 × 8</b>.</div></div>
        <p>Считалочка восьмёрками:</p>
      `)
    },
    {
      id: "boss", n: 0, emoji: "👑", title: "БОСС: вся таблица", sub: "Финальное испытание — всё вперемешку",
      boss: true,
      lesson: () => `
        <div class="lesson">
        <p><b>Ты дошла до финала! 👑</b></p>
        <p>Здесь будут примеры <b>из всей таблицы</b>, вперемешку. Это проверка — покажи всё, чему научилась!</p>
        <div class="step"><span class="n">💪</span><div>Не помнишь пример? Вспомни фокус: переверни его, посчитай через пятёрку или десятку.</div></div>
        <div class="step"><span class="n">🏆</span><div>Сдашь — станешь <b>Профессором таблицы умножения</b>!</div></div>
        </div>`
    }
  ];

  // helper: урок с «считалочкой» (skip counting) по числу n
  function lessonSkip(n, html) {
    let chips = "";
    for (let i = 1; i <= 10; i++) {
      const val = n * i;
      chips += `<div class="sc ${i % 5 === 0 ? "hot" : ""}">${val}</div>`;
    }
    return `<div class="lesson">${html}<div class="skip-count">${chips}</div>
      <p class="muted center">Проговори вслух несколько раз — и числа сами запомнятся!</p></div>`;
  }

  // факты уровня (пары [a,b]); для boss — вся таблица 2..9
  function levelFacts(level) {
    const facts = [];
    if (level.boss) {
      for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) facts.push([a, b]);
    } else {
      for (let b = 1; b <= MAX; b++) facts.push([level.n, b]);
    }
    return facts;
  }

  function levelStatus(idx) {
    const lv = COURSE[idx];
    if (S.course[lv.id] && S.course[lv.id].done) return "done";
    if (idx === 0) return "current";
    const prev = COURSE[idx - 1];
    if (S.course[prev.id] && S.course[prev.id].done) return "current";
    return "locked";
  }
  function currentLevelIdx() {
    for (let i = 0; i < COURSE.length; i++) {
      if (!(S.course[COURSE[i].id] && S.course[COURSE[i].id].done)) return i;
    }
    return COURSE.length - 1; // всё пройдено
  }

  /* ---------- Подсказка-стратегия для примера a×b (понятным языком) ---------- */
  function strategyFor(a, b) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const ans = a * b;

    if (lo === 1) return { emo: "🪞", title: "Умножение на 1", text: `На 1 число не меняется — ответ просто <b>${hi}</b>.` };
    if (a === 10 || b === 10) return { emo: "🔟", title: "Умножение на 10", text: `Допиши ноль справа: ${hi} → <b>${hi}0</b>.` };
    if (lo === 2) return { emo: "👯", title: "Удвоение", text: `Прибавь число само к себе: ${hi} + ${hi} = <b>${ans}</b>.` };
    if (a === 5 || b === 5) {
      if (hi % 2 === 0) return { emo: "🕐", title: "Фокус пятёрки", text: `Половина от ${hi} — это ${hi / 2}, допиши ноль → <b>${hi / 2}0</b>.` };
      return { emo: "🕐", title: "Фокус пятёрки", text: `На 5 нечётное кончается на 5. Считай пятёрками до <b>${ans}</b>.` };
    }
    if (a === 9 || b === 9) {
      const n = (a === 9) ? b : a;
      return { emo: "🖐️", title: "Фокус девятки", text: `Десятка минус разок: 10×${n} − ${n} = ${10 * n} − ${n} = <b>${9 * n}</b>.` };
    }
    if (lo === 4) return { emo: "🎿", title: "Удвой дважды", text: `${hi}+${hi}=${hi * 2}, потом ${hi * 2}+${hi * 2} = <b>${ans}</b>.` };
    if (lo === 3) return { emo: "🎈", title: "Удвой и добавь", text: `${hi}+${hi}=${hi * 2}, плюс ещё ${hi} = <b>${ans}</b>.` };
    if (a === b) return { emo: "⬜", title: "Квадрат", text: `${a} умножаем само на себя = <b>${ans}</b>. Стоит запомнить!` };
    // остаются сочетания 6,7,8 между собой
    if (hi === 8) {
      return { emo: "💪", title: "Через десятку", text: `Ты знаешь ×10: ${lo}×10 = ${lo * 10}. Отними 2 раза по ${lo}: ${lo * 10} − ${lo * 2} = <b>${ans}</b>.` };
    }
    // hi === 6 или 7 → строим на пятёрке
    const extra = hi - 5;
    const extraText = extra === 1 ? `ещё одну ${lo}` : `ещё ${extra} раза по ${lo}`;
    return {
      emo: "🎯", title: "Через пятёрку",
      text: `Ты знаешь ×5: ${lo}×5 = ${lo * 5}. Добавь ${extraText}: ${lo * 5} + ${lo * extra} = <b>${ans}</b>.`
    };
  }

  /* ==========================================================================
     НАВИГАЦИЯ
     ========================================================================== */
  let activeTimer = null;
  function clearActiveTimer() { if (activeTimer) { clearInterval(activeTimer); activeTimer = null; } }

  function go(screen) {
    clearActiveTimer();
    $$(".screen").forEach(s => s.classList.remove("active"));
    const target = $("#screen-" + screen);
    if (target) target.classList.add("active");
    $$(".nav button").forEach(b => b.classList.toggle("active", b.dataset.go === screen));
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (screen === "home") renderHome();
    if (screen === "course") renderCourse();
    if (screen === "practice") startFreePractice();
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

    const idx = currentLevelIdx();
    const allDone = COURSE.every(l => S.course[l.id] && S.course[l.id].done);
    const btn = $("#continueBtn");
    if (allDone) {
      btn.textContent = "🏆 Курс пройден! Повторить";
      $("#homeMotto").textContent = "🏆 Ты прошла весь курс! Ты чемпион таблицы умножения!";
    } else {
      btn.textContent = `▶️ ${idx === 0 && !S.course[COURSE[0].id] ? "Начать курс" : "Продолжить"}: ${COURSE[idx].emoji} ${COURSE[idx].title}`;
      const mottos = [
        "Давай пройдём курс — шаг за шагом, без зубрёжки ✨",
        "По чуть-чуть каждый день — и ты профи! 🚀",
        "Помни: это не зубрёжка, а понятные фокусы 🪄",
        "Ты молодец, что учишься! Продолжаем 💪"
      ];
      $("#homeMotto").textContent = pick(mottos);
    }
    btn.onclick = () => openLevel(idx);
  }

  document.addEventListener("input", (e) => {
    if (e.target.id === "nameInput") { S.name = e.target.value.trim() || "друг"; save(); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "nameInput" && !e.target.value.trim()) e.target.value = "друг";
  });
  document.addEventListener("click", (e) => {
    if (e.target.id === "mascot") {
      const zoo = ["🐨", "🦊", "🐰", "🐼", "🦄", "🐯", "🐣", "🐙", "🦁", "🐸"];
      const i = zoo.indexOf(S.mascot);
      S.mascot = zoo[(i + 1) % zoo.length];
      e.target.textContent = S.mascot;
      save(); beep(520, 0.1);
    }
  });

  /* ==========================================================================
     КУРС — лесенка уровней
     ========================================================================== */
  function renderCourse() {
    const host = $("#levelPath");
    host.innerHTML = "";
    let doneCount = 0;
    COURSE.forEach((lv, idx) => {
      const st = levelStatus(idx);
      if (st === "done") doneCount++;
      const rec = S.course[lv.id];
      const card = el("button", "lvl " + st);
      const statusIco = st === "done" ? "✅" : st === "locked" ? "🔒" : "▶️";
      const stars = (rec && rec.best) ? `<div class="stars-mini">${"⭐".repeat(Math.min(3, Math.ceil(rec.best / 4)))}</div>` : "";
      card.innerHTML = `
        <div class="lvl-num">${lv.emoji}</div>
        <div class="lvl-body">
          <div class="lvl-title">${lv.title}</div>
          <div class="lvl-sub">${lv.sub}</div>
          ${stars}
        </div>
        <div class="lvl-status">${statusIco}</div>`;
      if (st !== "locked") card.addEventListener("click", () => openLevel(idx));
      else card.addEventListener("click", () => { beep(200, 0.15, "triangle"); flashLocked(card); });
      host.appendChild(card);
    });
    $("#courseTotal").textContent = COURSE.length;
    $("#courseDone").textContent = doneCount;
    $("#courseBar").style.width = Math.round(doneCount / COURSE.length * 100) + "%";
  }
  function flashLocked(card) {
    const sub = $(".lvl-sub", card);
    const old = sub.textContent;
    sub.textContent = "🔒 Сначала пройди предыдущую ступеньку!";
    setTimeout(() => { sub.textContent = old; }, 1400);
  }

  /* ---------- Экран уровня: урок → закрепление → экзамен ---------- */
  let level = null; // текущий уровень {def, idx}

  function openLevel(idx) {
    level = { def: COURSE[idx], idx };
    renderLesson();
  }
  // отдельная навигация на экран уровня (не в общей go, т.к. без пункта меню)
  function showLevelScreen() {
    clearActiveTimer();
    $$(".screen").forEach(s => s.classList.remove("active"));
    $("#screen-level").classList.add("active");
    $$(".nav button").forEach(b => b.classList.toggle("active", b.dataset.go === "course"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderLesson() {
    showLevelScreen();
    const host = $("#levelCard");
    const lv = level.def;
    host.innerHTML = `
      <div class="crumbs" data-go="course">← Курс</div>
      <div class="lesson">
        <h2>${lv.emoji} ${lv.title}</h2>
        ${lv.lesson()}
        <div class="lesson-nav">
          <button class="btn wide" id="toPractice">${lv.boss ? "🚀 К испытанию!" : "👍 Понятно, тренироваться!"}</button>
        </div>
      </div>`;
    if (lv.interactive === "fingers") setupFingers();
    $("#toPractice", host).onclick = () => (lv.boss ? renderTest() : renderLevelPractice());
  }

  // Интерактивные пальцы для ×9
  function setupFingers() {
    const slider = $("#fingerSlider");
    if (!slider) return;
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
      $("#fingerEq").innerHTML = `9 × ${n} = <span class="hl">${tens}${ones}</span>`;
    };
    slider.addEventListener("input", render);
    render();
  }

  /* ---------- Закрепление внутри уровня (бесконечно, с подсказками) ---------- */
  function renderLevelPractice() {
    showLevelScreen();
    const lv = level.def;
    const sess = { correct: 0, streak: 0, last: null };
    const facts = levelFacts(lv);

    function nextFact() {
      // приоритет плохо выученным в рамках уровня
      const pool = [];
      facts.forEach(([a, b]) => {
        let w = (3 - getMastery(a, b)) * 2 + 1;
        if (sess.last === key(a, b)) w = 0;
        // в обычном уровне иногда переворачиваем пример для разнообразия
        for (let i = 0; i < w; i++) pool.push(lv.boss ? [a, b] : (Math.random() < 0.4 ? [b, a] : [a, b]));
      });
      return pick(pool);
    }

    function draw() {
      const [a, b] = nextFact();
      sess.last = key(a, b);
      const host = $("#levelCard");
      const header = `
        <div class="qbar">
          <button class="btn ghost" data-back-lesson>← Урок</button>
          <div class="stat">🎯 закрепляем: <b>${lv.title.replace("Умножаем ", "")}</b></div>
          <div class="stat">✅ <b id="qScore">${sess.correct}</b></div>
        </div>`;
      showQuizQuestion(host, a, b, header, {
        hint: true,
        onAnswered: (ok) => {
          if (ok) { sess.correct++; sess.streak++; if (sess.streak % 5 === 0) burstConfetti(); }
          else sess.streak = 0;
          const sc = $("#qScore", host); if (sc) sc.textContent = sess.correct;
          setTimeout(draw, ok ? 850 : 2400);
        }
      });
      const bl = $("[data-back-lesson]", host); if (bl) bl.onclick = renderLesson;
      // кнопка «проверь меня» — добавим под вопрос
      if (sess.correct >= 4 || lv.boss) {
        const nav = el("div", "lesson-nav");
        nav.innerHTML = `<button class="btn wide" id="goTest">📝 Я готова — проверь меня!</button>`;
        host.appendChild(nav);
        $("#goTest", host).onclick = renderTest;
      } else {
        const hint = el("p", "muted center", `Ответь верно ещё ${4 - sess.correct}, и откроется проверка 📝`);
        host.appendChild(hint);
      }
    }
    draw();
  }

  /* ---------- Экзамен уровня ---------- */
  function renderTest() {
    showLevelScreen();
    const lv = level.def;
    const facts = shuffle(levelFacts(lv).slice());
    const N = lv.boss ? 15 : 10;
    const need = lv.boss ? 12 : 8;
    // собираем список вопросов (для boss берём случайные N, иначе все ×2..×10 = 9 + один повтор)
    let qs = [];
    if (lv.boss) {
      qs = shuffle(facts).slice(0, N);
    } else {
      qs = facts.filter(([a, b]) => b !== 1); // пропустим ×1 как совсем простой
      shuffle(qs);
      qs = qs.slice(0, N);
      while (qs.length < N) qs.push(pick(facts));
    }
    // иногда перевернём для разнообразия
    qs = qs.map(([a, b]) => (!lv.boss && Math.random() < 0.4) ? [b, a] : [a, b]);

    const sess = { i: 0, correct: 0, results: [] };

    function drawDots() {
      let dots = "";
      for (let k = 0; k < qs.length; k++) {
        let cls = "d";
        if (k < sess.i) cls += sess.results[k] ? " ok" : " no";
        else if (k === sess.i) cls += " now";
        dots += `<span class="${cls}"></span>`;
      }
      return `<div class="test-dots">${dots}</div>`;
    }

    function draw() {
      if (sess.i >= qs.length) return finish();
      const [a, b] = qs[sess.i];
      const host = $("#levelCard");
      const header = `
        <div class="qbar">
          <button class="btn ghost" data-go="course">← Выйти</button>
          <div class="stat">📝 Экзамен: ${lv.emoji} ${lv.title.replace("Умножаем ", "")}</div>
          <div class="stat">${sess.i + 1}/${qs.length}</div>
        </div>
        ${drawDots()}`;
      showQuizQuestion(host, a, b, header, {
        hint: false, // на экзамене без подсказок — но покажем разбор при ошибке
        onAnswered: (ok) => {
          sess.results[sess.i] = ok;
          if (ok) sess.correct++;
          sess.i++;
          setTimeout(draw, ok ? 750 : 2300);
        }
      });
    }

    function finish() {
      const host = $("#levelCard");
      const passed = sess.correct >= need;
      if (passed) {
        const first = !(S.course[lv.id] && S.course[lv.id].done);
        S.course[lv.id] = { done: true, best: Math.max(sess.correct, (S.course[lv.id] && S.course[lv.id].best) || 0) };
        save();
        const reward = (first ? 10 : 3) + sess.correct;
        addStars(reward);
        sndWin(); burstConfetti();
        const nextIdx = level.idx + 1;
        const hasNext = nextIdx < COURSE.length;
        host.innerHTML = `
          <div class="center">
            <div class="badge-big">${lv.boss ? "👑" : "🏅"}</div>
            <h2>${lv.boss ? "ТЫ ЧЕМПИОН!" : "Ступенька пройдена!"}</h2>
            <div class="pass-banner">Верно ${sess.correct} из ${qs.length}. Награда: <b>+${reward} ⭐</b></div>
            ${lv.boss ? "<p>Ты прошла <b>весь курс</b> таблицы умножения! 🎉</p>" :
            hasNext ? `<p>Открылась новая: <b>${COURSE[nextIdx].emoji} ${COURSE[nextIdx].title}</b></p>` : ""}
            <div class="lesson-nav" style="justify-content:center">
              ${hasNext && !lv.boss ? `<button class="btn" id="nextLvl">▶️ Дальше: ${COURSE[nextIdx].emoji}</button>` : ""}
              <button class="btn secondary" data-go="course">📚 К курсу</button>
            </div>
          </div>`;
        if (hasNext && !lv.boss) $("#nextLvl", host).onclick = () => openLevel(nextIdx);
      } else {
        sndBad();
        host.innerHTML = `
          <div class="center">
            <div class="badge-big">💪</div>
            <h2>Почти получилось!</h2>
            <div class="retry-banner">Верно ${sess.correct} из ${qs.length}. Нужно ${need}, чтобы сдать. Не сдавайся — ты близко!</div>
            <div class="lesson-nav" style="justify-content:center">
              <button class="btn" id="retryTest">🔁 Ещё раз</button>
              <button class="btn secondary" id="backLesson">📖 Повторить урок</button>
            </div>
          </div>`;
        $("#retryTest", host).onclick = renderTest;
        $("#backLesson", host).onclick = renderLesson;
      }
    }
    draw();
  }

  /* ==========================================================================
     ОБЩИЙ ДВИЖОК ВОПРОСА (используется в закреплении, экзамене, свободной)
     ========================================================================== */
  function makeOptions(ans) {
    const set = new Set([ans]);
    const cands = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 3, ans - 3, ans + 5];
    shuffle(cands);
    for (const c of cands) {
      if (set.size >= 4) break;
      if (c > 0 && c <= 100) set.add(c);
    }
    while (set.size < 4) set.add(randInt(100) + 1);
    return shuffle(Array.from(set));
  }

  // Рисует один вопрос. header — html «шапки». cb.onAnswered(ok,a,b) после ответа.
  function showQuizQuestion(host, a, b, headerHTML, cb) {
    const ans = a * b;
    const options = makeOptions(ans);
    host.innerHTML = `
      ${headerHTML}
      <div class="question" id="qText">${a} × ${b}</div>
      <div class="answers" id="qAnswers"></div>
      ${cb.hint ? '<button class="btn ghost hint-btn" id="hintBtn">🤔 Показать способ</button><div class="hint-box" id="hintBox"></div>' : ''}
      <div class="feedback" id="qFeedback"></div>`;
    // делегированные data-go в шапке уже ловятся глобально; кнопки без data-go обрабатывает вызывающий
    const answersHost = $("#qAnswers", host);
    let answered = false;
    options.forEach(opt => {
      const btn = el("button", "ans", opt);
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        $$(".ans", host).forEach(x => x.disabled = true);
        const q = $("#qText", host), fb = $("#qFeedback", host);
        const ok = opt === ans;
        if (ok) {
          btn.classList.add("correct"); q.classList.add("pop");
          setMastery(a, b, getMastery(a, b) + 1);
          addStars(1); sndGood();
          if (S.bestStreak < 999) { /* streak учитывается в сессиях */ }
          fb.className = "feedback good";
          fb.textContent = pick(["Верно! 🎉", "Супер! ⭐", "Красота! 💫", "Молодец! 👏", "В точку! 🎯"]);
        } else {
          btn.classList.add("wrong"); q.classList.add("shake");
          setMastery(a, b, Math.max(1, getMastery(a, b) - 1));
          sndBad();
          $$(".ans", host).forEach(x => { if (+x.textContent === ans) x.classList.add("correct"); });
          const s = strategyFor(a, b);
          fb.className = "feedback bad";
          fb.innerHTML = `Правильно: <b>${ans}</b>. ${s.emo} ${s.text}`;
        }
        cb.onAnswered(ok, a, b);
      });
      answersHost.appendChild(btn);
    });
    if (cb.hint) {
      $("#hintBtn", host).onclick = () => {
        const s = strategyFor(a, b);
        const box = $("#hintBox", host);
        box.innerHTML = `<h4>${s.emo} ${s.title}</h4><div>${s.text}</div>`;
        box.classList.add("show");
      };
    }
  }

  /* ==========================================================================
     СВОБОДНАЯ ТРЕНИРОВКА (всё вперемешку, адаптивно)
     ========================================================================== */
  function nextQuestionGlobal(avoid) {
    const pool = [];
    for (let a = 2; a <= MAX; a++)
      for (let b = 2; b <= MAX; b++) {
        let w = (3 - getMastery(a, b)) * 3 + 1;
        if (avoid === key(a, b)) w = 0;
        for (let i = 0; i < w; i++) pool.push([a, b]);
      }
    if (Math.random() < 0.15) pool.push([pick([2, 3, 4, 5, 6, 7, 8, 9]), pick([1, 10])]);
    return pick(pool);
  }

  function startFreePractice() {
    const sess = { correct: 0, streak: 0, last: null };
    function draw() {
      const [a, b] = nextQuestionGlobal(sess.last);
      sess.last = key(a, b);
      const host = $("#practiceCard");
      const header = `
        <div class="qbar">
          <button class="btn ghost" data-go="home">← Выйти</button>
          <div class="qprogress"><span style="width:${Math.min(100, sess.correct * 10)}%"></span></div>
          <div class="stat">✅ <b id="qScore">${sess.correct}</b></div>
        </div>`;
      showQuizQuestion(host, a, b, header, {
        hint: true,
        onAnswered: (ok) => {
          if (ok) { sess.correct++; sess.streak++; if (sess.streak > S.bestStreak) { S.bestStreak = sess.streak; save(); } if (sess.streak % 5 === 0) burstConfetti(); }
          else sess.streak = 0;
          const sc = $("#qScore", host); if (sc) sc.textContent = sess.correct;
          setTimeout(draw, ok ? 850 : 2400);
        }
      });
    }
    draw();
  }

  /* ==========================================================================
     ИГРЫ
     ========================================================================== */
  function showGamesMenu() {
    clearActiveTimer();
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

  /* ------ Космо-битва ------ */
  function startBattle(host) {
    const sess = { correct: 0, streak: 0, last: null, time: 60, over: false };
    clearActiveTimer();
    activeTimer = setInterval(() => {
      sess.time--;
      const chip = $("#battleTimer", host);
      if (chip) chip.textContent = "⏱️ " + sess.time;
      if (sess.time <= 0) endBattle();
    }, 1000);

    function draw() {
      if (sess.over) return;
      const [a, b] = nextQuestionGlobal(sess.last);
      sess.last = key(a, b);
      const ans = a * b;
      const options = makeOptions(ans);
      host.innerHTML = `
        <div class="qbar">
          <button class="btn ghost" id="bExit">← Выйти</button>
          <div class="timer-chip" id="battleTimer">⏱️ ${sess.time}</div>
          <div class="stat">✅ <b id="bScore">${sess.correct}</b></div>
        </div>
        <div class="question" id="bText">${a} × ${b}</div>
        <div class="answers" id="bAnswers"></div>`;
      const ah = $("#bAnswers", host);
      let answered = false;
      options.forEach(opt => {
        const btn = el("button", "ans", opt);
        btn.addEventListener("click", () => {
          if (sess.over || answered) return;
          answered = true;
          if (opt === ans) {
            sess.correct++; sess.streak++;
            setMastery(a, b, getMastery(a, b) + 1);
            addStars(1); sndGood();
            $("#bScore", host).textContent = sess.correct;
            $("#bText", host).classList.add("pop");
          } else {
            sess.streak = 0;
            setMastery(a, b, Math.max(1, getMastery(a, b) - 1));
            sndBad(); btn.classList.add("wrong");
            $$(".ans", host).forEach(x => { if (+x.textContent === ans) x.classList.add("correct"); });
          }
          setTimeout(draw, opt === ans ? 250 : 650);
        });
        ah.appendChild(btn);
      });
      $("#bExit", host).onclick = () => { clearActiveTimer(); sess.over = true; showGamesMenu(); };
    }
    function endBattle() {
      clearActiveTimer();
      sess.over = true;
      const bonus = sess.correct * 2;
      addStars(bonus); sndWin(); burstConfetti();
      const emoji = sess.correct >= 20 ? "🏆" : sess.correct >= 12 ? "🚀" : sess.correct >= 6 ? "🌟" : "💪";
      host.innerHTML = `
        <div class="center">
          <div class="result-emoji">${emoji}</div>
          <h2>Время вышло!</h2>
          <p>Правильных ответов: <b style="font-size:1.4rem">${sess.correct}</b></p>
          <p>Бонус: <b>+${bonus} ⭐</b></p>
          <div class="row" style="justify-content:center">
            <button class="btn" id="againBtn">🔁 Ещё раз</button>
            <button class="btn ghost" id="menuBtn">🎮 К играм</button>
          </div>
        </div>`;
      $("#againBtn", host).onclick = () => startBattle(host);
      $("#menuBtn", host).onclick = showGamesMenu;
    }
    draw();
  }

  /* ------ Найди пару ------ */
  function startPairs(host) {
    const chosen = [];
    const usedAns = new Set();
    let guard = 0;
    while (chosen.length < 6 && guard++ < 300) {
      const [a, b] = nextQuestionGlobal(null);
      const ans = a * b;
      if (usedAns.has(ans)) continue;
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
    cards.forEach((c) => {
      const btn = el("button", "pair-card");
      btn.textContent = "?";
      btn.addEventListener("click", () => flip(btn, c));
      grid.appendChild(btn);
    });
    $("#pExit", host).onclick = showGamesMenu;

    function flip(btn, c) {
      if (btn.classList.contains("flipped") || btn.classList.contains("done")) return;
      if (sess.flipped.length >= 2) return;
      btn.classList.add("flipped"); btn.textContent = c.text;
      sess.flipped.push({ btn, c });
      beep(600, 0.08);
      if (sess.flipped.length === 2) {
        sess.moves++; $("#pMoves", host).textContent = sess.moves;
        const [x, y] = sess.flipped;
        if (x.c.id === y.c.id && x.c.kind !== y.c.kind) {
          setTimeout(() => {
            x.btn.classList.add("done"); y.btn.classList.add("done");
            sess.flipped = []; sess.matched++;
            $("#pMatched", host).textContent = sess.matched;
            sndGood(); addStars(1);
            if (sess.matched === 6) winPairs();
          }, 350);
        } else {
          setTimeout(() => {
            x.btn.classList.remove("flipped"); x.btn.textContent = "?";
            y.btn.classList.remove("flipped"); y.btn.textContent = "?";
            sess.flipped = []; sndBad();
          }, 850);
        }
      }
    }
    function winPairs() {
      sndWin(); burstConfetti();
      const bonus = Math.max(3, 15 - sess.moves);
      addStars(bonus);
      $("#pFeed", host).innerHTML = `🎉 Все пары за ${sess.moves} ходов! <b>+${bonus} ⭐</b>`;
      const again = el("div", "center"); again.style.marginTop = "12px";
      again.innerHTML = `<button class="btn" id="pAgain">🔁 Ещё раз</button> <button class="btn ghost" id="pMenu">🎮 К играм</button>`;
      host.appendChild(again);
      $("#pAgain", host).onclick = () => startPairs(host);
      $("#pMenu", host).onclick = showGamesMenu;
    }
  }

  /* ==========================================================================
     ПРОГРЕСС
     ========================================================================== */
  function renderProgress() {
    const host = $("#gridHost");
    const table = el("table", "mult-grid");
    let head = "<tr><th>×</th>";
    for (let b = 1; b <= MAX; b++) head += `<th>${b}</th>`;
    head += "</tr>";
    let rows = "";
    for (let a = 1; a <= MAX; a++) {
      rows += `<tr><th>${a}</th>`;
      for (let b = 1; b <= MAX; b++) {
        const m = getMastery(a, b);
        rows += `<td class="l${m}" title="${a}×${b}=${a * b}">${a * b}</td>`;
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
        x: cv.width / 2 + (Math.random() - 0.5) * 200, y: cv.height / 3,
        vx: (Math.random() - 0.5) * 10, vy: Math.random() * -9 - 3,
        g: 0.28 + Math.random() * 0.1, size: 5 + Math.random() * 7,
        color: pick(colors), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
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
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
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
  window.KosmoTablica = { reset: () => { localStorage.removeItem(STORE_KEY); location.reload(); } };
})();
