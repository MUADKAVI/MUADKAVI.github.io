import { blogs } from './content.js';
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── Helpers ────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[j], a[i]] = [a[i], a[j]];
  }
  return a;
}

const JOBS_QUOTES = [
  "Design is not just what it looks like. Design is how it works.",
  "Simple can be harder than complex.",
  "Innovation distinguishes between a leader and a follower.",
  "Quality is more important than quantity. One home run is much better than two doubles.",
  "Stay hungry, stay foolish.",
  "Details matter, it's worth waiting to get it right."
];

// ─── Game Engine ────────────────────────────────────────────
class Game {
  constructor() {
    this.round = 0;
    this.totalShown = 0;
    this.totalClicked = 0;
    this.stats = { clicksA: 0, clicksB: 0, shownA: 0, shownB: 0 };
    this.currentBlog = null;
    this.currentVariant = null; 
    this.adTimer = null;
    this.queue = [];       
    this.isActive = false;
    this.pregameAnswer = null;

    // Secret timer range (no UI countdown)
    this.AD_DELAY_MIN = 8000;
    this.AD_DELAY_MAX = 12000;

    // Cache DOM
    this.els = {
      header:       document.getElementById('game-header'),
      landing:      document.getElementById('landing-screen'),
      blogSite:     document.getElementById('blog-site'),
      endScreen:    document.getElementById('end-screen'),
      adOverlay:    document.getElementById('ad-overlay'),
      adBanner:     document.getElementById('ad-banner'),
      roundCount:   document.getElementById('round-count'),
      jobsQuote:    document.getElementById('jobs-quote'),
      totalPlayers: document.getElementById('total-players'),
    };

    this.init();
  }

  init() {
    this.startQuoteRotation();
    this.bind();
    
    // Simulate "hundreds of" players
    const fakeCount = 420 + Math.floor(Math.random() * 50);
    this.els.totalPlayers.textContent = `${fakeCount} other`;
  }

  startQuoteRotation() {
    setInterval(() => {
      const quote = JOBS_QUOTES[Math.floor(Math.random() * JOBS_QUOTES.length)];
      if (this.els.jobsQuote) {
        this.els.jobsQuote.style.animation = 'none';
        void this.els.jobsQuote.offsetWidth; // trigger reflow
        this.els.jobsQuote.textContent = `"${quote}"`;
        this.els.jobsQuote.style.animation = 'quoteFade 5s ease-in-out infinite';
      }
    }, 5000);
  }

  bind() {
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('finish-btn').addEventListener('click', () => this.showEndScreen());
    document.getElementById('play-again-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  start() {
    this.round = 0;
    this.totalShown = 0;
    this.totalClicked = 0;
    this.stats = { clicksA: 0, clicksB: 0, shownA: 0, shownB: 0 };
    this.queue = shuffle(blogs);
    this.isActive = true;

    this.els.landing.classList.add('hidden');
    this.els.endScreen.classList.add('hidden');
    this.els.header.classList.remove('hidden');
    this.els.blogSite.classList.remove('hidden');

    this.nextRound();
  }

  nextRound() {
    if (!this.isActive) return;

    if (this.queue.length === 0) {
      this.queue = shuffle(blogs);
    }

    this.round++;
    this.currentBlog = this.queue.pop();
    this.currentVariant = Math.random() > 0.5 ? 'a' : 'b';

    this.els.roundCount.textContent = this.round;
    this.renderBlog();
    this.hideAd();
    
    // Secret timer
    const delay = this.AD_DELAY_MIN + Math.floor(Math.random() * (this.AD_DELAY_MAX - this.AD_DELAY_MIN));
    if (this.adTimer) clearTimeout(this.adTimer);
    this.adTimer = setTimeout(() => this.showAd(), delay);
  }

  renderBlog() {
    const b = this.currentBlog;
    const site = this.els.blogSite;
    site.classList.remove('active');

    setTimeout(() => {
      document.getElementById('blog-icon').textContent = b.siteIcon;
      document.getElementById('blog-icon').style.background = b.siteColor;
      document.getElementById('blog-site-name').textContent = b.siteName;
      document.getElementById('blog-niche').textContent = b.niche;
      document.getElementById('blog-read-time').textContent = b.readTime;
      document.getElementById('blog-title').textContent = b.title;
      document.getElementById('blog-subtitle').textContent = b.subtitle;
      
      const avatar = document.getElementById('author-avatar');
      avatar.textContent = b.author.initials;
      avatar.style.background = b.author.color;
      document.getElementById('author-name').textContent = b.author.name;
      document.getElementById('author-detail').textContent = `${new Date().toLocaleDateString('en-US', {month:'short', day:'numeric'})} · ${b.author.role}`;
      
      document.getElementById('blog-hero').src = b.hero;
      document.getElementById('blog-body').innerHTML = b.content;

      site.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }

  showAd() {
    if (!this.isActive) return;

    this.totalShown++;
    if (this.currentVariant === 'a') this.stats.shownA++;
    else this.stats.shownB++;

    const ad = this.currentBlog.ads[this.currentVariant];
    const v = this.currentVariant;
    const schemes = ['ad-scheme-coral', 'ad-scheme-emerald', 'ad-scheme-amber', 'ad-scheme-sky', 'ad-scheme-violet'];
    const scheme = schemes[Math.floor(Math.random() * schemes.length)];

    let html = '';
    if (v === 'a') {
      html = `
        <div class="ad-variant-a">
          <div class="ad-badge-free">🔥 FREE!!!</div>
          <div class="ad-icon">${ad.icon}</div>
          <div class="ad-body">
            <div class="ad-label">Ad · Sponsored</div>
            <div class="ad-headline">${ad.headline}</div>
            <div class="ad-subline">${ad.subline}</div>
          </div>
          <button class="ad-action" id="ad-click-btn">▶ ${ad.cta} !!!</button>
          <button class="ad-dismiss" id="ad-dismiss-btn">×</button>
        </div>
      `;
    } else {
      html = `
        <div class="ad-variant-b ${scheme}">
          <div class="ad-icon">${ad.icon}</div>
          <div class="ad-body">
            <div class="ad-label">Sponsored</div>
            <div class="ad-headline">${ad.headline}</div>
            <div class="ad-subline">${ad.subline}</div>
          </div>
          <button class="ad-action" id="ad-click-btn">${ad.cta}</button>
          <button class="ad-dismiss" id="ad-dismiss-btn">×</button>
        </div>
      `;
    }

    this.els.adBanner.innerHTML = html;
    this.els.adOverlay.classList.add('visible');

    document.getElementById('ad-click-btn').addEventListener('click', () => this.handleAd(true));
    document.getElementById('ad-dismiss-btn').addEventListener('click', () => this.handleAd(false));
  }

  hideAd() {
    this.els.adOverlay.classList.remove('visible');
  }

  handleAd(clicked) {
    if (clicked) {
      this.totalClicked++;
      if (this.currentVariant === 'a') this.stats.clicksA++;
      else this.stats.clicksB++;
    }

    this.hideAd();
    setTimeout(() => this.nextRound(), 800);
  }

  async showEndScreen() {
    this.isActive = false;
    if (this.adTimer) clearTimeout(this.adTimer);

    this.els.blogSite.classList.add('hidden');
    this.els.header.classList.add('hidden');
    this.els.endScreen.classList.remove('hidden');

    document.getElementById('end-rounds').textContent = this.round;
    document.getElementById('end-ads').textContent = this.totalShown;
    document.getElementById('end-clicked').textContent = this.totalClicked;

    // Persist to Firebase
    try {
      await addDoc(collection(db, "results"), {
        stats: this.stats,
        totalShown: this.totalShown,
        totalClicked: this.totalClicked,
        timestamp: serverTimestamp()
      });
      console.log('Stats saved to Firebase successfully.');
    } catch (e) {
      console.error('Error saving stats to Firebase:', e);
    }
  }

}

export default Game;
