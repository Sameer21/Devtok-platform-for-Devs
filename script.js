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

function captionFromSrc(src) {
  const name = src.split('/').pop() || src;
  const stem = name.replace(/\.[^/.]+$/, '');
  return `${stem} upload.`;
}

function buildVideoData(src, index) {
  return {
    id: index + 1,
    src,
    author: '@tkodev',
    authorInitials: 'TK',
    authorColor: '#6EE7B7',
    caption: captionFromSrc(src),
    tags: ['#devtok'],
    likes: 0,
    comments: [],
    shares: 0,
    saves: 0,
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

  // Sidebar follow buttons
  const sideFollowBtn = e.target.closest('.follow-btn');
  if (sideFollowBtn) {
    sideFollowBtn.textContent = sideFollowBtn.classList.toggle('following') ? 'Following' : 'Follow';
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
   NAV TAB BUTTONS
   ═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

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


