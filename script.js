'use strict';
/* ==========================================================
   Inside the Feed — interactive model of a fictional platform
   All logic runs in the visitor's browser. Nothing is saved,
   tracked, or sent anywhere.
   ========================================================== */

/* ---------- 1. Content (all fictional) ---------- */
const CATEGORIES = [
  { id: 'food',   label: 'Home Cooking',  glyph: '🍳', hue: 18 },
  { id: 'music',  label: 'Bedroom Music', glyph: '🎧', hue: 262 },
  { id: 'art',    label: 'Sketchbooks',   glyph: '🎨', hue: 330 },
  { id: 'comedy', label: 'Comedy Skits',  glyph: '😂', hue: 42 },
  { id: 'fit',    label: 'Fitness',       glyph: '💪', hue: 140 },
  { id: 'books',  label: 'Book Talk',     glyph: '📚', hue: 205 },
  { id: 'craft',  label: 'DIY & Craft',   glyph: '🧶', hue: 95 },
  { id: 'local',  label: 'Local Stories', glyph: '🏘️', hue: 178 },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const CAPTIONS = {
  food: ["Grandma's dal, no measuring cups allowed", '3-ingredient dinner for broke weeks', 'I burned the rice so you don\'t have to', 'Rating every gas-station sandwich in town', 'First loaf of bread ever (it\'s a brick)', 'The 15-minute noodle trick everyone is copying'],
  music: ['Wrote this on a $40 keyboard at 2am', 'A lullaby on a ukulele with three strings', 'A beat made only from kitchen sounds', 'Song 47 of my one-song-a-day year', 'Loop pedal + cello + one bad idea', 'This chord progression lives in my head rent free'],
  art: ['Sketching strangers on the bus (with permission)', 'Day 112 of drawing my cat badly', 'Watercolor with coffee instead of paint', 'Turning my worst drawing into my best', 'Speedpaint: the view from my window', 'Drawing the same tree every season'],
  comedy: ['When the group project has one person doing everything', 'POV: your mom finds your browser tabs', 'Me explaining my sleep schedule to my doctor', 'Every customer at my coffee shop, ranked', 'If professors were honest on day one', 'My dog reviewing my life choices'],
  fit: ['Couch to 5K, week 1, and it is rough', 'Stretches for people who sit all day', 'Gym anxiety is real: my first day', 'Testing the viral 30-day ab challenge', 'Running in the rain because I am stubborn', 'Strength training at 62: why I started'],
  books: ['Books that made me cry on public transit', 'Reviewing a 900-page novel in 30 seconds', 'My library haul (I have a problem)', 'The poetry collection nobody talks about', 'Annotating my favorite chapter live', 'Classics ranked by how long I pretended to read them'],
  craft: ['Fixing my jeans with visible mending', 'Crocheting a frog. That is the whole video.', 'Turning a thrift-store lamp into something cute', 'Building a bookshelf with zero experience', 'Repairing headphones instead of buying new ones', 'Knitting the ugliest sweater on purpose'],
  local: ['The bakery on my street is closing after 40 years', 'Meet the man who has fixed bikes here since 1989', 'Our town\'s weirdest statue, explained', 'A community garden grew on an empty lot', 'Night shift at the diner: stories from regulars', 'Why this bridge has a name nobody uses'],
};

// Three creators per topic: one huge, one mid-size, one small.
const CREATORS = [
  ['@spoonandsmoke', 'food', 2400000], ['@dalwithdadi', 'food', 48000], ['@burntriceclub', 'food', 1200],
  ['@neonloops', 'music', 1800000], ['@cellophane.cello', 'music', 31000], ['@2am.keys', 'music', 640],
  ['@inkmachine', 'art', 950000], ['@busstopsketches', 'art', 22000], ['@badcatdrawings', 'art', 2100],
  ['@groupchatenergy', 'comedy', 3100000], ['@baristarankings', 'comedy', 67000], ['@deadpan.dani', 'comedy', 900],
  ['@liftwithleo', 'fit', 2200000], ['@desk.stretch', 'fit', 41000], ['@strongat62', 'fit', 3400],
  ['@shelfie.brooke', 'books', 1400000], ['@marginalia.mo', 'books', 18000], ['@librarygremlin', 'books', 750],
  ['@thriftflipqueen', 'craft', 1100000], ['@visiblemends', 'craft', 26000], ['@frogcrochet', 'craft', 1500],
  ['@citydrone', 'local', 780000], ['@mainstreetvoices', 'local', 12000], ['@dinerdiaries', 'local', 480],
].map(([handle, cat, followers]) => ({ handle, cat, followers }));

/* ---------- 2. Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sum = arr => arr.reduce((a, b) => a + b, 0);
const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';

function weightedPick(items, weightFn) {
  const weights = items.map(weightFn);
  let r = Math.random() * sum(weights);
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function fmt(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'K';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function entropyShare(probs) {
  const H = -sum(probs.map(p => (p > 0 ? p * Math.log(p) : 0)));
  return H / Math.log(probs.length);
}

/* ---------- 3. Routing (one page per hash) ---------- */
const PAGES = ['home', 'feed', 'creator', 'platform', 'reflection', 'notes', 'sources'];
let currentPage = 'home';

function route() {
  const id = location.hash.slice(1);
  if (id && !PAGES.includes(id)) return; // e.g. #main from the skip link
  currentPage = id || 'home';
  $$('.page').forEach(p => { p.hidden = p.id !== currentPage; });
  $$('.nav a').forEach(a => {
    if (a.getAttribute('href') === '#' + currentPage) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  const heading = $('#' + currentPage + ' [tabindex="-1"]');
  if (heading) heading.focus({ preventScroll: true });
  if (currentPage === 'platform') runLab();
}

/* ==========================================================
   PART 1 — THE FEED
   ========================================================== */
const FEED = {
  total: 20,
  like: 1.7, watch: 1.3, skip: 0.55, lingerSkip: 0.95, lingerSeconds: 4,
  exploreStart: 0.4, exploreDecay: 0.86, exploreMin: 0.05,
  sharpen: 2, popularity: 0.35,
  bigAccount: 500000, smallAccount: 10000,
};

const feed = { n: 0, interest: {}, history: [], current: null, shownAt: 0, done: false, used: new Set(), flagged: false };

function exploreChance(n = feed.n) {
  return Math.max(FEED.exploreMin, FEED.exploreStart * Math.pow(FEED.exploreDecay, n));
}

function topicProbs() {
  const e = exploreChance();
  const w = CATEGORIES.map(c => Math.pow(feed.interest[c.id], FEED.sharpen));
  const total = sum(w);
  const out = {};
  CATEGORIES.forEach((c, i) => { out[c.id] = e / CATEGORIES.length + (1 - e) * w[i] / total; });
  return out;
}

function nextPost() {
  const e = exploreChance();
  let cat, reason;
  if (Math.random() < e) {
    cat = pick(CATEGORIES).id;
    reason = 'explore';
  } else {
    cat = weightedPick(CATEGORIES, c => Math.pow(feed.interest[c.id], FEED.sharpen)).id;
    reason = 'interest';
  }
  const creator = weightedPick(CREATORS.filter(c => c.cat === cat), c => Math.pow(c.followers, FEED.popularity));
  let options = CAPTIONS[cat].filter(t => !feed.used.has(t));
  if (!options.length) {
    CAPTIONS[cat].forEach(t => feed.used.delete(t));
    options = CAPTIONS[cat];
  }
  const caption = pick(options);
  feed.used.add(caption);
  const likes = creator.followers * rand(0.01, 0.06) + rand(3, 40);
  return { cat, creator, caption, likes, reason, prob: topicProbs()[cat] };
}

function renderPost(p) {
  const c = CAT[p.cat];
  const why = p.reason === 'explore'
    ? `Random exploration: Drift is testing whether you'll respond to ${c.label}.`
    : `${c.label} makes up ${pct(p.prob)} of what Drift expects you to want.`;
  const big = p.creator.followers >= FEED.bigAccount
    ? ` ${p.creator.handle} is a big account, so it is picked more often than smaller creators in this topic.`
    : p.creator.followers < FEED.smallAccount
      ? ' A rare small creator: popularity weighting usually hides accounts this size.'
      : '';
  $('#postArea').innerHTML = `
    <article class="post" style="--h:${c.hue}">
      <div class="post-visual" aria-hidden="true"><span class="post-glyph">${c.glyph}</span></div>
      <div class="post-body">
        <span class="post-tag">${c.label}</span>
        <p class="post-caption">${p.caption}</p>
        <p class="post-meta"><span class="post-handle">${p.creator.handle}</span> · ${fmt(p.creator.followers)} followers · <span aria-label="likes">♥</span> ${fmt(p.likes)}</p>
        <p class="post-why"><span class="why-label">Why am I seeing this?</span>${why}${big}</p>
      </div>
    </article>`;
}

function showNextPost() {
  feed.current = nextPost();
  feed.shownAt = performance.now();
  renderPost(feed.current);
  $('#feedProgress').textContent = `${feed.n + 1} / ${FEED.total}`;
  $('#feedProgressBar').style.width = pct(feed.n / FEED.total, 1);
}

function addLog(text) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="log-n">#${String(feed.n).padStart(2, '0')}</span>${text}`;
  const log = $('#algoLog');
  log.prepend(li);
  while (log.children.length > 12) log.lastElementChild.remove();
}

function renderMachinery() {
  const probs = topicProbs();
  const values = CATEGORIES.map(c => probs[c.id]);
  const d = entropyShare(values);
  $('#divValue').textContent = pct(d);
  $('#divFill').style.width = pct(d, 1);
  $('#exploreValue').textContent = pct(exploreChance());
  const seen = feed.history.length;
  $('#bigShare').textContent = seen
    ? pct(feed.history.filter(h => h.creator.followers >= FEED.bigAccount).length / seen)
    : '—';
  const max = Math.max(...values);
  const sorted = CATEGORIES.slice().sort((a, b) => probs[b.id] - probs[a.id]);
  $('#interestBars').innerHTML = sorted.map(c => `
    <li class="bar-row" style="--h:${c.hue}">
      <span class="bar-label"><span aria-hidden="true">${c.glyph}</span> ${c.label}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${(probs[c.id] / max * 100).toFixed(1)}%"></span></span>
      <span class="bar-val">${pct(probs[c.id])}</span>
    </li>`).join('');
}

function feedAct(action) {
  if (feed.done || !feed.current) return;
  const p = feed.current;
  const c = CAT[p.cat];
  const dwell = (performance.now() - feed.shownAt) / 1000;
  let mult, msg;
  if (action === 'like') {
    mult = FEED.like; msg = `You liked ${c.label}. Weight ×${FEED.like}.`;
  } else if (action === 'watch') {
    mult = FEED.watch; msg = `You kept watching ${c.label}. Weight ×${FEED.watch}.`;
  } else if (dwell >= FEED.lingerSeconds) {
    mult = FEED.lingerSkip;
    msg = `You skipped ${c.label}, but only after ${dwell.toFixed(1)}s. Lingering reads as interest, so the weight barely drops (×${FEED.lingerSkip}).`;
  } else {
    mult = FEED.skip; msg = `You skipped ${c.label} after ${dwell.toFixed(1)}s. Weight ×${FEED.skip}.`;
  }
  const before = topicProbs()[p.cat];
  feed.interest[p.cat] = clamp(feed.interest[p.cat] * mult, 0.01, 1e4);
  feed.history.push({ cat: p.cat, creator: p.creator, action });
  feed.n++;
  const after = topicProbs()[p.cat];
  addLog(`${msg} Chance it shows ${c.label} next: ${pct(before)} → ${pct(after)}.`);
  if (!feed.flagged && exploreChance() < 0.2) {
    feed.flagged = true;
    addLog('Exploration has dropped below 20%. From here on, Drift mostly shows you more of what already worked.');
  }
  renderMachinery();
  if (feed.n >= FEED.total) finishFeed();
  else showNextPost();
}

function finishFeed() {
  feed.done = true;
  feed.current = null;
  $$('#postActions .act').forEach(b => { b.disabled = true; });
  $('#feedProgress').textContent = `${FEED.total} / ${FEED.total}`;
  $('#feedProgressBar').style.width = '100%';
  $('#postArea').innerHTML = `
    <div class="feed-end">
      <p class="end-glyph" aria-hidden="true">◎</p>
      <p><strong>You're all caught up.</strong></p>
      <p>Drift has seen enough to know you. Scroll down for what it learned.</p>
    </div>`;

  const probs = topicProbs();
  const d = entropyShare(CATEGORIES.map(c => probs[c.id]));
  const sorted = CATEGORIES.slice().sort((a, b) => probs[b.id] - probs[a.id]);
  const top = sorted[0];
  const faded = sorted.filter(c => probs[c.id] < 0.04);
  const h = feed.history;
  const distinct = arr => new Set(arr.map(x => x.cat)).size;
  const bigShare = h.filter(x => x.creator.followers >= FEED.bigAccount).length / h.length;
  const bigCount = CREATORS.filter(c => c.followers >= FEED.bigAccount).length;
  const smallSeen = new Set(h.filter(x => x.creator.followers < FEED.smallAccount).map(x => x.creator.handle)).size;
  const smallTotal = CREATORS.filter(c => c.followers < FEED.smallAccount).length;
  const count = a => h.filter(x => x.action === a).length;

  const fadedText = faded.length
    ? `You never asked to see less of <strong>${faded.map(c => c.label).join(', ')}</strong>. Each now has under a 4% chance of appearing. Drift inferred that for you.`
    : 'No topic has fully vanished yet. You kept Drift guessing, which real platforms usually treat as a problem to solve.';

  const s = $('#feedSummary');
  s.innerHTML = `
    <p class="kicker">Part 1 · Results</p>
    <h3>What Drift learned in ${FEED.total} posts</h3>
    <div class="findings">
      <div class="finding"><span class="finding-num">100% <span class="arrow">→</span> ${pct(d)}</span><span class="finding-label">feed diversity, start to now</span></div>
      <div class="finding"><span class="finding-num">${top.glyph} ${pct(probs[top.id])}</span><span class="finding-label">of your next feed will be ${top.label}</span></div>
      <div class="finding"><span class="finding-num">${distinct(h.slice(0, 8))} <span class="arrow">→</span> ${distinct(h.slice(-8))}</span><span class="finding-label">different topics in your first 8 posts vs. your last 8</span></div>
      <div class="finding"><span class="finding-num">${pct(bigShare)}</span><span class="finding-label">of posts came from the ${bigCount} biggest accounts, a third of all creators</span></div>
      <div class="finding"><span class="finding-num">${smallSeen} of ${smallTotal}</span><span class="finding-label">small creators (under 10K) you ever saw</span></div>
      <div class="finding"><span class="finding-num">${count('like')} · ${count('watch')} · ${count('skip')}</span><span class="finding-label">likes · watches · skips you chose</span></div>
    </div>
    <p>${fadedText}</p>
    <div class="think">
      <h4>Think about it</h4>
      <ul>
        <li>Which of these patterns did <em>you</em> decide, and which were decided for you?</li>
        <li>Did skipping feel like a neutral act? In Drift, even hesitating is data.</li>
        <li>The small creators weren't worse; they were just smaller. What does that mean for who gets a chance to start?</li>
      </ul>
    </div>
    <div class="summary-actions">
      <button class="btn btn-ghost" type="button" id="feedAgain">Run it again (try a different strategy)</button>
      <a class="btn btn-primary" href="#creator">Continue to Part 2 →</a>
    </div>`;
  s.hidden = false;
  s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  s.focus({ preventScroll: true });
}

function feedReset() {
  feed.n = 0;
  feed.history = [];
  feed.done = false;
  feed.flagged = false;
  feed.used.clear();
  CATEGORIES.forEach(c => { feed.interest[c.id] = 1; });
  $('#algoLog').innerHTML = '';
  $('#feedSummary').hidden = true;
  $$('#postActions .act').forEach(b => { b.disabled = false; });
  addLog(`Fresh account. All ${CATEGORIES.length} topics start with equal weight. Chance of a random test post: ${pct(exploreChance())}.`);
  renderMachinery();
  showNextPost();
}

/* ==========================================================
   PART 2 — THE CREATOR
   ========================================================== */
const CRE = {
  weeks: 8, startFollowers: 120,
  baseER: 0.045, threshold: 0.06,
  followerShare: 0.6, trendStrangerBoost: 2.2, trendMult: 1.5,
  trendFormat: 1.3, ownMin: 0.55, ownMax: 1.7, passionBonus: 0.1,
  short: 1.15, long: 0.8,
  testBase: 40, testShare: 0.35,
  ampPower: 2.5, ampScale: 12, maxViews: 5e6,
  followRate: 0.18, churnRate: 0.03, churnMatch: 0.6,
  passionTrendWeek: 6,
};

const cr = { phase: 'setup', week: 0, passion: null, trends: [], you: null, rival: null, voice: 50, last: null, lastRival: null };

function newAccount() {
  const taste = {};
  CATEGORIES.forEach(c => { taste[c.id] = CRE.startFollowers / CATEGORIES.length; });
  return { followers: CRE.startFollowers, taste, history: [] };
}

function planTrends(passion) {
  const trends = [];
  let prev = null;
  for (let w = 1; w <= CRE.weeks; w++) {
    if (w === CRE.passionTrendWeek) { trends.push(passion); prev = passion; continue; }
    prev = pick(CATEGORIES.map(c => c.id).filter(id => id !== passion && id !== prev));
    trends.push(prev);
  }
  return trends;
}

function simulatePost(acct, post, trend, passion) {
  const N = CATEGORIES.length;
  const totalTaste = sum(Object.values(acct.taste));
  const followerMatch = acct.taste[post.topic] / totalTaste * N; // 1 = an average topic for this audience
  const strangerMatch = (post.topic === trend ? CRE.trendStrangerBoost : 1) / (N - 1 + CRE.trendStrangerBoost) * N;
  const match = CRE.followerShare * followerMatch + (1 - CRE.followerShare) * strangerMatch;
  const trendMult = post.topic === trend ? CRE.trendMult : 1;
  const approachMult = post.approach === 'trend'
    ? CRE.trendFormat
    : rand(CRE.ownMin, CRE.ownMax) + (post.topic === passion ? CRE.passionBonus : 0);
  const lengthMult = post.length === 'short' ? CRE.short : CRE.long;
  const er = clamp(CRE.baseER * match * trendMult * approachMult * lengthMult * rand(0.85, 1.15), 0.003, 0.35);
  const test = Math.round(CRE.testBase + acct.followers * CRE.testShare);
  const amplified = er >= CRE.threshold;
  const views = amplified
    ? Math.round(Math.min(CRE.maxViews, test * (1 + Math.pow(er / CRE.threshold, CRE.ampPower) * CRE.ampScale)))
    : test;
  const likes = Math.round(views * er);
  const gained = Math.round(likes * CRE.followRate);
  const lost = followerMatch < CRE.churnMatch && acct.history.length > 0 ? Math.round(acct.followers * CRE.churnRate) : 0;
  return { ...post, trend, followerMatch, audienceShare: acct.taste[post.topic] / totalTaste, approachMult, er, test, amplified, views, likes, gained, lost };
}

function applyResult(acct, r) {
  const total = sum(Object.values(acct.taste));
  if (r.lost && total > 0) {
    for (const k in acct.taste) acct.taste[k] *= (total - r.lost) / total;
  }
  acct.taste[r.topic] += r.gained;
  acct.followers = Math.max(0, acct.followers + r.gained - r.lost);
  acct.history.push(r);
}

function voiceDelta(post) {
  if (post.topic === cr.passion) return post.approach === 'own' ? 14 : 4;
  return post.approach === 'own' ? 2 : -10;
}

function topAudience(acct) {
  const total = sum(Object.values(acct.taste));
  const id = Object.keys(acct.taste).sort((a, b) => acct.taste[b] - acct.taste[a])[0];
  return { id, share: acct.taste[id] / total };
}

function creatorReset() {
  Object.assign(cr, { phase: 'setup', week: 0, passion: null, trends: [], you: newAccount(), rival: newAccount(), voice: 50, last: null, lastRival: null });
  renderStudio();
  renderDashboard();
}

function renderStudio() {
  const s = $('#studio');
  if (cr.phase === 'setup') s.innerHTML = setupHTML();
  else if (cr.phase === 'choose') s.innerHTML = chooseHTML();
  else if (cr.phase === 'result') s.innerHTML = resultHTML();
  else s.innerHTML = doneHTML();
}

function setupHTML() {
  return `
  <div class="studio-card">
    <p class="studio-step">Before week 1</p>
    <h3>Welcome to Drift Studio.</h3>
    <p>You have ${CRE.startFollowers} followers and ${CRE.weeks} weeks. First, a question the platform will never ask you: <strong>what do you actually love making?</strong></p>
    <fieldset>
      <legend class="sr-only">Pick the topic you love making</legend>
      <div class="chip-grid">
        ${CATEGORIES.map(c => `
          <label class="chip"><input type="radio" name="passion" value="${c.id}">
            <span><span class="chip-glyph" aria-hidden="true">${c.glyph}</span>${c.label}</span></label>`).join('')}
      </div>
    </fieldset>
    <p class="studio-note">You'll grow alongside <strong>@trendchaser</strong>, who started the same day with the same ${CRE.startFollowers} followers and one rule: always post whatever is trending.</p>
    <button class="btn btn-primary" type="button" id="startCreator" disabled>Start week 1 →</button>
  </div>`;
}

function chooseHTML() {
  const trend = CAT[cr.trends[cr.week - 1]];
  const passionTrend = trend.id === cr.passion;
  const top = topAudience(cr.you);
  return `
  <div class="studio-card">
    <p class="studio-step">Week ${cr.week} of ${CRE.weeks}</p>
    <div class="trend-banner">
      <span class="trend-label">Trending on Drift this week</span>
      <strong><span aria-hidden="true">${trend.glyph}</span> ${trend.label}</strong>
      <span>Posts in this topic are being shown to more people.</span>
    </div>
    ${passionTrend ? `<p class="passion-alert">The thing you love is trending this week. The platform's incentives and yours finally line up.</p>` : ''}
    <form id="postForm">
      <fieldset>
        <legend>What will you post about?</legend>
        <div class="chip-grid">
          ${CATEGORIES.map(c => {
            const badges = [];
            if (c.id === cr.passion) badges.push('<span class="chip-badge">♥ yours</span>');
            if (c.id === trend.id) badges.push('<span class="chip-badge is-trend">trending</span>');
            if (cr.week > 1 && c.id === top.id) badges.push('<span class="chip-badge">your audience</span>');
            return `<label class="chip"><input type="radio" name="topic" value="${c.id}" ${c.id === cr.passion ? 'checked' : ''}>
              <span><span class="chip-glyph" aria-hidden="true">${c.glyph}</span>${c.label}<span class="chip-badges">${badges.join('')}</span></span></label>`;
          }).join('')}
        </div>
      </fieldset>
      <fieldset>
        <legend>How will you make it?</legend>
        <div class="option-grid">
          <label class="option"><input type="radio" name="approach" value="trend">
            <span><strong>Use the trending format</strong><small>Popular sound, hook in the first second, familiar template. Reliable.</small></span></label>
          <label class="option"><input type="radio" name="approach" value="own" checked>
            <span><strong>Make it your way</strong><small>Your own pacing, style, and ideas. It could flop. It could land.</small></span></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>How long?</legend>
        <div class="option-grid">
          <label class="option"><input type="radio" name="length" value="short" checked>
            <span><strong>15-second clip</strong><small>Easy to finish. The platform loves completion.</small></span></label>
          <label class="option"><input type="radio" name="length" value="long">
            <span><strong>3-minute piece</strong><small>Room to say something. Fewer people stay.</small></span></label>
        </div>
      </fieldset>
      <button class="btn btn-primary" type="submit">Post it</button>
    </form>
  </div>`;
}

function platformMessage(r) {
  if (r.amplified && r.approach === 'trend') return 'Great job riding the trend! Keep posting what\'s working.';
  if (r.amplified) return 'This one connected! Consistency is key, so post more like this.';
  if (r.approach === 'own') return 'Tip: creators who use trending formats see up to 3× more reach.';
  return 'Tip: try jumping on trends earlier and posting more often!';
}

function resultHTML() {
  const r = cr.last;
  const rv = cr.lastRival;
  const c = CAT[r.topic];
  const gaugeMax = 0.2;
  const top = topAudience({ taste: Object.fromEntries(Object.entries(cr.you.taste)) });
  const why = [];
  why.push(`${pct(r.audienceShare)} of your audience follows you for ${c.label} (${r.followerMatch >= 1 ? 'above' : 'below'} the 12.5% average).`);
  why.push(r.topic === r.trend ? `${c.label} was trending: boosted reach and more interested strangers.` : `${c.label} wasn't trending, so strangers in the test batch were less interested.`);
  why.push(r.approach === 'trend'
    ? 'The trending format gave its usual reliable boost (×1.3).'
    : `Making it your way is a gamble. This time the roll was ×${r.approachMult.toFixed(2)}${r.approachMult >= 1.3 ? ', better than the trending format would have given' : ''}.`);
  why.push(r.length === 'short' ? 'A short clip helped completion rate (×1.15).' : 'The longer piece lost viewers partway through (×0.8).');
  const unfollowNote = r.lost
    ? ` ${r.lost} people unfollowed. Most of your audience is here for ${CAT[top.id].label}, not ${c.label}.`
    : '';
  return `
  <div class="studio-card">
    <p class="studio-step">Week ${cr.week} results</p>
    <h3>${r.amplified ? 'Drift pushed your post.' : 'Your post stalled in testing.'}</h3>
    <p><span aria-hidden="true">${c.glyph}</span> ${c.label} · ${r.approach === 'trend' ? 'trending format' : 'your way'} · ${r.length === 'short' ? '15-second clip' : '3-minute piece'}</p>
    <div class="funnel">
      <div class="funnel-step"><span class="funnel-num">${fmt(r.test)}</span><span class="funnel-label">people in the test batch</span></div>
      <div class="funnel-step ${r.amplified ? 'pass' : 'fail'}"><span class="funnel-num">${(Math[r.amplified ? 'round' : 'floor'](r.er * 1000) / 10).toFixed(1)}%</span><span class="funnel-label">engaged. Needed ${pct(CRE.threshold)}: ${r.amplified ? '✓ passed' : '✕ below the line'}</span></div>
      <div class="funnel-step"><span class="funnel-num">${fmt(r.views)}</span><span class="funnel-label">total views</span></div>
    </div>
    <div class="gauge" aria-hidden="true">
      <div class="gauge-track">
        <div class="gauge-fill" style="width:${Math.min(100, r.er / gaugeMax * 100).toFixed(1)}%"></div>
        <div class="gauge-line" style="left:${(CRE.threshold / gaugeMax * 100).toFixed(1)}%"></div>
      </div>
      <div class="gauge-caption"><span>0%</span><span>distribution line: ${pct(CRE.threshold)}</span><span>20%</span></div>
    </div>
    <p class="result-line">+${fmt(r.gained)} new followers${r.lost ? ` · −${fmt(r.lost)} unfollowed` : ''}</p>
    <div class="platform-msg"><span class="pm-label">Drift says</span>${platformMessage(r)}</div>
    <h4>Why it went this way</h4>
    <ul class="why-list">${why.map(w => `<li>${w}</li>`).join('')}</ul>
    ${unfollowNote ? `<p>${unfollowNote}</p>` : ''}
    <p class="rival-line">Meanwhile, <strong>@trendchaser</strong> posted ${CAT[rv.topic].label} in the trending format: ${fmt(rv.views)} views, +${fmt(rv.gained)} followers.</p>
    <button class="btn btn-primary" type="button" id="nextWeek">${cr.week < CRE.weeks ? 'Next week →' : 'See where you ended up →'}</button>
  </div>`;
}

function doneHTML() {
  const you = cr.you, rv = cr.rival;
  const views = a => sum(a.history.map(h => h.views));
  const passion = CAT[cr.passion];
  const total = sum(Object.values(you.taste));
  const passionShare = you.taste[cr.passion] / total;
  const top = topAudience(you);
  const ratio = rv.followers / Math.max(1, you.followers);
  let verdict;
  if (cr.voice >= 70 && ratio > 1.2) {
    verdict = `You mostly made what you love, and Drift mostly didn't show it. @trendchaser ended with ${ratio.toFixed(1)}× your followers by never once making a choice of its own.`;
  } else if (cr.voice < 45) {
    verdict = `You grew by drifting away from what you set out to make. Only ${pct(passionShare)} of your audience now follows you for ${passion.label}, so posting it again would mean starting over.`;
  } else if (you.followers >= rv.followers) {
    verdict = 'You kept up with @trendchaser, partly through choices and partly through luck. In Drift, your own work is a dice roll; trend posts are a safe bet.';
  } else {
    verdict = 'You split the difference: some posts for you, some for the platform. Notice which ones the numbers rewarded.';
  }
  const maxV = Math.max(...you.history.map(h => h.views), ...rv.history.map(h => h.views));
  const w = v => (Math.log10(v + 1) / Math.log10(maxV + 1) * 100).toFixed(1);
  const rows = you.history.map((h, i) => {
    const r = rv.history[i];
    return `
      <div class="cmp-row">
        <span class="cmp-week">W${i + 1}</span>
        <div class="cmp-bars">
          <div class="cmp-line"><span class="cmp-bar you" style="width:${w(h.views)}%"></span><span class="cmp-text">You · ${fmt(h.views)} · ${CAT[h.topic].label}</span></div>
          <div class="cmp-line"><span class="cmp-bar rival" style="width:${w(r.views)}%"></span><span class="cmp-text">@trendchaser · ${fmt(r.views)}</span></div>
        </div>
      </div>`;
  }).join('');
  return `
  <div class="studio-card">
    <p class="studio-step">After ${CRE.weeks} weeks</p>
    <h3>Where you ended up</h3>
    <p>${verdict}</p>
    <div class="compare">
      <div class="compare-card you"><h4>You</h4><dl>
        <dt>Followers</dt><dd>${fmt(you.followers)}</dd>
        <dt>Total views</dt><dd>${fmt(views(you))}</dd>
        <dt>Feels like your work</dt><dd>${cr.voice}/100</dd>
        <dt>Audience mostly here for</dt><dd>${CAT[top.id].label}</dd>
      </dl></div>
      <div class="compare-card"><h4>@trendchaser</h4><dl>
        <dt>Followers</dt><dd>${fmt(rv.followers)}</dd>
        <dt>Total views</dt><dd>${fmt(views(rv))}</dd>
        <dt>Feels like its work</dt><dd>—</dd>
        <dt>Audience mostly here for</dt><dd>whatever's next</dd>
      </dl></div>
    </div>
    <h4>Views each week</h4>
    <div class="cmp">${rows}</div>
    <p class="cmp-caption">Bars use a logarithmic scale so small and huge numbers both stay visible.</p>
    <div class="think">
      <h4>Think about it</h4>
      <ul>
        <li>Drift never told you not to make your own work. What made you change course, or what kept you from changing?</li>
        <li>Your audience was built by your past posts. By week ${CRE.passionTrendWeek}, how free were you to change direction?</li>
        <li>If thousands of creators make the same choices you just made, what kind of culture does the platform end up with?</li>
      </ul>
    </div>
    <div class="summary-actions">
      <button class="btn btn-ghost" type="button" id="creatorAgain">Play again</button>
      <a class="btn btn-primary" href="#platform">Part 3: run the platform →</a>
    </div>
  </div>`;
}

function renderDashboard() {
  const you = cr.you;
  $('#dashWeek').textContent = cr.phase === 'setup' ? 'Not started' : cr.phase === 'done' ? 'Season over' : `Week ${cr.week} of ${CRE.weeks}`;
  $('#dashFollowers').textContent = fmt(you.followers);
  $('#dashRival').textContent = fmt(cr.rival.followers);
  $('#voiceValue').textContent = cr.voice;
  $('#voiceFill').style.width = cr.voice + '%';
  const total = sum(Object.values(you.taste)) || 1;
  const shares = CATEGORIES.map(c => ({ c, s: you.taste[c.id] / total })).sort((a, b) => b.s - a.s);
  const max = shares[0].s;
  $('#audienceBars').innerHTML = shares.map(({ c, s }) => `
    <li class="bar-row" style="--h:${c.hue}">
      <span class="bar-label"><span aria-hidden="true">${c.glyph}</span> ${c.label}${c.id === cr.passion ? ' ♥' : ''}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${(s / max * 100).toFixed(1)}%"></span></span>
      <span class="bar-val">${pct(s)}</span>
    </li>`).join('');
  $('#postHistory').innerHTML = you.history.length
    ? you.history.map((h, i) => `<li><span class="ph-week">W${i + 1}</span><span aria-hidden="true">${CAT[h.topic].glyph}</span> ${CAT[h.topic].label} · ${h.approach === 'trend' ? 'trend format' : 'your way'} · <strong>${fmt(h.views)}</strong> views ${h.amplified ? '<span class="ph-pushed">(pushed)</span>' : ''}</li>`).join('')
    : '<li class="empty">Nothing posted yet.</li>';
}

function submitPost(form) {
  const data = new FormData(form);
  const post = { topic: data.get('topic'), approach: data.get('approach'), length: data.get('length') };
  if (!post.topic) return;
  const trend = cr.trends[cr.week - 1];
  const r = simulatePost(cr.you, post, trend, cr.passion);
  applyResult(cr.you, r);
  cr.voice = clamp(cr.voice + voiceDelta(post), 0, 100);
  const rv = simulatePost(cr.rival, { topic: trend, approach: 'trend', length: 'short' }, trend, null);
  applyResult(cr.rival, rv);
  cr.last = r;
  cr.lastRival = rv;
  cr.phase = 'result';
  renderStudio();
  renderDashboard();
  focusStudio();
}

function focusStudio() {
  const card = $('#studio .studio-card');
  if (!card) return;
  const h = card.querySelector('h3, .studio-step');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

/* ==========================================================
   PART 3 — THE PLATFORM (rule lab)
   Runs many simulated users through a feed built with the
   visitor's settings, then reports the averages.
   ========================================================== */
const LAB_PRESETS = {
  drift: { explore: 5, popularity: 35, sharpen: 20, linger: true },
  engagement: { explore: 0, popularity: 80, sharpen: 30, linger: true },
  discovery: { explore: 35, popularity: 0, sharpen: 10, linger: false },
};

function readLab() {
  return {
    explore: +$('#labExplore').value / 100,
    popularity: +$('#labPopularity').value / 100,
    sharpen: +$('#labSharpen').value / 10,
    linger: $('#labLinger').checked,
  };
}

// One simulated user: loves one topic, sometimes enjoys others,
// and hesitates before skipping about a third of the time.
function simulateUser(cfg, posts = 40) {
  const fav = pick(CATEGORIES).id;
  const interest = Object.fromEntries(CATEGORIES.map(c => [c.id, 1]));
  let likes = 0, big = 0;
  const smallSeen = new Set();
  const last = [];
  for (let n = 0; n < posts; n++) {
    const e = Math.max(cfg.explore, FEED.exploreStart * Math.pow(FEED.exploreDecay, n));
    const cat = Math.random() < e
      ? pick(CATEGORIES).id
      : weightedPick(CATEGORIES, c => Math.pow(interest[c.id], cfg.sharpen)).id;
    const creator = weightedPick(CREATORS.filter(c => c.cat === cat), c => Math.pow(c.followers, cfg.popularity));
    if (creator.followers >= FEED.bigAccount) big++;
    if (creator.followers < FEED.smallAccount) smallSeen.add(creator.handle);
    if (n >= posts - 10) last.push(cat);
    const liked = Math.random() < (cat === fav ? 0.85 : 0.18);
    if (liked) { likes++; interest[cat] *= FEED.like; }
    else interest[cat] *= (cfg.linger && Math.random() < 0.35) ? FEED.lingerSkip : FEED.skip;
    interest[cat] = clamp(interest[cat], 0.01, 1e4);
  }
  return { engagement: likes / posts, big: big / posts, small: smallSeen.size, topics: new Set(last).size };
}

function runLab() {
  if (!$('#labExplore')) return;
  const cfg = readLab();
  $('#labExploreOut').textContent = pct(cfg.explore);
  $('#labPopularityOut').textContent = cfg.popularity.toFixed(2);
  $('#labSharpenOut').textContent = cfg.sharpen.toFixed(1);
  const runs = 200;
  const acc = { engagement: 0, big: 0, small: 0, topics: 0 };
  for (let i = 0; i < runs; i++) {
    const r = simulateUser(cfg);
    for (const k in acc) acc[k] += r[k];
  }
  for (const k in acc) acc[k] /= runs;
  const smallTotal = CREATORS.filter(c => c.followers < FEED.smallAccount).length;
  const bigCount = CREATORS.filter(c => c.followers >= FEED.bigAccount).length;
  const results = [
    { label: 'Engagement', sub: 'share of posts liked — a simplified engagement measure', value: acc.engagement, text: pct(acc.engagement) },
    { label: 'Topic variety', sub: 'different topics in each user\'s last 10 posts (of 8)', value: acc.topics / CATEGORIES.length, text: acc.topics.toFixed(1) },
    { label: 'Big-account share', sub: `share of posts from the ${bigCount} accounts over 500K`, value: acc.big, text: pct(acc.big) },
    { label: 'Small creators reached', sub: `of ${smallTotal} accounts under 10K, how many each user ever saw`, value: acc.small / smallTotal, text: `${acc.small.toFixed(1)} of ${smallTotal}` },
  ];
  $('#labResults').innerHTML = results.map(r => `
    <div class="lab-result">
      <div class="lab-result-head"><span>${r.label}</span><strong>${r.text}</strong></div>
      <div class="meter" aria-hidden="true"><div class="meter-fill" style="width:${(r.value * 100).toFixed(1)}%"></div></div>
      <p class="meter-note">${r.sub}</p>
    </div>`).join('');
  $('#labRuns').textContent = `Averaged over ${runs} simulated users, 40 posts each.`;
}

function applyPreset(name) {
  const p = LAB_PRESETS[name];
  if (!p) return;
  $('#labExplore').value = p.explore;
  $('#labPopularity').value = p.popularity;
  $('#labSharpen').value = p.sharpen;
  $('#labLinger').checked = p.linger;
  $$('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
  runLab();
}

/* ==========================================================
   Wiring
   ========================================================== */
function init() {
  window.addEventListener('hashchange', route);
  route();

  // Part 1
  $('#postActions').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) feedAct(btn.dataset.action);
  });
  $('#feedSummary').addEventListener('click', e => {
    if (e.target.id === 'feedAgain') {
      feedReset();
      $('#feed-title').scrollIntoView({ behavior: 'smooth' });
    }
  });
  $('#machineryToggle').addEventListener('change', e => {
    document.body.classList.toggle('blind', !e.target.checked);
  });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || currentPage !== 'feed' || feed.done) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && e.target.type !== 'checkbox')) return;
    const action = { l: 'like', w: 'watch', s: 'skip' }[e.key.toLowerCase()];
    if (action) { e.preventDefault(); feedAct(action); }
  });
  feedReset();

  // Part 2
  const studio = $('#studio');
  studio.addEventListener('change', e => {
    if (e.target.name === 'passion') $('#startCreator').disabled = false;
  });
  studio.addEventListener('click', e => {
    if (e.target.id === 'startCreator') {
      const chosen = $('input[name="passion"]:checked', studio);
      if (!chosen) return;
      cr.passion = chosen.value;
      cr.trends = planTrends(cr.passion);
      cr.week = 1;
      cr.phase = 'choose';
    } else if (e.target.id === 'nextWeek') {
      if (cr.week >= CRE.weeks) cr.phase = 'done';
      else { cr.week++; cr.phase = 'choose'; }
    } else if (e.target.id === 'creatorAgain') {
      creatorReset();
      focusStudio();
      return;
    } else return;
    renderStudio();
    renderDashboard();
    focusStudio();
  });
  studio.addEventListener('submit', e => {
    e.preventDefault();
    submitPost(e.target);
  });
  creatorReset();

  // Part 3
  $$('#labControls input').forEach(input => input.addEventListener('input', () => {
    $$('.preset').forEach(b => b.setAttribute('aria-pressed', 'false'));
    runLab();
  }));
  $$('.preset').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
  applyPreset('drift');

  // Sharing
  $('#shareBtn').addEventListener('click', async () => {
    const status = $('#shareStatus');
    const url = location.href.split('#')[0];
    if (location.protocol === 'file:') {
      status.textContent = 'Publish the site first (see README) to get a shareable link.';
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Inside the Feed', text: 'Step inside a fictional feed and see who gets seen.', url });
        status.textContent = '';
      } else {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link copied!';
      }
    } catch (err) {
      if (!err || err.name !== 'AbortError') status.textContent = url;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
