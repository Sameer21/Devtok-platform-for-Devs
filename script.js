/**
 * DevTok — script.js
 * Vanilla JS, no dependencies.
 * Auto-discovers files named /videos/video1.mp4, video2.mp4, ... at startup.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   VIDEO DATA
   Add files in /videos as video1.mp4, video2.mp4, ...
   Feed is built automatically (no per-video JS edits).
   ═══════════════════════════════════════════════════════════ */
let VIDEO_DATA = [];


/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */
const state = {
  currentIndex: 0,
  muted: false,
  likedIds: new Set(),
  savedIds: new Set(),
  followingIds: new Set(),
  lastTap: 0,
  drawerVideoId: null,
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function wrapIndex(index) {
  const n = VIDEO_DATA.length;
  if (!n) return 0;
  return ((index % n) + n) % n;
}

const MAX_AUTO_VIDEOS = 500;


const RANDOM_AUTHORS = [
  { author: '@tkodev',     authorInitials: 'TK', authorColor: '#6EE7B7' },
  { author: '@arjunr',     authorInitials: 'AR', authorColor: '#818CF8' },
  { author: '@mlhacks',    authorInitials: 'ml', authorColor: '#F472B6' },
  { author: '@dx_dev',     authorInitials: 'DX', authorColor: '#FBBF24' },
  { author: '@zrdesign',   authorInitials: 'ZR', authorColor: '#60A5FA' },
  { author: '@byteboss',   authorInitials: 'BB', authorColor: '#A78BFA' },
  { author: '@svelteking', authorInitials: 'SK', authorColor: '#F87171' },
  { author: '@cloudninja', authorInitials: 'CN', authorColor: '#34D399' },
  { author: '@opensrcdev', authorInitials: 'OS', authorColor: '#FB923C' },
  { author: '@tsqueen',    authorInitials: 'TQ', authorColor: '#E879F9' },
];

const RANDOM_CAPTIONS = [
  'When your regex works on the first try 🎉 #devmagic',
  'CSS is just a suggestion at this point 💀 #frontendfails',
  'Shipped to prod on a Friday. No regrets. 🚀 #yolo',
  'Finally understood closures after 3 years 😭 #javascript',
  'My tech stack is held together by vibes and Stack Overflow',
  'Refactored 500 lines down to 12. Today was a good day ✨',
  'The bug was a missing semicolon. I am fine. Totally fine.',
  'Turned coffee into code since 6am ☕ #grind',
  'Types are love. Types are life. #typescript',
  'Just dropped my first open source lib 🎊 go star it pls',
  'Nobody: … Me at 2am: let me rewrite this in Rust',
  'docker-compose up ✅  docker-compose down ✅  understanding what happened ❌',
  'git blame always finds me 👀 #guilty',
  'Kubernetes is just distributed chaos with extra steps',
  'Hot take: dark mode is a personality trait and I stand by it 🌙',
  'My PR got 47 comments. Half were about variable names.',
  'vim user btw. been trying to exit since 2019 💀',
  'Built a whole feature. Pushed to wrong branch. Classic.',
  'The documentation said it was simple. The documentation lied.',
  'console.log driven development is a valid methodology change my mind',
];

const RANDOM_TAGS = [
  ['#javascript', '#webdev'],
  ['#typescript', '#devlife'],
  ['#rustlang', '#systems'],
  ['#python', '#ai'],
  ['#css', '#frontend'],
  ['#devops', '#linux'],
  ['#opensource', '#100daysofcode'],
  ['#react', '#hooks'],
  ['#go', '#backend'],
  ['#devhumor', '#programming'],
];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildVideoData(src, index) {
  const author  = getRandom(RANDOM_AUTHORS);
  const caption = getRandom(RANDOM_CAPTIONS);
  const tags    = getRandom(RANDOM_TAGS);
  return {
    id: index + 1,
    src,
    ...author,
    caption,
    tags,
    likes: Math.floor(Math.random() * 9800) + 200,
    comments: [],
    shares: Math.floor(Math.random() * 500),
    saves: Math.floor(Math.random() * 300),
  };
}

function canLoadVideo(src) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      v.src = '';
      resolve(ok);
    };

    v.preload = 'metadata';
    v.onloadedmetadata = () => finish(true);
    v.oncanplay = () => finish(true);
    v.onerror = () => finish(false);
    v.src = src;

    setTimeout(() => finish(false), 1500);
  });
}

async function autoDiscoverVideos() {
  const discovered = [];
  for (let i = 1; i <= MAX_AUTO_VIDEOS; i += 1) {
    const src = `videos/video${i}.mp4`;
    // Stop at first missing file: video1, video2, ..., videoN naming
    const exists = await canLoadVideo(src);
    if (!exists) break;
    discovered.push(buildVideoData(src, i - 1));
  }
  VIDEO_DATA = discovered;
}

/* ═══════════════════════════════════════════════════════════
   DOM HELPERS
   ═══════════════════════════════════════════════════════════ */
const feed = document.getElementById('feed');
const commentDrawer = document.getElementById('commentDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendComment');
const likeBurst = document.getElementById('likeBurst');

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ═══════════════════════════════════════════════════════════
   BUILD CARDS
   ═══════════════════════════════════════════════════════════ */
function buildCard(data, index) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.id = data.id;
  card.dataset.index = index;

  const isLiked = state.likedIds.has(data.id);
  const isSaved = state.savedIds.has(data.id);
  const isFollowing = state.followingIds.has(data.id);

  card.innerHTML = `
    <div class="video-wrapper" id="wrapper-${data.id}">
      <!-- Loading ring -->
      <div class="loading-ring" id="loader-${data.id}"></div>

      <!-- Video -->
      <video
        id="vid-${data.id}"
        src="${data.src}"
        loop
        playsinline
        preload="none"
        ${state.muted ? 'muted' : ''}
      ></video>

      <!-- Placeholder (shown when video not available) -->
      <div class="video-placeholder" id="placeholder-${data.id}" style="display:none">
        <div class="ph-icon">🎬</div>
        <div class="ph-label">${data.src}</div>
        <div class="ph-label" style="opacity:0.4;font-size:10px">Place file in /videos/ folder</div>
      </div>

      <!-- Mute button -->
      <button class="mute-btn" id="muteBtn-${data.id}" title="Toggle mute">
        ${muteIcon(state.muted)}
      </button>

      <!-- Pause overlay -->
      <div class="pause-overlay" id="pauseOverlay-${data.id}">
        <div class="pause-icon">▶</div>
      </div>

      <!-- Info overlay -->
      <div class="video-info">
        <div class="video-author">
          <div class="author-avatar" style="border-color:${data.authorColor};background:linear-gradient(135deg,${data.authorColor}44,${data.authorColor}88)">
            ${data.authorInitials}
          </div>
          <span class="author-name">${data.author}</span>
          <button class="follow-inline ${isFollowing ? 'following' : ''}" data-id="${data.id}">
            ${isFollowing ? 'Following' : '+ Follow'}
          </button>
        </div>
        <p class="video-caption">${data.caption}</p>
        <div class="video-tags">
          ${data.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progress-${data.id}"></div>
      </div>
    </div>

    <!-- Action buttons (right side of wrapper) -->
    <div class="action-btns">
      <div class="action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-id="${data.id}">
        <div class="btn-icon"><span class="like-emoji">❤️</span></div>
        <span class="btn-count" id="likeCount-${data.id}">${fmt(data.likes + (isLiked ? 1 : 0))}</span>
      </div>
      <div class="action-btn" data-action="comment" data-id="${data.id}">
        <div class="btn-icon">💬</div>
        <span class="btn-count">${fmt(data.comments.length)}</span>
      </div>
      <div class="action-btn" data-action="share" data-id="${data.id}">
        <div class="btn-icon">🔗</div>
        <span class="btn-count">${fmt(data.shares)}</span>
      </div>
      <div class="action-btn ${isSaved ? 'saved' : ''}" data-action="save" data-id="${data.id}">
        <div class="btn-icon">⭐</div>
        <span class="btn-count" id="saveCount-${data.id}">${fmt(data.saves + (isSaved ? 1 : 0))}</span>
      </div>
    </div>
  `;

  return card;
}

function muteIcon(muted) {
  return muted
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
       </svg>`;
}

/* ═══════════════════════════════════════════════════════════
   RENDER ALL CARDS
   ═══════════════════════════════════════════════════════════ */
function renderFeed() {
  feed.innerHTML = '';
  if (!VIDEO_DATA.length) {
    feed.innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-family:var(--font-mono);font-size:14px;">
        No videos found. Add files as videos/video1.mp4, video2.mp4, ...
      </div>
    `;
    return;
  }
  VIDEO_DATA.forEach((data, i) => {
    feed.appendChild(buildCard(data, i));
  });
  bindCardEvents();
  loadVideo(0);
  showKeyHint();
}

/* ═══════════════════════════════════════════════════════════
   VIDEO CONTROL
   ═══════════════════════════════════════════════════════════ */
function getVideo(id) { return document.getElementById(`vid-${id}`); }
function getLoader(id) { return document.getElementById(`loader-${id}`); }
function getProgress(id) { return document.getElementById(`progress-${id}`); }
function getPauseOverlay(id) { return document.getElementById(`pauseOverlay-${id}`); }

function loadVideo(index) {
  if (index < 0 || index >= VIDEO_DATA.length) return;
  const data = VIDEO_DATA[index];
  const video = getVideo(data.id);
  if (!video) return;

  // Only preload current + next
  video.preload = 'auto';
  if (VIDEO_DATA.length > 1) {
    const nextIndex = wrapIndex(index + 1);
    const next = getVideo(VIDEO_DATA[nextIndex].id);
    if (next) next.preload = 'metadata';
  }
}

function playVideo(index) {
  if (index < 0 || index >= VIDEO_DATA.length) return;
  const data = VIDEO_DATA[index];
  const video = getVideo(data.id);
  if (!video) return;

  video.muted = state.muted;
  video.preload = 'auto';

  const loader = getLoader(data.id);
  const placeholder = document.getElementById(`placeholder-${data.id}`);

  // Handle missing file gracefully
  video.onerror = () => {
    if (loader) loader.classList.remove('active');
    if (placeholder) { placeholder.style.display = 'flex'; video.style.display = 'none'; }
  };

  video.oncanplay = () => {
    if (loader) loader.classList.remove('active');
  };

  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {
      // Autoplay blocked — mute and retry
      video.muted = true;
      state.muted = true;
      updateAllMuteIcons();
      video.play().catch(() => {});
    });
  }

  // Progress tracking
  video.ontimeupdate = () => {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    const bar = getProgress(data.id);
    if (bar) bar.style.width = pct + '%';
  };
}

function pauseVideo(index) {
  if (index < 0 || index >= VIDEO_DATA.length) return;
  const video = getVideo(VIDEO_DATA[index].id);
  if (video) video.pause();
}

function updateAllMuteIcons() {
  VIDEO_DATA.forEach(d => {
    const btn = document.getElementById(`muteBtn-${d.id}`);
    if (btn) btn.innerHTML = muteIcon(state.muted);
    const v = getVideo(d.id);
    if (v) v.muted = state.muted;
  });
}

/* ═══════════════════════════════════════════════════════════
   SCROLL / NAVIGATION
   ═══════════════════════════════════════════════════════════ */
let scrollTimeout;
feed.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const cardH = feed.clientHeight;
    const newIndex = Math.round(feed.scrollTop / cardH);
    if (newIndex !== state.currentIndex) {
      pauseVideo(state.currentIndex);
      state.currentIndex = newIndex;
      playVideo(state.currentIndex);
      loadVideo(wrapIndex(state.currentIndex + 1)); // preload next
    }
  }, 80);
});

function navigateTo(index) {
  if (!VIDEO_DATA.length) return;
  const wrapped = wrapIndex(index);
  pauseVideo(state.currentIndex);
  state.currentIndex = wrapped;
  const cardH = feed.clientHeight;
  feed.scrollTo({ top: wrapped * cardH, behavior: 'smooth' });
  setTimeout(() => playVideo(state.currentIndex), 300);
}

function loopToIndex(targetIndex) {
  if (!VIDEO_DATA.length) return;
  const wrapped = wrapIndex(targetIndex);
  const cardH = feed.clientHeight;
  pauseVideo(state.currentIndex);
  state.currentIndex = wrapped;
  feed.scrollTo({ top: wrapped * cardH, behavior: 'auto' });
  playVideo(wrapped);
  loadVideo(wrapIndex(wrapped + 1));
}

feed.addEventListener('wheel', (e) => {
  if (VIDEO_DATA.length < 2) return;
  const cardH = feed.clientHeight;
  const maxScroll = cardH * (VIDEO_DATA.length - 1);
  const atTop = feed.scrollTop <= 2;
  const atBottom = feed.scrollTop >= (maxScroll - 2);

  if (e.deltaY > 0 && atBottom) {
    e.preventDefault();
    loopToIndex(0);
  } else if (e.deltaY < 0 && atTop) {
    e.preventDefault();
    loopToIndex(VIDEO_DATA.length - 1);
  }
}, { passive: false });

let touchStartY = 0;
feed.addEventListener('touchstart', (e) => {
  touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

feed.addEventListener('touchend', (e) => {
  if (VIDEO_DATA.length < 2) return;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const cardH = feed.clientHeight;
  const maxScroll = cardH * (VIDEO_DATA.length - 1);
  const atTop = feed.scrollTop <= 2;
  const atBottom = feed.scrollTop >= (maxScroll - 2);

  if (dy < -30 && atBottom) {
    loopToIndex(0);
  } else if (dy > 30 && atTop) {
    loopToIndex(VIDEO_DATA.length - 1);
  }
}, { passive: true });

/* ─── Keyboard navigation ────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (!VIDEO_DATA.length) return;
  switch (e.key) {
    case 'ArrowDown':
    case 'j':
      e.preventDefault();
      navigateTo(state.currentIndex + 1);
      break;
    case 'ArrowUp':
    case 'k':
      e.preventDefault();
      navigateTo(state.currentIndex - 1);
      break;
    case 'm':
    case 'M':
      if (VIDEO_DATA[state.currentIndex]) toggleMute(VIDEO_DATA[state.currentIndex].id);
      break;
    case ' ':
      e.preventDefault();
      togglePlayPause(state.currentIndex);
      break;
    case 'l':
    case 'L':
      if (VIDEO_DATA[state.currentIndex]) triggerLike(VIDEO_DATA[state.currentIndex].id);
      break;
  }
});

function togglePlayPause(index) {
  if (index < 0 || index >= VIDEO_DATA.length) return;
  const data = VIDEO_DATA[index];
  const video = getVideo(data.id);
  const overlay = getPauseOverlay(data.id);
  if (!video) return;

  if (video.paused) {
    video.play();
    if (overlay) { overlay.classList.add('visible'); setTimeout(() => overlay.classList.remove('visible'), 700); }
  } else {
    video.pause();
    if (overlay) overlay.classList.add('visible');
  }
}

/* ═══════════════════════════════════════════════════════════
   BIND CARD EVENTS
   ═══════════════════════════════════════════════════════════ */
function bindCardEvents() {
  // Action buttons delegation
  feed.addEventListener('click', handleFeedClick);

  // Double tap on video wrapper
  feed.addEventListener('click', handleDoubleTap);
}

function handleFeedClick(e) {
  // Mute button
  const muteBtn = e.target.closest('.mute-btn');
  if (muteBtn) {
    const id = parseInt(muteBtn.id.replace('muteBtn-', ''));
    toggleMute(id);
    return;
  }

  // Action buttons
  const actionBtn = e.target.closest('.action-btn');
  if (actionBtn) {
    const action = actionBtn.dataset.action;
    const id = parseInt(actionBtn.dataset.id);
    if (action === 'like') triggerLike(id, actionBtn);
    if (action === 'comment') openCommentDrawer(id);
    if (action === 'share') triggerShare(id);
    if (action === 'save') triggerSave(id, actionBtn);
    return;
  }

  // Follow inline button
  const followBtn = e.target.closest('.follow-inline');
  if (followBtn) {
    const id = parseInt(followBtn.dataset.id);
    toggleFollow(id, followBtn);
    return;
  }

  // Click on video wrapper = toggle play/pause
  const wrapper = e.target.closest('.video-wrapper');
  if (wrapper && !e.target.closest('.action-btns') && !e.target.closest('.mute-btn')) {
    const card = wrapper.closest('.video-card');
    if (card) togglePlayPause(parseInt(card.dataset.index));
  }
}

let tapTimer;
function handleDoubleTap(e) {
  const wrapper = e.target.closest('.video-wrapper');
  if (!wrapper) return;
  if (e.target.closest('.action-btns') || e.target.closest('.mute-btn') || e.target.closest('.follow-inline')) return;

  const now = Date.now();
  if (now - state.lastTap < 320) {
    // Double tap
    clearTimeout(tapTimer);
    const card = wrapper.closest('.video-card');
    const id = parseInt(card.dataset.id);
    triggerLike(id, null, true);
    showLikeBurst(e.clientX, e.clientY);
  } else {
    tapTimer = setTimeout(() => {}, 320);
  }
  state.lastTap = now;
}

/* ─── Mute ───────────────────────────────── */
function toggleMute(id) {
  state.muted = !state.muted;
  updateAllMuteIcons();
}

/* ─── Like ───────────────────────────────── */
function triggerLike(id, btnEl, fromDoubleTap = false) {
  const btn = btnEl || document.querySelector(`.action-btn[data-action="like"][data-id="${id}"]`);
  const data = VIDEO_DATA.find(v => v.id === id);
  if (!data) return;

  const wasLiked = state.likedIds.has(id);
  if (wasLiked && !fromDoubleTap) {
    state.likedIds.delete(id);
    data.likes = Math.max(0, data.likes - 1);
    if (btn) btn.classList.remove('liked');
  } else if (!wasLiked) {
    state.likedIds.add(id);
    data.likes += 1;
    if (btn) {
      btn.classList.add('liked', 'like-pop');
      setTimeout(() => btn.classList.remove('like-pop'), 400);
    }
  }

  const countEl = document.getElementById(`likeCount-${id}`);
  if (countEl) countEl.textContent = fmt(data.likes);
}

/* ─── Save ───────────────────────────────── */
function triggerSave(id, btn) {
  const data = VIDEO_DATA.find(v => v.id === id);
  if (!data) return;

  if (state.savedIds.has(id)) {
    state.savedIds.delete(id);
    data.saves = Math.max(0, data.saves - 1);
    btn.classList.remove('saved');
  } else {
    state.savedIds.add(id);
    data.saves += 1;
    btn.classList.add('saved');
  }

  const countEl = document.getElementById(`saveCount-${id}`);
  if (countEl) countEl.textContent = fmt(data.saves);
}

/* ─── Share ──────────────────────────────── */
function triggerShare(id) {
  const data = VIDEO_DATA.find(v => v.id === id);
  if (!data) return;

  if (navigator.share) {
    navigator.share({
      title: `DevTok — ${data.author}`,
      text: data.caption,
      url: window.location.href,
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Link copied! 🔗');
  }
}

/* ─── Follow ─────────────────────────────── */
function toggleFollow(id, btn) {
  if (state.followingIds.has(id)) {
    state.followingIds.delete(id);
    btn.classList.remove('following');
    btn.textContent = '+ Follow';
  } else {
    state.followingIds.add(id);
    btn.classList.add('following');
    btn.textContent = 'Following';
  }
}

/* ═══════════════════════════════════════════════════════════
   COMMENT DRAWER
   ═══════════════════════════════════════════════════════════ */
function openCommentDrawer(id) {
  state.drawerVideoId = id;
  const data = VIDEO_DATA.find(v => v.id === id);
  if (!data) return;

  renderComments(data.comments);
  commentDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
  commentInput.focus();
}

function closeCommentDrawer() {
  commentDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  state.drawerVideoId = null;
}

function renderComments(comments) {
  commentsList.innerHTML = '';
  if (!comments.length) {
    commentsList.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">No comments yet. Be first! 🚀</p>`;
    return;
  }
  comments.forEach(c => {
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.innerHTML = `
      <div class="avatar sm" style="background:linear-gradient(135deg,var(--accent2),var(--accent3))">${c.author.slice(1,3).toUpperCase()}</div>
      <div class="comment-body">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-time">${c.time}</div>
      </div>
    `;
    commentsList.appendChild(el);
  });
  commentsList.scrollTop = commentsList.scrollHeight;
}

document.getElementById('closeDrawer').addEventListener('click', closeCommentDrawer);
drawerOverlay.addEventListener('click', closeCommentDrawer);

sendCommentBtn.addEventListener('click', postComment);
commentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') postComment(); });

function postComment() {
  const text = commentInput.value.trim();
  if (!text || !state.drawerVideoId) return;

  const data = VIDEO_DATA.find(v => v.id === state.drawerVideoId);
  if (!data) return;

  const newComment = { author: '@you', text, time: 'just now' };
  data.comments.push(newComment);
  renderComments(data.comments);
  commentInput.value = '';

  // Update comment count badge
  const btn = document.querySelector(`.action-btn[data-action="comment"][data-id="${state.drawerVideoId}"] .btn-count`);
  if (btn) btn.textContent = fmt(data.comments.length);
}

/* ═══════════════════════════════════════════════════════════
   LIKE BURST (double tap animation)
   ═══════════════════════════════════════════════════════════ */
function showLikeBurst(x, y) {
  likeBurst.style.left = (x - 36) + 'px';
  likeBurst.style.top  = (y - 36) + 'px';
  likeBurst.classList.remove('burst');
  void likeBurst.offsetWidth; // reflow
  likeBurst.classList.add('burst');
}

/* ═══════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--surface2);border:1px solid var(--border);
    color:var(--text);font-family:var(--font-mono);font-size:13px;
    padding:8px 18px;border-radius:99px;z-index:999;
    animation:hint-fade 2.5s ease forwards;pointer-events:none;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ═══════════════════════════════════════════════════════════
   KEYBOARD HINT
   ═══════════════════════════════════════════════════════════ */
function showKeyHint() {
  const hint = document.createElement('div');
  hint.className = 'key-hint';
  hint.innerHTML = `
    <span>↑↓ navigate</span>
    <span>Space pause</span>
    <span>M mute</span>
    <span>L like</span>
  `;
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 4500);
}

/* ═══════════════════════════════════════════════════════════
   NAV TAB BUTTONS + FOLLOWING FEED
   ═══════════════════════════════════════════════════════════ */

// Followed users map: handle → { name, initials, color, meta, isNew }
const followedUsers = new Map();

const followingFeed      = document.getElementById('followingFeed');
const followingFeedInner = document.getElementById('followingFeedInner');
const trendingFeedPanel  = document.getElementById('trendingFeedPanel');
const trendingFeedInner  = document.getElementById('trendingFeedInner');
let   activeTab          = 'for-you';

/* ─── Trending Data ──────────────────────── */
const TRENDING_DATA = [
  { tag:'javascript', desc:'Weekly JS tips, tricks, and wild one-liners flying across the dev community.', posts:'84.2k', views:'2.1M',  change:'up',  pct:92, badge:'🔥 Hot' },
  { tag:'typescript', desc:'TS 5.x features, strict mode debates, and type gymnastics at its finest.',      posts:'61.7k', views:'1.4M',  change:'up',  pct:80, badge:'↑ Rising' },
  { tag:'rustlang',   desc:'Memory safety meets blazing speed. Ownership model explainers going viral.',    posts:'39.4k', views:'920k',  change:'hot', pct:74, badge:'🔥 Hot' },
  { tag:'devlife',    desc:'Memes, burnout stories, pair-programming fails, and coffee-fuelled wins.',      posts:'112k',  views:'5.8M',  change:'hot', pct:99, badge:'🔥 Hot' },
  { tag:'ai',         desc:'LLM benchmarks, prompt engineering, and the latest model drop reactions.',      posts:'95.1k', views:'3.3M',  change:'up',  pct:96, badge:'↑ Surging' },
  { tag:'linux',      desc:'Distro wars, dotfile flexing, and Neovim converts sharing their configs.',      posts:'28.3k', views:'610k',  change:'up',  pct:55, badge:'↑ Steady' },
  { tag:'opensource', desc:'New repo launches, contribution guides, and "first PR" celebration threads.',   posts:'44.8k', views:'1.1M',  change:'new', pct:62, badge:'✨ New' },
  { tag:'100daysofcode', desc:'Day-by-day progress logs, project showcases, and community accountability.', posts:'73.5k', views:'1.9M', change:'up',  pct:78, badge:'↑ Rising' },
  { tag:'webdev',     desc:'CSS art, layout tricks, accessibility wins, and framework drama as usual.',      posts:'55.9k', views:'1.6M', change:'up',  pct:70, badge:'↑ Rising' },
  { tag:'python',     desc:'FastAPI tutorials, data viz snippets, and ML pipeline walkthroughs.',            posts:'48.2k', views:'1.2M', change:'new', pct:66, badge:'✨ New' },
];

let activeTrendFilter = 'all';

function renderTrendingFeed() {
  trendingFeedInner.innerHTML = '';

  // Hero
  const hero = document.createElement('div');
  hero.className = 'trending-hero';
  hero.innerHTML = `
    <div class="trending-hero-icon">🔥</div>
    <div class="trending-hero-title">What's Trending</div>
    <div class="trending-hero-sub">Top tags across DevTok right now — updated live</div>`;
  trendingFeedInner.appendChild(hero);

  // Filter chips
  const filters = ['all','🔥 Hot','↑ Rising','✨ New'];
  const row = document.createElement('div');
  row.className = 'trending-tags-row';
  filters.forEach(f => {
    const chip = document.createElement('button');
    chip.className = 'trend-filter-tag' + (activeTrendFilter === f ? ' active' : '');
    chip.textContent = f === 'all' ? '# All Tags' : f;
    chip.addEventListener('click', () => {
      activeTrendFilter = f;
      renderTrendingFeed();
    });
    row.appendChild(chip);
  });
  trendingFeedInner.appendChild(row);

  // Section header
  const head = document.createElement('div');
  head.className = 'following-section-head';
  head.innerHTML = `
    <span class="following-section-title">Trending Tags</span>
    <span class="following-count-badge">${TRENDING_DATA.length} tags</span>`;
  trendingFeedInner.appendChild(head);

  // Cards
  const filtered = activeTrendFilter === 'all'
    ? TRENDING_DATA
    : TRENDING_DATA.filter(t => t.badge.startsWith(activeTrendFilter.charAt(0)) || t.badge.includes(activeTrendFilter.trim()));

  filtered.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.style.animationDelay = `${i * 50}ms`;
    card.innerHTML = `
      <div class="trend-rank ${i < 3 ? 'top' : ''}">${i + 1}</div>
      <div class="trend-info">
        <div class="trend-tag-name"><span>#</span>${t.tag}</div>
        <div class="trend-desc">${t.desc}</div>
        <div class="trend-meta-row">
          <span class="trend-meta-item"><strong>${t.posts}</strong> posts</span>
          <span class="trend-meta-item"><strong>${t.views}</strong> views</span>
        </div>
      </div>
      <div class="trend-spark">
        <span class="trend-change ${t.change}">${t.badge}</span>
        <div class="trend-bar-wrap"><div class="trend-bar-fill" style="width:${t.pct}%"></div></div>
      </div>`;
    card.addEventListener('click', () => showToast(`#${t.tag} — ${t.posts} posts 🔥`));
    trendingFeedInner.appendChild(card);
  });
}

function renderFollowingFeed() {
  followingFeedInner.innerHTML = '';

  if (followedUsers.size === 0) {
    followingFeedInner.innerHTML = `
      <div class="following-empty">
        <div class="following-empty-icon">👥</div>
        <div class="following-empty-title">Nobody here yet</div>
        <div class="following-empty-sub">Follow creators from the Suggested section to see their content here.</div>
        <button class="following-empty-cta" id="followingBackBtn">Discover Creators</button>
      </div>`;
    document.getElementById('followingBackBtn')?.addEventListener('click', () => switchTab('for-you'));
    return;
  }

  const head = document.createElement('div');
  head.className = 'following-section-head';
  head.innerHTML = `
    <span class="following-section-title">People you follow</span>
    <span class="following-count-badge">${followedUsers.size} following</span>`;
  followingFeedInner.appendChild(head);

  let delay = 0;
  followedUsers.forEach((user, handle) => {
    const card = document.createElement('div');
    card.className = 'following-user-card';
    card.style.animationDelay = `${delay}ms`;
    delay += 60;

    const tags = user.meta.split('·').map(t => `<span class="fu-tag">#${t.trim().toLowerCase().replace(/[^a-z0-9]/g,'')}</span>`).join('');

    card.innerHTML = `
      <div class="fu-avatar" style="background:linear-gradient(135deg,${user.color}bb,${user.color})">${user.initials}</div>
      <div class="fu-info">
        <div class="fu-name">${user.name}</div>
        <div class="fu-handle">@${handle}</div>
        <div class="fu-meta">${user.meta}</div>
        <div class="fu-tags">${tags}</div>
      </div>
      <div class="fu-actions">
        ${user.isNew ? '<span class="fu-new-badge">New</span>' : ''}
        <button class="fu-unfollow-btn" data-handle="${handle}">Unfollow</button>
      </div>`;

    card.querySelector('.fu-unfollow-btn').addEventListener('click', () => unfollowUser(handle));
    followingFeedInner.appendChild(card);
  });
}

function unfollowUser(handle) {
  followedUsers.delete(handle);
  const sideRow = document.querySelector(`.sidebar-user[data-handle="${handle}"]`);
  if (sideRow) {
    const btn = sideRow.querySelector('.follow-btn');
    btn.textContent = 'Follow';
    btn.classList.remove('following');
  }
  renderFollowingFeed();
  showToast(`Unfollowed @${handle}`);
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  followingFeed.style.display     = tab === 'following' ? 'block' : 'none';
  trendingFeedPanel.style.display = tab === 'trending'  ? 'block' : 'none';
  if (tab === 'following') renderFollowingFeed();
  if (tab === 'trending')  renderTrendingFeed();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ═══════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════ */
const SEARCH_DATA = {
  creators: [
    { type:'creator', initials:'TK', color:'#6EE7B7', name:'@tkodev',    sub:'React · TypeScript',   followers:'12.4k' },
    { type:'creator', initials:'AR', color:'#818CF8', name:'@arjunr',    sub:'Rust · Systems',        followers:'8.1k'  },
    { type:'creator', initials:'ml', color:'#F472B6', name:'@mlhacks',   sub:'Python · ML/AI',        followers:'22.9k' },
    { type:'creator', initials:'DX', color:'#FBBF24', name:'@dx_dev',    sub:'Web Performance',       followers:'5.3k'  },
    { type:'creator', initials:'ZR', color:'#60A5FA', name:'@zrdesign',  sub:'UI · CSS · Design',     followers:'9.7k'  },
    { type:'creator', initials:'KP', color:'#34D399', name:'@kpgolang',  sub:'Go · Backend',          followers:'14.2k' },
    { type:'creator', initials:'NS', color:'#A78BFA', name:'@nisha_sys', sub:'Linux · DevOps',        followers:'6.8k'  },
    { type:'creator', initials:'RV', color:'#F87171', name:'@rvvim',     sub:'Vim · Terminal Nerd',   followers:'3.1k'  },
  ],
  tags: [
    { type:'tag', name:'#javascript',    sub:'Trending · 48k posts'  },
    { type:'tag', name:'#rustlang',      sub:'Growing · 19k posts'   },
    { type:'tag', name:'#typescript',    sub:'Trending · 37k posts'  },
    { type:'tag', name:'#devlife',       sub:'Chill · 61k posts'     },
    { type:'tag', name:'#100daysofcode', sub:'Challenge · 92k posts' },
    { type:'tag', name:'#linux',         sub:'Classic · 55k posts'   },
    { type:'tag', name:'#ai',            sub:'Hot 🔥 · 110k posts'   },
    { type:'tag', name:'#opensource',    sub:'Community · 44k posts' },
    { type:'tag', name:'#python',        sub:'Trending · 80k posts'  },
    { type:'tag', name:'#webdev',        sub:'Popular · 73k posts'   },
    { type:'tag', name:'#golang',        sub:'Rising · 15k posts'    },
    { type:'tag', name:'#systemdesign',  sub:'Deep · 28k posts'      },
  ],
  topics: [
    { type:'topic', name:'Machine Learning',   sub:'AI & Data Science'       },
    { type:'topic', name:'Web Performance',    sub:'Speed & Optimization'    },
    { type:'topic', name:'Open Source',        sub:'Community & Projects'    },
    { type:'topic', name:'System Design',      sub:'Architecture & Scale'    },
    { type:'topic', name:'Terminal & Vim',     sub:'CLI Productivity'        },
    { type:'topic', name:'Interview Prep',     sub:'Coding & Career'         },
    { type:'topic', name:'DevOps & CI/CD',     sub:'Pipelines & Infra'       },
    { type:'topic', name:'Functional Programming', sub:'FP Concepts'         },
  ],
};

const TRENDING_TAGS = [
  { label:'#ai',            count:'110k' },
  { label:'#100daysofcode', count:'92k'  },
  { label:'#python',        count:'80k'  },
  { label:'#webdev',        count:'73k'  },
  { label:'#javascript',    count:'48k'  },
  { label:'#linux',         count:'55k'  },
  { label:'#typescript',    count:'37k'  },
  { label:'#opensource',    count:'44k'  },
];

let recentSearches = ['#rustlang', '@mlhacks', 'system design', '#typescript'];
let activeSearchTab = 'all';

const searchBtn      = document.getElementById('searchBtn');
const searchOverlay  = document.getElementById('searchOverlay');
const searchInput    = document.getElementById('searchInput');
const searchClear    = document.getElementById('searchClear');
const searchCancel   = document.getElementById('searchCancel');
const searchDefault  = document.getElementById('searchDefault');
const searchResults  = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const recentList     = document.getElementById('recentList');
const trendingGrid   = document.getElementById('trendingGrid');
const popularCreators = document.getElementById('popularCreators');
const clearRecentsBtn = document.getElementById('clearRecents');

function openSearch() {
  searchOverlay.classList.add('open');
  renderSearchDefault();
  setTimeout(() => searchInput.focus(), 80);
  searchBtn.style.color = 'var(--accent2)';
}

function closeSearch() {
  searchOverlay.classList.remove('open');
  searchInput.value = '';
  searchClear.classList.remove('visible');
  showSearchDefault();
  searchBtn.style.color = '';
}

function showSearchDefault() {
  searchDefault.style.display = 'block';
  searchResults.style.display = 'none';
}

function showSearchResults() {
  searchDefault.style.display = 'none';
  searchResults.style.display = 'block';
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<span class="search-highlight">$1</span>');
}

function renderSearchDefault() {
  // Recents
  recentList.innerHTML = '';
  const recentSection = document.getElementById('recentSection');
  if (!recentSearches.length) { recentSection.style.display = 'none'; }
  else {
    recentSection.style.display = 'block';
    recentSearches.forEach((q, i) => {
      const el = document.createElement('div');
      el.className = 'recent-item';
      el.innerHTML = `
        <div class="recent-icon">${q.startsWith('#') ? '#️⃣' : q.startsWith('@') ? '👤' : '🔍'}</div>
        <span class="recent-text">${q}</span>
        <button class="recent-remove" data-i="${i}" title="Remove">✕</button>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.recent-remove')) return;
        searchInput.value = q;
        searchInput.dispatchEvent(new Event('input'));
      });
      el.querySelector('.recent-remove').addEventListener('click', () => {
        recentSearches.splice(i, 1);
        renderSearchDefault();
      });
      recentList.appendChild(el);
    });
  }

  // Trending
  trendingGrid.innerHTML = '';
  TRENDING_TAGS.forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'trend-chip';
    chip.innerHTML = `${t.label} <span class="trend-count">${t.count}</span>`;
    chip.addEventListener('click', () => {
      searchInput.value = t.label;
      searchInput.dispatchEvent(new Event('input'));
    });
    trendingGrid.appendChild(chip);
  });

  // Popular creators
  popularCreators.innerHTML = '';
  SEARCH_DATA.creators.slice(0, 4).forEach(c => {
    const el = document.createElement('div');
    el.className = 'creator-row';
    el.innerHTML = `
      <div class="creator-av" style="background:linear-gradient(135deg,${c.color}bb,${c.color})">${c.initials}</div>
      <div class="creator-info">
        <div class="creator-name">${c.name}</div>
        <div class="creator-meta">${c.sub}</div>
      </div>
      <div class="creator-followers">${c.followers}</div>
    `;
    el.addEventListener('click', () => {
      searchInput.value = c.name;
      searchInput.dispatchEvent(new Event('input'));
    });
    popularCreators.appendChild(el);
  });
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) { showSearchDefault(); return; }
  showSearchResults();

  const allData = [
    ...SEARCH_DATA.creators,
    ...SEARCH_DATA.tags,
    ...SEARCH_DATA.topics,
  ];

  const filter = (items) => items.filter(item =>
    item.name.toLowerCase().includes(q) ||
    (item.sub && item.sub.toLowerCase().includes(q))
  );

  const filteredAll      = filter(allData);
  const filteredCreators = filter(SEARCH_DATA.creators);
  const filteredTags     = filter(SEARCH_DATA.tags);
  const filteredTopics   = filter(SEARCH_DATA.topics);

  const map = { all: filteredAll, creators: filteredCreators, tags: filteredTags, topics: filteredTopics };
  renderResults(map[activeSearchTab] || filteredAll, q);
}

function renderResults(items, query) {
  searchResultsList.innerHTML = '';
  if (!items.length) {
    searchResultsList.innerHTML = `
      <div class="search-no-results">
        <div class="nr-icon">🔍</div>
        <div class="nr-text">No results for "<strong>${query}</strong>"</div>
        <div class="nr-sub">Try a different keyword or tag</div>
      </div>`;
    return;
  }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'search-result-item';

    if (item.type === 'creator') {
      el.innerHTML = `
        <div class="sr-avatar" style="background:linear-gradient(135deg,${item.color}bb,${item.color})">${item.initials}</div>
        <div class="sr-info">
          <div class="sr-name">${highlight(item.name, query)}</div>
          <div class="sr-sub">${highlight(item.sub, query)} · ${item.followers} followers</div>
        </div>
        <span class="sr-badge creator">Creator</span>
      `;
    } else if (item.type === 'tag') {
      el.innerHTML = `
        <div class="sr-tag-icon">#</div>
        <div class="sr-info">
          <div class="sr-name">${highlight(item.name, query)}</div>
          <div class="sr-sub">${highlight(item.sub, query)}</div>
        </div>
        <span class="sr-badge tag">Tag</span>
      `;
    } else {
      el.innerHTML = `
        <div class="sr-tag-icon" style="background:rgba(244,114,182,0.12);border-color:rgba(244,114,182,0.25);color:var(--accent3)">⚡</div>
        <div class="sr-info">
          <div class="sr-name">${highlight(item.name, query)}</div>
          <div class="sr-sub">${highlight(item.sub, query)}</div>
        </div>
        <span class="sr-badge topic">Topic</span>
      `;
    }

    el.addEventListener('click', () => {
      if (!recentSearches.includes(item.name)) {
        recentSearches.unshift(item.name);
        if (recentSearches.length > 5) recentSearches.pop();
      }
      showToast(`Opened: ${item.name}`);
      closeSearch();
    });

    searchResultsList.appendChild(el);
  });
}

// Tab switching
document.querySelectorAll('.sr-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sr-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeSearchTab = tab.dataset.tab;
    runSearch(searchInput.value);
  });
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  searchClear.classList.toggle('visible', val.length > 0);
  runSearch(val);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSearch();
  if (e.key === 'Enter' && searchInput.value.trim()) {
    const q = searchInput.value.trim();
    if (!recentSearches.includes(q)) {
      recentSearches.unshift(q);
      if (recentSearches.length > 5) recentSearches.pop();
    }
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  showSearchDefault();
  searchInput.focus();
});

searchCancel.addEventListener('click', closeSearch);
searchBtn.addEventListener('click', openSearch);

clearRecentsBtn.addEventListener('click', () => {
  recentSearches = [];
  renderSearchDefault();
});

// Close on backdrop click (outside modal)
searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearch();
});

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION PANEL
   ═══════════════════════════════════════════════════════════ */
const NOTIFICATIONS = [
  { id: 1, type: 'like',    unread: true,  avatar: 'TK', color: '#6EE7B7', text: '<strong>@tkodev</strong> liked your comment on <strong>#typescript</strong>',     time: '2 min ago' },
  { id: 2, type: 'follow',  unread: true,  avatar: 'AR', color: '#818CF8', text: '<strong>@arjunr</strong> started following you',                                    time: '14 min ago' },
  { id: 3, type: 'comment', unread: true,  avatar: 'ml', color: '#F472B6', text: '<strong>@mlhacks</strong> commented: <em>"Great explanation of closures!"</em>',    time: '1 hr ago' },
  { id: 4, type: 'like',    unread: false, avatar: 'DX', color: '#FBBF24', text: '<strong>@dx_dev</strong> liked your post on <strong>#rustlang</strong>',            time: '3 hrs ago' },
  { id: 5, type: 'mention', unread: false, avatar: 'ZR', color: '#60A5FA', text: '<strong>@zrdesign</strong> mentioned you in a comment',                             time: 'Yesterday' },
  { id: 6, type: 'system',  unread: false, avatar: null, color: null,      text: '🎉 Your post reached <strong>1,000 views!</strong> Keep it up.',                   time: '2 days ago' },
];

const TYPE_EMOJI = { like: '❤️', follow: '👤', comment: '💬', mention: '@', system: '🔔' };

const notifBtn      = document.getElementById('notifBtn');
const notifPanel    = document.getElementById('notifPanel');
const notifBackdrop = document.getElementById('notifBackdrop');
const notifBadge    = document.getElementById('notifBadge');
const notifList     = document.getElementById('notifList');
const notifMarkAll  = document.getElementById('notifMarkAll');

let notifOpen = false;
let notifications = [...NOTIFICATIONS];

function countUnread() { return notifications.filter(n => n.unread).length; }

function updateBadge() {
  const n = countUnread();
  notifBadge.textContent = n;
  notifBadge.style.display = n > 0 ? 'flex' : 'none';
}

function renderNotifications() {
  notifList.innerHTML = '';
  if (!notifications.length) {
    notifList.innerHTML = `<div class="notif-empty"><div class="notif-empty-icon">🔔</div>No notifications yet</div>`;
    return;
  }
  notifications.forEach(n => {
    const el = document.createElement('div');
    el.className = 'notif-item' + (n.unread ? ' unread' : '');
    el.dataset.id = n.id;

    const iconHTML = n.avatar
      ? `<div class="notif-avatar" style="background:linear-gradient(135deg,${n.color}bb,${n.color})">${n.avatar}</div>`
      : `<div class="notif-icon-wrap">${TYPE_EMOJI[n.type] || '🔔'}</div>`;

    el.innerHTML = `
      ${iconHTML}
      <div class="notif-body">
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    `;

    el.addEventListener('click', () => {
      n.unread = false;
      el.classList.remove('unread');
      updateBadge();
    });

    notifList.appendChild(el);
  });
}

function openNotifPanel() {
  notifOpen = true;
  renderNotifications();
  notifPanel.classList.add('open');
  notifBackdrop.classList.add('open');
  notifBtn.style.color = 'var(--accent)';
}

function closeNotifPanel() {
  notifOpen = false;
  notifPanel.classList.remove('open');
  notifBackdrop.classList.remove('open');
  notifBtn.style.color = '';
}

notifBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  notifOpen ? closeNotifPanel() : openNotifPanel();
});

notifBackdrop.addEventListener('click', closeNotifPanel);

notifMarkAll.addEventListener('click', () => {
  notifications.forEach(n => n.unread = false);
  renderNotifications();
  updateBadge();
  showToast('All notifications marked as read ✓');
});

// Init badge
updateBadge();

/* ═══════════════════════════════════════════════════════════
   SIDEBAR FOLLOW BUTTONS
   ═══════════════════════════════════════════════════════════ */
document.querySelector('.sidebar').addEventListener('click', (e) => {
  const btn = e.target.closest('.follow-btn');
  if (!btn) return;
  const userRow = btn.closest('.sidebar-user');
  const handle  = userRow?.dataset.handle;
  const isNowFollowing = btn.classList.toggle('following');
  btn.textContent = isNowFollowing ? 'Following' : 'Follow';

  if (handle) {
    if (isNowFollowing) {
      followedUsers.set(handle, {
        name:     userRow.dataset.name,
        initials: userRow.dataset.initials,
        color:    userRow.dataset.color,
        meta:     userRow.dataset.meta,
        isNew:    true,
      });
      showToast(`Following @${handle} ✓`);
    } else {
      followedUsers.delete(handle);
      showToast(`Unfollowed @${handle}`);
    }
    if (activeTab === 'following') renderFollowingFeed();
  }
});

/* ═══════════════════════════════════════════════════════════
   PROFILE MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
const profileState = {
  displayName: 'James Dev',
  handle: 'jamesdev',
  bio: 'Full-stack dev. Building things in public. 🚀',
  avatarColor: '#6EE7B7',
  initials: 'JD',
  // editing draft
  draft: {},
};

const profileModal   = document.getElementById('profileModal');
const profileOverlay = document.getElementById('profileOverlay');
const profileClose   = document.getElementById('profileClose');
const profileEditToggle = document.getElementById('profileEditToggle');
const profileView    = document.getElementById('profileView');
const profileEditEl  = document.getElementById('profileEdit');

// View elements
const viewDisplayName  = document.getElementById('viewDisplayName');
const viewHandle       = document.getElementById('viewHandle');
const viewBio          = document.getElementById('viewBio');
const profileAvatarDisplay = document.getElementById('profileAvatarDisplay');
const statLikesEl      = document.getElementById('statLikes');
const statSavedEl      = document.getElementById('statSaved');

// Edit elements
const editDisplayName = document.getElementById('editDisplayName');
const editHandle      = document.getElementById('editHandle');
const editBio         = document.getElementById('editBio');
const editBioCount    = document.getElementById('bioCharCount');
const editSaveBtn     = document.getElementById('editSave');
const editCancelBtn   = document.getElementById('editCancel');
const profileAvatarEdit = document.getElementById('profileAvatarEdit');
const colorSwatches   = document.querySelectorAll('.color-swatch');

function openProfileModal() {
  // refresh live stats
  statLikesEl.textContent = fmt(state.likedIds.size);
  statSavedEl.textContent = fmt(state.savedIds.size);
  renderProfileView();
  showProfileView();
  profileOverlay.classList.add('open');
  profileModal.classList.add('open');
  profileEditToggle.textContent = 'Edit';
  profileEditToggle.classList.remove('editing');
}

function closeProfileModal() {
  profileModal.classList.remove('open');
  profileOverlay.classList.remove('open');
}

function renderProfileView() {
  viewDisplayName.textContent = profileState.displayName;
  viewHandle.textContent = '@' + profileState.handle;
  viewBio.textContent = profileState.bio || '—';
  updateAvatarUI(profileAvatarDisplay, profileState.avatarColor, profileState.initials);
  // also sync topbar avatar
  document.querySelector('.topbar-actions .avatar').textContent = profileState.initials;
}

function updateAvatarUI(el, color, initials) {
  if (!el) return;
  el.textContent = initials;
  el.style.background = `linear-gradient(135deg, ${color}bb, ${color})`;
  el.style.outlineColor = color;
}

function showProfileView() {
  profileView.style.display = 'flex';
  profileEditEl.style.display = 'none';
}

function showEditMode() {
  // populate draft fields
  editDisplayName.value = profileState.displayName;
  editHandle.value = profileState.handle;
  editBio.value = profileState.bio;
  editBioCount.textContent = profileState.bio.length;
  updateAvatarUI(profileAvatarEdit, profileState.avatarColor, profileState.initials);

  // mark active color swatch
  colorSwatches.forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === profileState.avatarColor);
  });

  profileView.style.display = 'none';
  profileEditEl.style.display = 'flex';
  profileEditToggle.textContent = 'View';
  profileEditToggle.classList.add('editing');
  editDisplayName.focus();
}

function saveProfile() {
  const newName    = editDisplayName.value.trim();
  const newHandle  = editHandle.value.trim().replace(/^@/, '');
  const newBio     = editBio.value.trim();
  if (!newName) { editDisplayName.focus(); showToast('Name cannot be empty ✏️'); return; }
  if (!newHandle) { editHandle.focus(); showToast('Handle cannot be empty ✏️'); return; }

  profileState.displayName = newName;
  profileState.handle      = newHandle;
  profileState.bio         = newBio;
  profileState.initials    = (newName.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();

  renderProfileView();
  showProfileView();
  profileEditToggle.textContent = 'Edit';
  profileEditToggle.classList.remove('editing');
  showToast('Profile saved ✅');
}

// Color swatch clicks
colorSwatches.forEach(sw => {
  sw.addEventListener('click', () => {
    colorSwatches.forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    profileState.avatarColor = sw.dataset.color;
    updateAvatarUI(profileAvatarEdit, profileState.avatarColor,
      editDisplayName.value.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || profileState.initials
    );
  });
});

// Bio char counter
editBio.addEventListener('input', () => {
  editBioCount.textContent = editBio.value.length;
});

// initials preview while typing name
editDisplayName.addEventListener('input', () => {
  const initials = editDisplayName.value.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (profileAvatarEdit && initials) profileAvatarEdit.textContent = initials;
});

profileClose.addEventListener('click', closeProfileModal);
profileOverlay.addEventListener('click', closeProfileModal);
editCancelBtn.addEventListener('click', () => { showProfileView(); profileEditToggle.textContent = 'Edit'; profileEditToggle.classList.remove('editing'); });
editSaveBtn.addEventListener('click', saveProfile);

profileEditToggle.addEventListener('click', () => {
  if (profileEditEl.style.display === 'none') {
    showEditMode();
  } else {
    showProfileView();
    profileEditToggle.textContent = 'Edit';
    profileEditToggle.classList.remove('editing');
  }
});

// Open on avatar click
document.querySelector('.topbar-actions .avatar').addEventListener('click', openProfileModal);

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
async function init() {
  await autoDiscoverVideos();
  shuffleInPlace(VIDEO_DATA);
  renderFeed();

  // Auto-play first video after brief delay (browser policy)
  if (VIDEO_DATA.length) {
    setTimeout(() => playVideo(0), 300);
  }
}

init();
