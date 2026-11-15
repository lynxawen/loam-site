'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './home.css';
import Link from "next/link";
import { CALENDLY_TRIAL_URL as CALENDLY } from "./config";

/* ================================================================
   Things you edit by hand
   ================================================================ */
const CALENDLY_URL = 'https://calendly.com/loam-app/english-class';
const CONTACT_EMAIL = 'info@loamenglish.com';
const mailto = (subject) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
const CONTACT_URL = mailto('Хочу заниматься английским C1+');   // "Написать мне" buttons
const CONTACT_URL_FOOTER = mailto('У меня вопрос');        // footer link
const PRIVACY_URL = '/privacy';
const TERMS_URL = '/terms';
const VIDEO_ID = 'YOUTUBE_VIDEO_ID'; // TODO: the part after v= in the YouTube link
const FOUNDER_TOTAL = 6;         // places in the Founder offer
const FOUNDER_TAKEN = 1;         // how many students have already joined

const FACTS = '50 минут · бесплатно · без обязательств · приложение включено';

/* ================================================================
   Hex map data
   ================================================================ */
const HEX_W = 259, HEX_H = 224, COL = 206, HALF = 119;
/* The visible window in map units. Bigger numbers = camera further away. */
const VIEW = { x: -470, y: -470, w: 940, h: 940 };
const MIN_SCALE = 0.5;   // on narrow screens the map zooms in so words stay readable
const STEP_MS = 420;     // time between unlocks

/* [number, column, row in half-steps, colour, words] */
const OPEN_DATA = [
  [1, 0, 0, 'red', 'hello hi i be name my'],
  [2, 0, -2, 'red', 'what your how you good okay'],
  [3, 1, -1, 'red', 'nice to meet too about and'],
  [4, 1, 1, 'red', 'excuse me thank please welcome sorry'],
  [5, 0, 2, 'purple', 'morning evening day have a goodbye'],
  [6, -1, 1, 'yellow', 'do speak english not yes no'],
  [7, -1, -1, 'yellow', 'well little understand mean know it'],
  [8, -1, -3, 'yellow', 'can could repeat say that again'],
  [9, 0, -4, 'green', 'where from in country city home'],
  [10, 1, -3, 'green', 'the toilet restroom over here there'],
  [11, 2, -2, 'green', 'get long take far close very'],
  [12, 2, 0, 'red', 'she he her his this who'],
  [13, 2, 2, 'red', 'we our they their with together'],
  [14, 1, 3, 'red', 'should go now soon see later'],
  [15, 0, 4, 'purple', 'time at on a.m. p.m. when'],
  [16, -1, 3, 'purple', 'would like eat drink come want'],
  [17, -2, 2, 'purple', 'restaurant reservation make table for which'],
  [18, -2, 0, 'purple', 'ready order menu glass of water'],
  [19, -2, -2, 'purple', 'coffee tea sugar or milk without'],
  [20, -2, -4, 'purple', 'breakfast lunch dinner food snack meal'],
  [21, -1, -5, 'yellow', 'ask question need help find problem'],
  [22, 0, -6, 'yellow', 'answer but call'],
  [23, 1, -5, 'green', 'live street house apartment place room'],
  [24, 2, -4, 'green', 'walk turn left right straight way'],
  [25, 3, -3, 'green', 'by car drive wait'],
  [26, 3, -1, 'green', 'bus stop station leave'],
  [27, 3, 1, 'red', 'him us them give great introduce'],
  [28, 3, 3, 'red', 'friend partner wife husband child family'],
  [29, 2, 4, 'red', 'woman man boy girl baby kid'],
  [30, 1, 5, 'red', 'old year whose bear happy birthday'],
  [31, 0, 6, 'red', 'mine yours'],
  [32, -1, 5, 'purple', 'night tonight noon afternoon today tomorrow'],
  [33, -2, 4, 'purple', 'minute hour week month every during'],
  [34, -3, 3, 'purple', 'chicken egg rice bread'],
  [35, -3, 1, 'purple', 'apple orange vegetable tomato'],
  [36, -3, -1, 'purple', 'beer sauce salt pepper'],
  [37, -3, -3, 'blue', 'buy pay cash change'],
  [38, -3, -5, 'blue', 'worker company job team'],
  [39, -2, -6, 'pink', 'angry sad hungry sick'],
  [43, 2, -6, 'green', 'opposite other side road'],
  [44, 3, -5, 'green', 'before top past'],
];

/* hexes that stay locked (numbers as on the real map) */
const LOCKED_DATA = [[40, -1, -7], [41, 0, -8], [42, 1, -7], [50, 3, 5]];

function hexPos(c, r) {
  return { left: c * COL - HEX_W / 2 - VIEW.x, top: r * HALF - HEX_H / 2 - VIEW.y };
}
function isVisible(c, r) {
  const { left, top } = hexPos(c, r);
  return !(left > VIEW.w || left + HEX_W < 0 || top > VIEW.h || top + HEX_H < 0);
}

function buildHexes() {
  const taken = {};
  const used = {};
  const key = (c, r) => c + ',' + r;
  const mod2 = (n) => ((n % 2) + 2) % 2;

  const open = [];
  OPEN_DATA.forEach(([n, c, r, color, words]) => {
    taken[key(c, r)] = true;
    used[n] = true;
    if (!isVisible(c, r)) return;
    open.push({ n, color, words: words.split(' '), ...hexPos(c, r) });
  });

  const locked = [];
  LOCKED_DATA.forEach(([n, c, r]) => {
    taken[key(c, r)] = true;
    used[n] = true;
    if (isVisible(c, r)) locked.push({ n, ...hexPos(c, r) });
  });

  /* fill the rest of the window with locked hexes, cut off by the edges */
  let next = 45;
  for (let c = -5; c <= 6; c++) {
    for (let r = -20; r <= 20; r++) {
      if (mod2(c) !== mod2(r)) continue;
      if (taken[key(c, r)] || !isVisible(c, r)) continue;
      while (used[next]) next++;
      used[next] = true;
      locked.push({ n: next, ...hexPos(c, r) });
    }
  }
  return { open, locked };
}

const HEXES = buildHexes();

/* ================================================================
   Small shared pieces
   ================================================================ */
function Cta() {
  return (
    <a className="cta" href={CALENDLY_URL}>
      записаться на пробный урок
    </a>
  );
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ================================================================
   Hex map
   ================================================================ */
function HexMap() {
  const mapRef = useRef(null);
  const viewRef = useRef(null);
  const [open, setOpen] = useState(0);
  const [transform, setTransform] = useState('');

  useEffect(() => {
    const view = viewRef.current;
    function fit() {
      const w = view.clientWidth;
      const h = view.clientHeight;
      const sc = Math.max(w / VIEW.w, MIN_SCALE);
      setTransform(
        'translate(' + (w - VIEW.w * sc) / 2 + 'px,' + (h - VIEW.h * sc) / 2 + 'px) scale(' + sc + ')'
      );
    }
    fit();
    window.addEventListener('resize', fit);
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(fit);
      ro.observe(view);
    }
    return () => {
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const total = HEXES.open.length;
    if (prefersReducedMotion()) {
      setOpen(total);
      return undefined;
    }
    let timer = null;
    let visible = false;
    let count = 0;
    const set = (n) => { count = n; setOpen(n); };
    const stop = () => clearTimeout(timer);

    function step() {
      stop();
      if (!visible) return;
      if (count < total) {
        set(count + 1);
        timer = setTimeout(step, STEP_MS);
      } else {
        timer = setTimeout(() => {
          set(0);
          timer = setTimeout(step, 900);
        }, 3500);
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        const now = entries[0].isIntersecting;
        if (now === visible) return;
        visible = now;
        stop();
        set(0);
        if (visible) timer = setTimeout(step, 600);
      },
      { threshold: 0.3 }
    );
    io.observe(mapRef.current);

    const onVis = () => {
      if (document.hidden) stop();
      else if (visible) step();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const words = HEXES.open.slice(0, open).reduce((sum, h) => sum + h.words.length, 0);

  return (
    <figure className="hexmap" id="hexmap" ref={mapRef} aria-label="Карта слов: шестиугольники открываются один за другим">
      <div className="hexview" ref={viewRef}>
        <div
          className="hexstage"
          aria-hidden="true"
          style={{
            width: VIEW.w,
            height: VIEW.h,
            transform,
            opacity: transform ? 1 : 0,
          }}
        >
          {HEXES.open.map((h, i) => (
            <div
              key={h.n}
              className={'hx hx-' + h.color + (i < open ? ' open' : '')}
              style={{ left: h.left, top: h.top }}
            >
              <div className="hx-in">
                <span className="hx-num">{h.n}</span>
                <div className="hx-words">
                  <div className="hx-wrap">
                    {h.words.map((w, j) => (
                      <span key={w + j} style={{ '--i': j }}>{w}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {HEXES.locked.map((h) => (
            <div key={'l' + h.n} className="hx" style={{ left: h.left, top: h.top }}>
              <div className="hx-in">
                <span className="hx-num">{h.n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="hexcap">
        <span>Карта слов</span>
        <span id="hexcount">
          открыто {open} из {HEXES.open.length} · слов: {words}
        </span>
      </figcaption>
    </figure>
  );
}

/* ================================================================
   Sentence demo (steps 1-4)
   ================================================================ */
const STEPS = [
  { n: 1, title: 'Слова', text: 'Читаем слова и их перевод.' },
  { n: 2, title: 'Предложение', text: 'Учим готовое предложение внутри контекста.' },
  {
    n: 3,
    title: 'Тип предложения',
    text: 'Разбираем, какие ещё слова из тысячи можно в него подставить. Это как капсульный гардероб: из небольшого набора вещей собирается много разных образов. Как Uniqlo.',
  },
  { n: 4, title: 'Микро-навыки', text: 'В каждом предложении спрятан набор маленьких грамматических навыков.' },
];
const DEMO_NAMES = ['1 · Слова', '2 · Предложение', '3 · Тип предложения', '4 · Микро-навыки'];
const DEMO_DURATIONS = [3400, 3400, 6200, 5600];
const SLOT_WORDS = ['country', 'city', 'town', 'planet', 'galaxy'];

/* Words glide to their new places (FLIP): measure, change the stage, then animate the difference */
function inFlow(el) {
  return getComputedStyle(el).position !== 'absolute';
}
function snapshot(sentence) {
  return Array.from(sentence.querySelectorAll('.tok')).map((el) => ({
    el,
    flow: inFlow(el),
    rect: el.getBoundingClientRect(),
  }));
}
function glide(before, sentence) {
  const moved = [];
  before.forEach((b) => {
    if (!b.flow || !inFlow(b.el)) return;
    const r = b.el.getBoundingClientRect();
    const dx = b.rect.left - r.left;
    const dy = b.rect.top - r.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    b.el.style.transition = 'none';
    b.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    moved.push(b.el);
  });
  if (!moved.length) return;
  sentence.getBoundingClientRect();
  moved.forEach((el, i) => {
    el.style.transition = 'transform 1s cubic-bezier(.22,.8,.2,1) ' + i * 45 + 'ms, opacity .6s ease';
    el.style.transform = '';
  });
}

function MethodDemo() {
  const demoRef = useRef(null);
  const sentenceRef = useRef(null);
  const snapRef = useRef(null);
  const stageRef = useRef(1);
  const visibleRef = useRef(false);
  const timerRef = useRef(null);
  const [stage, setStage] = useState(1);
  const [slotWord, setSlotWord] = useState(SLOT_WORDS[0]);
  const [slotShown, setSlotShown] = useState(true);

  const goTo = useCallback((n) => {
    if (n === stageRef.current) return;
    if (!prefersReducedMotion() && sentenceRef.current) {
      snapRef.current = snapshot(sentenceRef.current);
    }
    stageRef.current = n;
    setStage(n);
  }, []);

  useLayoutEffect(() => {
    if (snapRef.current && sentenceRef.current) {
      glide(snapRef.current, sentenceRef.current);
    }
    snapRef.current = null;
  }, [stage]);

  const schedule = useCallback(() => {
    clearTimeout(timerRef.current);
    if (prefersReducedMotion() || !visibleRef.current) return;
    timerRef.current = setTimeout(() => {
      goTo((stageRef.current % 4) + 1);
      schedule();
    }, DEMO_DURATIONS[stageRef.current - 1]);
  }, [goTo]);

  /* the word in the dashed slot cycles during step 3 */
  useEffect(() => {
    setSlotWord(SLOT_WORDS[0]);
    setSlotShown(true);
    if (stage !== 3 || prefersReducedMotion()) return undefined;
    let wi = 0;
    let inner = null;
    const interval = setInterval(() => {
      wi = (wi + 1) % SLOT_WORDS.length;
      setSlotShown(false);
      inner = setTimeout(() => {
        setSlotWord(SLOT_WORDS[wi]);
        setSlotShown(true);
      }, 200);
    }, 1100);
    return () => {
      clearInterval(interval);
      clearTimeout(inner);
    };
  }, [stage]);

  /* idle at step 1 until the card is well inside the screen; reset when it leaves */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const now = entries[0].isIntersecting;
        if (now === visibleRef.current) return;
        visibleRef.current = now;
        clearTimeout(timerRef.current);
        goTo(1);
        if (now) schedule();
      },
      { threshold: 0.6, rootMargin: '-10% 0px -10% 0px' }
    );
    io.observe(demoRef.current);

    const onVis = () => {
      if (document.hidden) clearTimeout(timerRef.current);
      else if (visibleRef.current) schedule();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearTimeout(timerRef.current);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [goTo, schedule]);

  function pick(n) {
    goTo(n);
    schedule();
  }

  return (
    <div className="method-demo">
      <div className="demo" ref={demoRef} data-stage={stage} aria-hidden="true">
        <div className="demo-label">
          <span className="demo-label-text">{DEMO_NAMES[stage - 1]}</span>
        </div>

        <div className="demo-stage">
          <div className="context">Nice to meet you!</div>

          <div className="sentence" ref={sentenceRef}>
            <div className="tok" data-o="where">
              <span className="pill p-green">
                <span className="swap">
                  <span className="w-where">where</span>
                  <span className="w-what">what</span>
                </span>
              </span>
              <span className="tr">где</span>
            </div>
            <div className="tok slot-tok float" data-o="slot">
              <span className="pill slot">
                <span className="slot-word" style={{ opacity: slotShown ? 1 : 0 }}>{slotWord}</span>
              </span>
            </div>
            <div className="tok u" data-o="are">
              <span className="pill p-blue">are</span>
              <span className="tr">есть</span>
            </div>
            <div className="tok" data-o="you">
              <span className="pill p-purple">you</span>
              <span className="tr">ты</span>
            </div>
            <div className="tok u" data-o="from">
              <span className="pill p-sand">from</span>
              <span className="tr">из</span>
            </div>
            <div className="tok q float" data-o="q">
              <span className="pill p-grey">?</span>
            </div>
          </div>

          <ul className="notes">
            <li>вопрос с to be: глагол встаёт перед you</li>
            <li>from: предлог, показывает откуда ты</li>
            <li>what + слово: уточняем вопрос</li>
          </ul>
        </div>

        <div className="bars">
          {STEPS.map((s) => (
            <span key={s.n} className={stage === s.n ? 'on' : ''} />
          ))}
        </div>
      </div>

      <ol className="steps">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className={'step' + (stage === s.n ? ' active' : '')}
            tabIndex={0}
            onClick={() => pick(s.n)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick(s.n);
              }
            }}
          >
            <span className="dot">{s.n}</span>
            <h4>{s.title}</h4>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ================================================================
   "Читать полностью" clip used by every review
   ================================================================ */
function Clip({ max, children }) {
  const ref = useRef(null);
  const [short, setShort] = useState(false);
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(max);

  useEffect(() => {
    function measure() {
      if (ref.current && ref.current.scrollHeight <= max + 24) setShort(true);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    else window.addEventListener('load', measure);
    return () => window.removeEventListener('load', measure);
  }, [max]);

  function toggle() {
    const next = !open;
    setOpen(next);
    setHeight(next ? ref.current.scrollHeight : max);
  }

  return (
    <>
      <div
        ref={ref}
        className={'clip' + (open ? ' open' : '') + (short ? ' short' : '')}
        style={{ maxHeight: short ? 'none' : height }}
      >
        {children}
      </div>
      {!short && (
        <button className="more" type="button" aria-expanded={open} onClick={toggle}>
          {open ? 'Свернуть' : 'Читать полностью '}
        </button>
      )}
    </>
  );
}

/* ================================================================
   Reviews
   ================================================================ */
const INTERVIEW = [
  {
    q: 'С какой целью ты изначально начала заниматься английским? Что хотелось улучшить?',
    a: 'Живу за границей, а языка не знаю. Учила в детском садике, в школе, в музыкальном колледже, в университете, потом ещё с репетитором немного - и толку было ноль. Когда переехала жить заграницу и поняла, что все-таки придется осваивать Английский, я стала искать преподавателя, который преподает язык не по классической программе, а интересно и без зубрежки. Знакомые мне посоветовали Мариам, и я этому очень рада.',
  },
  {
    q: 'Что было самой большой сложностью в английском ДО наших занятий?',
    a: 'До наших занятий я зубрила и забывала. В голове ничего не откладывалось. Не было понимания как устроен язык и т.д.',
  },
  {
    q: 'Что изменилось с тех пор, как мы начали заниматься? Что стало получаться лучше?',
    a: 'Я начала осваивать язык с нуля. Потихоньку понимаю логику того, что изучаем.',
  },
  {
    q: 'Что тебе особенно нравится в формате наших занятий или моём подходе к преподаванию?',
    a: 'Легкость, дружелюбность, отсутствие зубрёжки, постоянная практика, методика преподавания и хорошо продуманная программа изучения, ненавязчивость и понятное донесение учебного материала.',
  },
  {
    q: 'Ты бы порекомендовала мои занятия и почему?',
    a: 'Однозначно ДА! Мне очень нравится заниматься с Мариам. Планирую продолжать и другим советую. Только с ней у меня пошел прогресс в изучении языка ♥️🫶🏻🌷',
  },
];

const AMIR_TEXT =
  'Благодаря занятием с Мариям я преодолел барьер в разговорной речи. Мне кажется, этому помогла дружелюбная атмосфера и сам подход к обучению. Теперь я могу общаться с англоговорящими людьми вслушиваюсь в их речь, вставляю слово в разговор и отвечаю развернуто. Больше не боюсь говорить и для меня это главный результат. Мариям помогла мне освоить навыки в правильном порядке и я начал ими пользоваться. Мне нравится, что новая грамматика и слова даются в контексте и мы разговариваем на разные темы и я применяю то, что узнал. Я очень рекомендую Мариям, на ее занятиях очень крутая и дружелюбная атмосфера, которая дает уверенность и понимание того, как нужно изучать английский.';

const REVIEWS = [
  { name: 'Амир', country: 'Казахстан', text: AMIR_TEXT },

  {
    name: 'Екатерина', country: 'Россия',
    text: 'Мне нравятся занятия с Мариам тем, что она легко и бережно преподносит информацию. Огромный плюс, что она понимает Русскую культуру и культуру англоязычных стран. Я начала учить Английский язык еще в школе, потом начала в колледже и вновь начала в институте… какие-То знания безусловно были, но в них не было системы и были огромные дыры на базовом уровне. Так же сложность вызывали артикли и предлоги не характерные Русскому языку. Вот с этим собственно я и пришла к Мариам, и с желанием наконец-то начать говорить и с мечтой переехать заграницу) Я точно рекомендую занятия с Мариам, если вы хотите наконец перестать бояться и начать говорить на Английском!!!',
  },
  
  {
    name: 'Алиса', country: 'Португалия',
    text: 'Мариям - лучший преподаватель, которого я когда-либо встречала! Она внимательно прислушивается к потребностям учеников, предлагает продуманный план урока и находит индивидуальный подход. На её занятиях всегда комфортная и поддерживающая атмосфера, которая пробуждает желание учиться и расти. Благодаря её поддержке и профессионализму я чувствую себя увереннее в своих знаниях. Кроме того, её позитивная энергия и отличное чувство юмора делают каждый урок увлекательным и вдохновляющим. Я с нетерпением жду каждого занятия! Спасибо, Мариям!',
    original: `Mariyam is the best teacher I have ever met! She listens carefully to the needs of her students, offers a well-thought-out lesson plan, and finds an individual approach. Her classes always have a comfortable and encouraging atmosphere that makes you want to learn and grow. Thanks to her support and professionalism, I feel more confident in my knowledge. Moreover, her positive energy and great sense of humor make every lesson engaging and inspiring. I look forward to every class! Thank you, Mariyam!`,
  },
  {
    name: 'Марта', country: 'Польша',
    text: 'Я занимаюсь с Мариям, чтобы улучшить свой академический английский. Она прекрасный преподаватель языка, необходимого в университете, на конференциях и в научных статьях. Она невероятно креативна и очень эрудирована. Особенно важно для меня то, что Мариям заботится о правильности, уместности и изяществе языка. Никогда прежде английский не приносил мне столько удовлетворения. Наконец-то я двигаюсь вперёд!',
    original: `I am working with Mariyam to improve my academic English. She is a great teacher of the language needed at university, at conferences, in academic papers. She is incredibly creative and very knowledgeable. What is particularly important to me, Mariyam cares about the correctness, appropriateness and elegance of the language. Never before has English given me so much satisfaction. I am finally moving forward!`,
  },
  {
    name: 'Джакопо', country: 'Италия',
    text: 'Найти увлечённого, преданного делу и компетентного преподавателя - большая редкость. Занятия подстраиваются под ваши конкретные потребности и уровень, но самое главное она очень инициативна и прекрасно организована. Лучшего я и желать не мог!',
    original: `Finding a passionate, dedicated, and competent teacher is rare. Classes are tailored to your specific needs and skill level, but most importantly, she is extremely proactive and well-organized. I couldn't have asked for better!`,
  },
  {
    name: 'Кристина', country: 'Украина',
    text: 'Мне очень понравились занятия с Мариям. С ней легко разговаривать, а наши беседы охватывали самые разные темы, от повседневной жизни до более глубоких обсуждений. Больше всего я ценила то, что она часто делилась естественными выражениями, которыми пользуются носители языка, и помогала мне говорить увереннее. Если вы ищете разговорную практику с обратной связью в реальном времени, уроки Мариям вам отлично подойдут. Думаю, они особенно полезны для развития речи и расширения словарного запаса в спокойной, дружелюбной атмосфере.',
    original: `I’ve really enjoyed my lessons with Mariyam. She’s easy to talk to, and our conversations covered a wide range of topics, from everyday life to deeper discussions. One of the things I appreciated most was that she often shared natural, native-like expressions and helped me sound more confident. If you’re looking for conversational practice with real-time feedback, Mariam’s lessons are a great fit. I think they’re especially useful for improving your speaking skills and expanding your vocabulary in a relaxed, friendly way.`,
  },
  {
    name: 'Инес', country: 'Испания',
    text: 'Я занимаюсь с Мариям уже полгода, и благодаря ей мой уровень английского вырос. Её уроки всегда увлекательные: мы говорим на интересные темы, и она последовательно исправляет мои ошибки так, что это действительно помогает. Она также даёт отличные советы о том, как и дальше улучшать грамматику и словарный запас. Мариям весёлая, очень организованная и по-настоящему предана своим ученикам. Я на 100% рекомендую её всем, кто хочет добиться реального прогресса в английском.',
    original: `I’ve been taking lessons with Mariyam for six months, and thanks to her, I’ve improved my English level. Her classes are always engaging. We talk about interesting topics, and she corrects me consistently in a helpful way. She also gives great advice on how to keep improving my grammar and vocabulary. Mariyam is fun, very organized, and truly committed to her students. I would 100% recommend her to anyone who wants to make real progress in English.`,
  },
  {
    name: 'Озде', country: 'Турция',
    text: 'У Мариям прекрасная энергетика, и она очень мотивирует на прогресс. Занятия с ней доставляют огромное удовольствие, как будто болтаешь с подругой.',
    original: `Mariyam has a beautiful energy and is very motivating in your progress, my lessons with her are very enjoyable as if I am chatting with a friend.`,
  },
  {
    name: 'Арзу', country: 'Азербайджан',
    text: 'Я очень рекомендую учительницу Мариям по английскому языку, потому что у неё замечательный подход к обучению, занятия всегда проходят интересные и я действительно почувствовала прогресс в своём уровне языка.',
  },
  {
    name: 'Дария', country: 'Украина',
    text: 'Мне очень нравятся занятия с Мариям! У неё очень индивидуальный подход, а уроки всегда лёгкие и весёлые. Там много разговорной практики! именно то, что я искала. Я уже чувствую себя увереннее, когда говорю! 💬✨',
    original: `I really enjoy my lessons with Mariyam! She has a very individual approach, and the lessons are always easy-going and fun. There’s a lot of speaking practice, which is exactly what I was looking for. I can already feel more confident when I speak! 💬✨`,
  },
  {
    name: 'Габриела', country: 'Словакия',
    text: 'Марьям очень профессиональный, системный и терпеливый преподаватель. Я очень довольна обучением.',
    original: `Mariyam is very professional, systematic and patient. I am very satisfied with the teaching`,
  },
  {
    name: 'Наталия', country: 'Беларусь',
    text: 'Мариям очень приятная и жизнерадостная учительница. Она много улыбается и делится мемами, благодаря чему уроки становятся веселее 😊. Она выбирает темы, которые соответствуют вашим интересам, поэтому на её уроках всегда комфортно. Учиться с ней — большое удовольствие!',
    original: `Mariyam is a very pleasant and cheerful teacher. She smiles a lot and shares memes, which makes the lessons more fun😊. She chooses topics that match your interests, so her lessons are always comfortable. Learning with her is a very enjoyable experience!`,
  },
  {
    name: 'Катя', country: 'Россия',
    text: 'Я занимаюсь с Мариям уже месяц и точно вижу прогресс. Наши уроки очень весёлые, лёгкие и продуктивные! Я наслаждаюсь каждым занятием.',
    original: `I’ve been studying with Mariyam for a month now, and I can definitely see the progress. Our lessons are very fun, light and productive! I am enjoying every lesson`,
  },
  {
    name: 'Анна', country: 'Польша',
    text: 'Я очень рекомендую Мариям как преподавателя английского. Она говорит очень чётко, поэтому уроки легко следовать и понимать. Она также терпелива и профессиональна. Она следит за тем, чтобы каждый ученик делал успехи.',
    original: `I highly recommend Mariyam as an English teacher. She speaks very clearly, making lessons easy to follow and understand. She is also patient and professional. I am ensuring that each student makes progress.`,
  },
];

function ReviewCard({ name, country, text, original }) {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <article className="rcard">
      <header className="who">
        <span className="avatar">{name[0]}</span>
        <div>
          <div className="name">{name}</div>
          <div className="country">{country}</div>
        </div>
      </header>
      {/* key remounts the clip so "Читать полностью" re-measures the new text */}
      <Clip key={showOriginal ? 'original' : 'ru'} max={190}>
        <p className="text" lang={showOriginal ? 'en' : undefined}>
          {showOriginal ? original : text}
        </p>
      </Clip>
      {original && (
        <div style={{ marginTop: 10 }}>
          <button
            className="more"
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
          >
            {showOriginal ? 'Показать перевод' : 'Показать оригинал'}
          </button>
        </div>
      )}
    </article>
  );
}

function Reviews() {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    function update() {
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
    }
    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  function scrollBySteps(dir) {
    const track = trackRef.current;
    const card = track.querySelector('.rcard');
    const stepSize = card.getBoundingClientRect().width + 20;
    track.scrollBy({ left: dir * stepSize, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  return (
    <section className="reviews" id="reviews">
      <div className="reviews-head">
        <h2>Что меняется, когда начинаешь говорить</h2>
        <p>Студенты рассказывают, с чем пришли и что получилось.</p>
      </div>

      <article className="interview">
        <header className="who">
          <span className="avatar">О</span>
          <div>
            <div className="name">Ольга</div>
            <div className="country">Россия</div>
          </div>
        </header>
        <Clip max={400}>
          {INTERVIEW.map((item) => (
            <div className="qa" key={item.q}>
              <p className="q">{item.q}</p>
              <p className="a">{item.a}</p>
            </div>
          ))}
        </Clip>
      </article>

      <div className="more-reviews">
        <div className="mr-head">
          <h3>Ещё отзывы</h3>
          <div className="arrows">
            <button className="arrow" type="button" aria-label="Назад" disabled={atStart} onClick={() => scrollBySteps(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button className="arrow" type="button" aria-label="Вперёд" disabled={atEnd} onClick={() => scrollBySteps(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <div className="track" ref={trackRef}>
          {REVIEWS.map((r) => (
            <ReviewCard key={r.name} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Who the lessons are for
   ================================================================ */
const svgProps = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

const LEVELS = [
  {
    lvl: 'A0',
    icon: (
      <svg {...svgProps}>
        <path d="M12 54h40" />
        <ellipse cx="32" cy="48" rx="6.5" ry="4.5" />
        <path d="M29 47.5q3-2 6 0" />
      </svg>
    ),
  },
  {
    lvl: 'A1–A2',
    icon: (
      <svg {...svgProps}>
        <path d="M12 54h40" />
        <path d="M32 54V38" />
        <path d="M32 42c-8 0-12-5-12-11 8 0 12 4 12 11z" />
        <path d="M32 38c8 0 12-5 12-11-8 0-12 4-12 11z" />
      </svg>
    ),
  },
  {
    lvl: 'B1–B2',
    icon: (
      <svg {...svgProps}>
        <path d="M12 54h40" />
        <path d="M32 54V22" />
        <path d="M32 46c-9 0-13-5-13-11 9 0 13 4 13 11z" />
        <path d="M32 40c9 0 13-5 13-11-9 0-13 4-13 11z" />
        <path d="M32 32c-8 0-11-4-11-9 8 0 11 3 11 9z" />
        <path d="M32 22c-3-5-3-9 0-12 3 3 3 7 0 12z" />
      </svg>
    ),
  },
  {
    lvl: 'C1+',
    icon: (
      <svg {...svgProps}>
        <path d="M12 54h40" />
        <path d="M32 54V38" />
        <path d="M32 47l7-6" />
        <circle cx="32" cy="24" r="14" />
      </svg>
    ),
  },
];

function Audience() {
  const [sel, setSel] = useState(0);
  const btnRefs = useRef([]);

  function select(i, focus) {
    setSel(i);
    if (focus && btnRefs.current[i]) btnRefs.current[i].focus();
  }

  return (
    <section className="audience" id="audience">
      <div className="audience-head">
        <h2>Для кого занятия?</h2>
        <p>На каждом уровне разные задачи</p>
      </div>

      <div className="scale" role="tablist" aria-label="Уровень английского">
        {LEVELS.map((l, i) => (
          <button
            key={l.lvl}
            ref={(el) => { btnRefs.current[i] = el; }}
            className={'stage-btn' + (i === sel ? ' active' : '') + (i <= sel ? ' reached' : '')}
            type="button"
            role="tab"
            aria-selected={i === sel}
            tabIndex={i === sel ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); select(Math.min(i + 1, LEVELS.length - 1), true); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); select(Math.max(i - 1, 0), true); }
            }}
          >
            <span className="plant">{l.icon}</span>
            <span className="lvl">{l.lvl}</span>
            <span className="rail" />
          </button>
        ))}
      </div>

      <div className="stage-panel">
        <div className="stage-body" hidden={sel !== 0}>
          <div>
            <div className="label">Где ты сейчас</div>
            <p>Твой английский остановился на London is the capital of Great Britain.</p>
          </div>
          <div>
            <div className="label">Что делаем</div>
            <p>Одна из лучших ситуаций для работы по моему методу. Всё учится по-новому, и нет неправильных привычек с ошибками.</p>
            <span className="focus">Фокус: словарь</span>
          </div>
        </div>

        <div className="stage-body" hidden={sel !== 1}>
          <div>
            <div className="label">Где ты сейчас</div>
            <p>Знаешь какую-то базу, возможно, можешь выжить в разных контекстах: заказать, заселиться, спросить. Но не хватает уверенности, и хочется расширять словарь и говорить грамотно.</p>
          </div>
          <div>
            <div className="label">Что делаем</div>
            <p>Набираем типы предложений и учимся вести себя в жизненных ситуациях: аэропорт, отель, ресторан, больница, полиция, разговор с людьми на базовые темы.</p>
            <span className="focus">Фокус: типы предложений</span>
          </div>
        </div>

        <div className="stage-body" hidden={sel !== 2}>
          <div>
            <div className="label">Где ты сейчас</div>
            <p>В принципе говоришь, может, даже смотришь фильмы и понимаешь сериал «Друзья». Но не хватает беглости, не получается выразить мнение и пошутить. Если бы они только знали, какое у тебя чувство юмора на русском! Часто не знаешь другие значения базовых фраз и фразовых глаголов. Например, отказаться можно, сказав “I’m good”.</p>
          </div>
          <div>
            <div className="label">Что делаем</div>
            <p>Также идём по карте, но с упором на фразы и фразовые глаголы. Диагностируем и восполняем пробелы.</p>
            <span className="focus">Фокус: расширение словарного запаса и типы сложных предложений</span>
          </div>
        </div>

        <div className="stage-body" hidden={sel !== 3}>
          <div>
            <div className="label">Где ты сейчас</div>
            <p>Напиши мне по почте. Цели могут быть разными, и мне нужно понять, подхожу ли я тебе как репетитор.</p>
            <a className="mail-link" href={CONTACT_URL}>Написать мне</a>
          </div>
          <div>
            <div className="label">Что делаем</div>
            <p className="motto">Ad astra, ad infinitum. 💫</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Pricing
   ================================================================ */
function plural(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'место';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'места';
  return 'мест';
}

function Pricing() {
  const left = Math.max(FOUNDER_TOTAL - FOUNDER_TAKEN, 0);
  const spotsText = left > 0 ? 'осталось ' + left + ' ' + plural(left) : 'все места заняты';

  return (
    <section className="pricing" id="pricing">
      <div className="pricing-head">
        <h2>Цены и запись</h2>
        <p>Все занятия длятся 50 минут.</p>
      </div>

      <div className="trial">
        <span className="step-label">Начни здесь</span>
        <div className="trial-top">
          <h3>Пробное занятие</h3>
          <span className="chip-free">бесплатно</span>
        </div>
        <p>Познакомимся, ты расскажешь о своих целях, и мы определим твой уровень. Я подробнее расскажу о своём подходе и покажу приложение с картой. Если всё понравится, дальше можно купить пакет занятий.</p>
        <Cta />
        <p className="facts">{FACTS}</p>
      </div>

      <div className="connector">
        <span className="line" />
        <span className="step-label">Если всё понравится, выбери пакет</span>
      </div>

      <div className="plans">
        <article className="plan">
          <div className="plan-head"><span className="plan-name">Стандартный пакет</span></div>
          <div className="price"><span className="num">£30</span><span className="per">за занятие</span></div>
          <ul>
            <li>От 4 занятий в пакете</li>
            <li>Пакет действует 28 дней</li>
          </ul>
          <p className="total">4 занятия = £120</p>
        </article>

        <article className="plan founder">
          <div className="plan-head">
            <span className="plan-name">Founder · основатели</span>
            <span className="badge">для первых 6 студентов</span>
          </div>
          <div className="price"><span className="num">£25 </span><span className="per">за занятие</span></div>
          <p className="spots"><span className="dot" /><span>{spotsText}</span></p>
          <p className="why">Я запускаю приложение, поэтому первым шестерым студентам предлагаю особую цену. Вы станете основателями Loam.</p>
          <ul>
            <li>От 8 занятий в пакете</li>
            <li>Пакет действует 28 дней</li>
            <li>Цена фиксируется на год</li>
          </ul>
          <p className="total">8 занятий = £200 <span className="saving">экономия £40 на пакете</span></p>
        </article>
      </div>

      <div className="included">
        <div>
          <span className="step-label">Включено для всех студентов</span>
          <h3>Приложение с картой слов</h3>
          <p>Полный доступ, бесплатно. В нём мы отслеживаем твой словарный запас.</p>
        </div>
        <div className="chips">
          <span className="pill p-green">полный доступ</span>
          <span className="pill p-blue">бесплатно</span>
          <span className="pill p-purple">твой словарный запас</span>
        </div>
      </div>

      <p className="fineprint">
        <span className="np">а если не подойдёт?</span> вернем деньги за неиспользованные занятия в течение 14 дней · подробнее в{' '}
        <a href={TERMS_URL} style={{ textDecoration: 'underline' }}>
          условиях обучения
        </a>
      </p>
    </section>
  );
}

/* ================================================================
   FAQ
   ================================================================ */
const FAQ = [
  { q: 'Что нужно подготовить к пробному уроку?', a: 'Ничего! Достаточно включить камеру, рассказать о себе и поделиться своими целями.' },
  { q: 'Сколько стоит занятие?', a: '£30 за занятие. Минимальный пакет: 4 занятия.' },
  { q: 'Что за предложение Founder для 6 студентов?', a: 'Я запускаю приложение, поэтому первым 6 студентам предлагаю особую цену: вы становитесь основателями. Пакет из минимум 8 занятий по £25 вместо £30. Эта цена фиксируется на 365 дней со дня оплаты. Чтобы её активировать, нужен промокод, который я отправлю при регистрации.' },
  { q: 'Как проходят занятия?', a: 'Онлайн в Zoom, по 50 минут.' },
  {
    q: 'Как записаться на занятие?',
    a: (
      <>
        Через{' '}
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline' }}
        >
          Calendly
        </a>
        . Перенести или отменить занятие можно там же, либо договориться со мной в WhatsApp или Telegram. После оплаты можно закрепить за собой постоянное время в моём расписании.
      </>
    ),
  },
  { q: 'Как долго действует пакет?', a: '28 дней с даты оплаты. Неиспользованные занятия после этого сгорают.' },
  { q: 'Можно ли перенести неиспользованные занятия в следующий пакет?', a: 'Да, частично. Если ты оплачиваешь следующий пакет в последний день действия текущего, 50% неиспользованных занятий переходят в новый пакет. Для этого не должно быть задолженностей.' },
  { q: 'Можно ли заморозить пакет?', a: 'Да, один раз за пакет, до 7 календарных дней. Срок действия пакета продлевается на дни заморозки, а занятия в это время не проводятся и не списываются.' },
  { q: 'Что если я не смогу прийти?', a: 'Предупреди меня не менее чем за 12 часов, и занятие можно перенести или отменить. Если позже, занятие считается проведённым.' },
  {
    q: 'Есть ли возвраты?',
    a: (
      <>
        Да. В течение 14 дней со дня оплаты первого пакета можно вернуть деньги за неиспользованные занятия. Проведённые занятия не возвращаются. Подробнее в{' '}
        <a href={TERMS_URL} style={{ textDecoration: 'underline' }}>
          Условиях обучения
        </a>
        .
      </>
    ),
  },
  { q: 'Я плачу не в фунтах. Что с курсом? Можно ли платить в рублях?', a: 'Если ты платишь в другой валюте, сумма конвертируется в фунты по курсу на Google на день оплаты. Способ оплаты в рублях: перевод на карту в рублях.' },
  { q: 'Можно ли записать детей на занятия?', a: 'Нет, сейчас ведется набор студентов только 18+.'},
  { q: 'Что значит Loam?', a: 'Loam - это древнеанглийское слово, переводится «чернозем», плодородная почва, в которой хорошо растет все живое. Это как в изучении английского. Ты сажаешь семена слов и ухаживаешь за ними, чтобы со временем вырос целый сад. Так устроена карта слов в приложении. 🌱' },
];

function Faq() {
  const [openIds, setOpenIds] = useState({});

  return (
    <section className="faq" id="faq">
      <h2>Частые вопросы</h2>

      <div className="faq-list">
        {FAQ.map((item, i) => {
          const isOpen = !!openIds[i];
          return (
            <div className={'faq-item' + (isOpen ? ' open' : '')} key={item.q}>
              <h3>
                <button
                  className="faq-q"
                  type="button"
                  id={'faq-q' + i}
                  aria-expanded={isOpen}
                  aria-controls={'faq-a' + i}
                  onClick={() => setOpenIds((prev) => ({ ...prev, [i]: !prev[i] }))}
                >
                  <span>{item.q}</span>
                  <span className="faq-icon" aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-a" id={'faq-a' + i} role="region" aria-labelledby={'faq-q' + i}>
                <div><p>{item.a}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ================================================================
   About me
   ================================================================ */
const QUESTIONS = [
  ['p-green', 'во сколько ты обычно просыпаешься'],
  ['p-blue', 'что ты ешь на завтрак'],
  ['p-purple', 'веришь ли ты в инопланетян'],
  ['p-sand', 'ананас на пицце: за или против'],
  ['p-green', 'кофе с каким молоком ты заказываешь'],
  ['p-blue', 'тапочки или босиком'],
];

function About() {
  const cloudRef = useRef(null);
  const [cloudIn, setCloudIn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoCaption, setVideoCaption] = useState('Познакомься со мной');

  /* question pills appear one after another when the cloud comes into view */
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setCloudIn(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCloudIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(cloudRef.current);
    return () => io.disconnect();
  }, []);

  /* YouTube loads only after a click (no tracking before that) */
  function play() {
    if (!VIDEO_ID || VIDEO_ID === 'YOUTUBE_VIDEO_ID') {
      setVideoCaption('Здесь появится видео');
      return;
    }
    setPlaying(true);
  }

  return (
    <section className="about" id="about">
      <div className="about-head">
        <span className="eyebrow">Обо мне</span>
        <h2>Однажды в твоей жизни появится человек, которому будет интересно о тебе всё.</h2>
      </div>

      <div className={'qcloud' + (cloudIn ? ' in' : '')} ref={cloudRef}>
        {QUESTIONS.map(([color, text], i) => (
          <span className={'qpill ' + color} style={{ transitionDelay: i * 90 + 'ms' }} key={text}>
            {text}
          </span>
        ))}
      </div>

      <p className="about-reveal">Этим человеком буду я, твой репетитор английского.</p>

      {/* text on the left, square video on the right (same size as the hex map) */}
      <div className="about-intro">
        <div className="about-bio">
          <p>Я Мариам! Английский открыл мне столько дверей и просто открыл совершенно другой, глобальный масштаб.</p>
          <p>Этот мир может открыться и тебе! В центре моих уроков находишься ты и то, как твоя личность может найти место и обитать внутри языка. Чтобы все видели и слышали, как ты проявляешься на английском.</p>
          <p>В 2008 году я выиграла стипендию и уехала учиться в США. Школу закончила в Калифорнии, а потом 4 года училась в университете Purdue. После 6 лет работы корпоративным тренером я переехала в мою любовь, Лондон, где училась в театральной школе.</p>
          <p>Мой подход к обучению: синтез личного опыта, бесконечной жизни из чемодана, подработок в лондонских пабах, волонтерства в хостелах Бангкока, подслушанных разговоров в Стамбуле, и, конечно, актёрского мастерства.</p>
          
        </div>

        <div className="video" id="video">
          {playing ? (
            <iframe
              src={'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(VIDEO_ID) + '?autoplay=1&rel=0'}
              title="Знакомство с Мариам"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button className="video-play" type="button" aria-label="Смотреть видео" onClick={play}>
              <span className="btn">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                </svg>
              </span>
              <span className="cap">{videoCaption}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Newsletter (Solo Mode) + teacher's quote underneath
   ================================================================ */
function Newsletter() {
  const inputRef = useRef(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (sending) return;

    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('Проверь адрес: похоже, в нём опечатка.');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setError('');
    setSending(true);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        setError('Не получилось подписаться. Попробуй ещё раз чуть позже.');
      }
    } catch {
      setError('Нет соединения. Проверь интернет и попробуй ещё раз.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="news" id="news">
      <div className="news-card">
        <div>
          <span className="eyebrow">Solo Mode · скоро</span>
          <h2>Репетитор пока не для тебя?</h2>
          <p className="lead">Я готовлю Solo Mode: режим, в котором с приложением можно заниматься самостоятельно, без репетитора. Оставь email, и ты узнаешь о запуске в числе первых и получишь доступ раньше других.</p>
        </div>

        <div aria-live="polite">
          {!done ? (
            <form className="news-form" onSubmit={submit} noValidate>
              <div className="news-row">
                <label
                  htmlFor="news-email"
                  style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
                >
                  Email
                </label>
                <input
                  id="news-email"
                  ref={inputRef}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="твой email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                />
                <button type="submit" disabled={sending}>{sending ? 'отправляю…' : 'подписаться'}</button>
              </div>
              <p className="news-error" role="alert">{error}</p>
              <p className="news-note">
                Нажимая «подписаться», ты соглашаешься получать письма о приложении Loam и запуске Solo Mode. Это не связано с записью на урок, а отписаться можно в любой момент. <a href="#">Политика конфиденциальности</a>
              </p>
            </form>
          ) : (
            <p className="news-done">Спасибо, ты в списке. 🌱</p>
          )}
        </div>
      </div>

            <figure className="quote">
        <blockquote lang="en">We're all on our individual journeys. It's a privilege to be a part of yours.</blockquote>
        <p className="quote-ru">Мы все идём своим путём. Для меня большая честь быть частью твоего.</p>
        <figcaption>мой учитель актёрского мастерства</figcaption>
      </figure>

      <p className="questions">
        Остались вопросы?{' '}
        <a
          href={CONTACT_URL_FOOTER}
          style={{ textDecoration: 'underline', color: 'inherit' }}
        >
          Напиши мне
        </a>
      </p>
    </section>
  );
}


/* ================================================================
   Page
   ================================================================ */
export default function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className={'home' + (ready ? ' ready' : '')}>
      <title>Loam: английский, который получается сказать вслух</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&family=Caveat:wght@500&display=swap&subset=cyrillic"
        rel="stylesheet"
      />

      <section className="hero">
        <div className="wordmark">Loam</div>

        <div className="hero-body">
          <h1>Знаешь слова, но молчишь, когда нужно говорить?</h1>
          <p className="sub">начни разговаривать на английском сегодня</p>
          <Cta />
          <p className="facts">{FACTS}</p>
        </div>

        <a className="scroll" href="#recognize" aria-label="Прокрутить вниз">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </section>

      <section className="recognize" id="recognize">
        <h2>Узнаешь себя?</h2>

        <div className="cards">
          <article className="card">
            <span className="num">01</span>
            <h3>знаешь слова, но не говоришь.</h3>
            <p>Ты знаешь в голове, как спрашивать. Но когда приходит момент спросить, где туалет или заказать кофе с другим молоком, всё магически куда-то исчезает.</p>
          </article>

          <article className="card">
            <span className="num">02</span>
            <h3>ты учишь новые слова.</h3>
            <p>Когда их говорят другие, ты всё понимаешь. А когда нужно вспомнить самостоятельно, в голову ничего не приходит. Зато стоит кому-то сказать это слово вслух, ты точно вспоминаешь!</p>
          </article>

          <article className="card">
            <span className="num">03</span>
            <h3>английский мне нужен.</h3>
            <p>Тебе очень хочется разговаривать, когда путешествуешь. И ты понимаешь, что английский реально может улучшить твою жизнь.</p>
          </article>
        </div>

        <p className="takeaway">Это два разных навыка: узнать слово и произнести его самостоятельно. На занятиях мы тренируем второй. Мы учимся разговаривать свободно в любой ситуации, как носитель.</p>
      </section>

      <section className="method" id="method">
        <div className="method-head">
          <span className="eyebrow">Как я преподаю</span>
          <h2>Английский, который получается сказать вслух</h2>
          <p>На уроках ты говоришь с первой минуты. Мы следим за словами, которые ты произносишь сам, и каждый следующий урок строим на них.</p>
          <Cta />
          <p className="facts">{FACTS}</p>
        </div>

        <div className="method-intro">
          <HexMap />

          <div className="method-text">
            <p>Как ты думаешь, сколько тебе нужно слов, чтобы понимать 85% разговорного английского? По исследованиям Пола Нэйшена тебе нужно <strong>1,000 слов</strong>. С них мы и начинаем.</p>
            <p>Я создала интерактивную карту этих слов. Она устроена по уровням, и в каждом шестиугольнике по 6 слов.</p>
            <p>На пробном занятии мы с тобой пройдём несколько штук. Ты пробуешь разговаривать и создавать из слов предложения. Вот как мы идём по карте:</p>
          </div>
        </div>

        <MethodDemo />

        <div className="cta-block">
          <Cta />
          <p className="facts">{FACTS}</p>
        </div>
      </section>

      <About />
      <Reviews />
      <Audience />
      <Pricing />
      <Faq />
      <Newsletter />

      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-copy">© Loam 2026</span>
          <nav className="footer-links" aria-label="Документы и контакты">
            <a href={TERMS_URL}>Условия обучения</a>
            <a href={PRIVACY_URL}>Политика конфиденциальности</a>
            <a href={CONTACT_URL_FOOTER}>Cвязаться с нами</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}