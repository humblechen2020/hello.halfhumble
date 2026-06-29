/* =========================================================
   半熟漢堡工作室 — Interactions
   Page transitions, cursor, loader, reveal, marquee, magnetic, filter
   v2.1: + hero variable-font breathing, work-card parallax, organic cursor
   ========================================================= */

(() => {
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---- Page loader ---- */
  const loader = $('.loader');
  if (loader) {
    const dismiss = () => {
      setTimeout(() => loader.classList.add('is-done'), 80);
      setTimeout(() => loader.remove(), 800);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', dismiss, { once: true });
    } else {
      dismiss();
    }
  }

  /* ---- Page transition: Codrops Barba.js × cielrose.tv 風 sync 雙容器轉場 ----
     leave (1250ms):
       - body: scale 1 → 0.92, opacity 1 → 0.45
       - curtain: clip-path inset(100% 0 0 0) → inset(0)
     navigate
     enter (1250ms):
       - body: scale 1.06 → 1, opacity 0.45 → 1
       - curtain: clip-path inset(0) → inset(0 0 100% 0)（從上方收起）
  */
  const TRANS_DUR = 1250;
  // 自動包 .page-shell —— 把「會跟著縮放」的內容包起來，
  // 避免 body 直接 transform 時 position:fixed 的 cursor / header / curtain 一起被縮
  // 不可被包進去的元素：.cursor, .loader, .page-curtain, <script>
  const ensurePageShell = () => {
    let shell = $('.page-shell');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.className = 'page-shell';
    // 把 body 直系子節點裡「該包的」依序搬進去
    const excluded = new Set(['SCRIPT', 'NOSCRIPT']);
    // ⚠️ 任何 position: fixed 或需要鎖在 viewport 的元素都要排除
    //   — 進到 page-shell 後會因為 will-change: transform 變成新的 containing block，
    //     fixed 子孫改相對 page-shell 計算，等同跟著頁面捲走（header 失去黏性的根因）
    const excludeClasses = ['cursor', 'loader', 'page-curtain', 'page-tint', 'work-list-preview', 'image-trailer', 'image-gallery', 'site-header', 'site-utility'];
    const children = Array.from(document.body.childNodes);
    // 先 insert 一個 placeholder，記住要回填的位置
    const placeholder = document.createComment('page-shell-anchor');
    document.body.appendChild(placeholder);
    children.forEach(node => {
      if (node === placeholder) return;
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (excluded.has(node.tagName)) return;
        if (excludeClasses.some(cls => node.classList && node.classList.contains(cls))) return;
        shell.appendChild(node);
      } else if (node.nodeType === Node.TEXT_NODE) {
        // 移除前後空白文字節點即可，不必搬
        if (!node.nodeValue.trim()) return;
        shell.appendChild(node);
      }
    });
    document.body.insertBefore(shell, placeholder);
    placeholder.remove();
    return shell;
  };
  ensurePageShell();
  if (!prefersReduced) {
    // 簾幕結構：transparent 容器 + SVG（Q 曲線 path）+ 中心 mark
    //   viewBox 100×100、preserveAspectRatio="none" → 跟著視窗拉伸全屏
    //   漸層 Grapefruit Pink → Cool Horizon，呼應 Coral Horizon palette
    const CURTAIN_MARKUP = `
      <svg class="page-curtain-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="hh-curtain-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0.15" stop-color="#FF6B6B"/>
            <stop offset="0.85" stop-color="#58A6FF"/>
          </linearGradient>
        </defs>
        <path class="page-curtain-path" fill="url(#hh-curtain-grad)" d="M 0 100 V 100 Q 50 100 100 100 V 100 z"/>
      </svg>
      <img class="page-curtain-mark" src="${location.pathname.includes('/works/') ? '../直式商標.svg' : '直式商標.svg'}" alt="半熟漢堡 Half Humble">
    `;
    // 確保 .page-curtain 存在（沒包就動態 inject 在 body 最後、確保不在 .page-shell 內）
    let curtain = $('.page-curtain');
    if (!curtain) {
      curtain = document.createElement('div');
      curtain.className = 'page-curtain';
      curtain.setAttribute('aria-hidden', 'true');
      curtain.innerHTML = CURTAIN_MARKUP;
      document.body.appendChild(curtain);
    } else {
      // 若不小心被包進 .page-shell，挪回 body
      if (curtain.parentElement !== document.body) document.body.appendChild(curtain);
      // 沒有 SVG（舊版 baked-in 結構）就升級
      if (!curtain.querySelector('.page-curtain-svg')) {
        curtain.innerHTML = CURTAIN_MARKUP;
      }
    }

    // 進站清旗標即可——預設 .page-shell 就是 natural、不需要額外觸發
    sessionStorage.removeItem('hh_in_transit');

    let isTransitioning = false;

    const curtainPath = curtain.querySelector('.page-curtain-path');
    const HIDDEN_D = 'M 0 100 V 100 Q 50 100 100 100 V 100 z';

    const resetTransition = () => {
      isTransitioning = false;
      document.body.classList.remove('is-leaving');
      curtain.classList.remove('is-entering');
      if (curtainPath) {
        curtainPath.style.animation = 'none';
        curtainPath.setAttribute('d', HIDDEN_D);
        void curtain.offsetWidth; // force reflow
        curtainPath.style.animation = '';
      }
    };

    // 【關鍵】pagehide：頁面存入 bfcache 前先清掉簾幕，
    // 讓快照本身就是乾淨的，這樣返回時不需要再修復
    window.addEventListener('pagehide', (e) => {
      if (e.persisted) resetTransition();
    });

    // pageshow：作為備用保險（某些瀏覽器可能在 pagehide 後仍快照舊狀態）
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) resetTransition();
    });

    const isInternal = (href) => {
      if (!href) return false;
      if (href.startsWith('#')) return false;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      if (href.startsWith('http://') || href.startsWith('https://')) return false;
      if (href.startsWith('javascript:')) return false;
      return true;
    };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!isInternal(href)) return;
      if (isTransitioning) { e.preventDefault(); return; }
      e.preventDefault();
      isTransitioning = true;
      sessionStorage.setItem('hh_in_transit', '1');
      // 離站：body 縮 0.92 + opacity 0.45；curtain 從底部 clip 上來覆蓋全螢幕
      document.body.classList.add('is-leaving');
      curtain.classList.add('is-entering');
      // 等簾幕完全覆蓋（≈1250ms）再切頁，下一頁就能在 curtain 後面安靜載入
      setTimeout(() => { window.location.href = href; }, TRANS_DUR - 50);
      // 安全重置：萬一 navigation 失敗，2s 後自動解鎖，避免所有連結永久卡死
      setTimeout(resetTransition, TRANS_DUR + 800);
    });
  }

  /* ---- Hover-swap: nav 雙層文字翻轉 ---- */
  const wrapHoverSwap = (el) => {
    if (!el || el.dataset.hsWrapped === '1') return;
    const nodes = Array.from(el.childNodes);
    let didWrap = false;
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.replace(/\s+/g, ' ');
        const trimmed = text.trim();
        if (!trimmed) return;
        const wrap = document.createElement('span');
        wrap.className = 'hover-swap';
        const top = document.createElement('span');
        top.className = 'hs-top';
        top.textContent = trimmed;
        const bottom = document.createElement('span');
        bottom.className = 'hs-bottom';
        bottom.setAttribute('aria-hidden', 'true');
        bottom.textContent = trimmed;
        const leading = text.match(/^\s+/);
        const trailing = text.match(/\s+$/);
        const frag = document.createDocumentFragment();
        if (leading) frag.appendChild(document.createTextNode(leading[0]));
        wrap.appendChild(top);
        wrap.appendChild(bottom);
        frag.appendChild(wrap);
        if (trailing) frag.appendChild(document.createTextNode(trailing[0]));
        node.replaceWith(frag);
        didWrap = true;
      }
    });
    if (didWrap) el.dataset.hsWrapped = '1';
  };
  $$('.nav a').forEach(wrapHoverSwap);
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.nav a').forEach(a => {
    const h = (a.getAttribute('href') || '').toLowerCase();
    if (!h) return;
    if (h === here || (here === '' && h === 'index.html')) a.classList.add('is-active');
    if ((here === 'work.html' || here.startsWith('works')) && (h === 'work.html' || h === 'works.html')) a.classList.add('is-active');
  });

  /* ---- Custom cursor + organic blob ---- */
  const cursor = $('.cursor');
  if (cursor && !isTouch && !prefersReduced) {
    let cxPos = window.innerWidth / 2, cyPos = window.innerHeight / 2;
    let txPos = cxPos, tyPos = cyPos;
    document.addEventListener('mousemove', (e) => { txPos = e.clientX; tyPos = e.clientY; });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
    const tickCursor = () => {
      cxPos += (txPos - cxPos) * 0.22;
      cyPos += (tyPos - cyPos) * 0.22;
      cursor.style.transform = 'translate(' + cxPos + 'px, ' + cyPos + 'px) translate(-50%, -50%)';
      requestAnimationFrame(tickCursor);
    };
    tickCursor();
    const applyCursor = (el) => {
      const text = el.getAttribute('data-cursor-text');
      if (text) { cursor.classList.add('is-text'); cursor.setAttribute('data-text', text); }
      else { cursor.classList.add('is-large'); }
      // 不再加 is-organic blob 抖動 — yoodesign 風的乾淨大圓
    };
    const resetCursor = () => {
      cursor.classList.remove('is-large', 'is-text', 'is-organic');
      cursor.removeAttribute('data-text');
    };
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('a, button, .work-card, .process-step, [data-cursor], [data-magnet]');
      if (t) applyCursor(t);
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .work-card, .process-step, [data-cursor], [data-magnet]')) resetCursor();
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---- Hero Variable Font: 滑鼠位置驅動字重呼吸（500-900）---- */
  const heroDisplay = $('.display');
  if (heroDisplay && !prefersReduced && !isTouch) {
    let tHx = 0.55, tHy = 0.5;
    let cHx = 0.55, cHy = 0.5;
    let runningH = false;
    const tickHero = () => {
      cHx += (tHx - cHx) * 0.06;
      cHy += (tHy - cHy) * 0.06;
      const wght = 500 + cHx * 400 + (cHy - 0.5) * 60;
      const clamped = Math.max(400, Math.min(900, wght));
      heroDisplay.style.setProperty('--hero-wght', clamped.toFixed(0));
      if (Math.abs(tHx - cHx) > 0.001 || Math.abs(tHy - cHy) > 0.001) {
        requestAnimationFrame(tickHero);
      } else {
        runningH = false;
      }
    };
    document.addEventListener('mousemove', (e) => {
      tHx = e.clientX / window.innerWidth;
      tHy = e.clientY / window.innerHeight;
      if (!runningH) { runningH = true; requestAnimationFrame(tickHero); }
    });
  }

  /* ---- 分位數字 (0)(1)：data-split-num 與 work-card 編號自動轉成括號分位 ---- */
  const renderSplitNum = (el, raw) => {
    if (!el || el.dataset.splitRendered === '1') return;
    const str = String(raw).trim();
    const m = str.match(/^(\d+)(.*)$/);
    if (!m) return;
    const digits = m[1];
    const suffix = m[2]; // e.g. "+"
    const padded = digits.length === 1 ? '0' + digits : digits;
    el.textContent = '';
    el.classList.add('split-num');
    Array.from(padded).forEach(ch => {
      const d = document.createElement('span');
      d.className = 'digit';
      d.textContent = ch;
      el.appendChild(d);
    });
    if (suffix) {
      const s = document.createElement('span');
      s.className = 'digit-suffix';
      s.textContent = suffix;
      el.appendChild(s);
    }
    el.dataset.splitRendered = '1';
  };
  // 1) 明確標 data-split-num 的元素（hero stat 等）
  $$('[data-split-num]').forEach(el => renderSplitNum(el, el.getAttribute('data-split-num')));
  // 2) work-card 的 .meta-row .num「Case 01」抽出數字後轉，前面保留「Case 」
  $$('.work-card .meta-row .num').forEach(el => {
    const m = el.textContent.match(/^(.*?)(\d+)\s*$/);
    if (!m) return;
    const prefix = m[1];
    const num = m[2];
    el.textContent = prefix;
    const splitWrap = document.createElement('span');
    splitWrap.className = 'split-num';
    const padded = num.length === 1 ? '0' + num : num;
    Array.from(padded).forEach(ch => {
      const d = document.createElement('span');
      d.className = 'digit';
      d.textContent = ch;
      splitWrap.appendChild(d);
    });
    el.appendChild(splitWrap);
  });

  /* ---- 抽屜 card: 隨機 tilt + spine label + 自動 inject .media-overlay ---- */
  // 給每張 work-card 設不同的微 tilt（種子=index，固定不抖）
  // 並把 .meta-row .num（Case 01 等）抽出做成書背 spine label
  // 同時補齊 work.html All Work 段卡片缺少的 .media-overlay，讓 frosted glass 一致
  const tilts = [-0.8, 0.6, -0.4, 0.8, -0.6, 0.4];
  $$('.work-card').forEach((card, i) => {
    if (!prefersReduced && !card.classList.contains('is-feature')) {
      card.style.setProperty('--tilt', tilts[i % tilts.length] + 'deg');
    }
    const metaRow = card.querySelector('.meta-row');
    const numEl = metaRow ? metaRow.querySelector('.num') : null;
    const media = card.querySelector('.media');
    if (numEl && media && !media.querySelector('.work-card-spine')) {
      const spine = document.createElement('div');
      spine.className = 'work-card-spine';
      spine.setAttribute('aria-hidden', 'true');
      spine.textContent = numEl.textContent.trim();
      media.appendChild(spine);
    }
    // 沒有 .media-overlay 的卡片自動 inject 一個（讓 work.html All Work 也享受到 frosted glass）
    if (media && !media.querySelector('.media-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'media-overlay';
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'View case';
      overlay.appendChild(badge);
      const metaSpans = metaRow ? Array.from(metaRow.querySelectorAll('span')) : [];
      if (metaSpans.length) {
        const yearSpan = document.createElement('span');
        yearSpan.textContent = metaSpans[metaSpans.length - 1].textContent.trim();
        overlay.appendChild(yearSpan);
      }
      media.appendChild(overlay);
    }
    // Status pill — 只在 coming-soon / archived 時顯示，Live 不貼任何標籤
    const status = card.getAttribute('data-status');
    if (media && !media.querySelector('.work-card-pill') && (status === 'coming-soon' || status === 'archived')) {
      const pill = document.createElement('span');
      pill.className = 'work-card-pill';
      pill.setAttribute('aria-hidden', 'true');
      const labelMap = { 'coming-soon': 'Coming Soon', 'archived': 'Archived' };
      pill.textContent = labelMap[status];
      media.appendChild(pill);
    }
  });

  /* ---- Featured Work Parallax ---- */
  if (!prefersReduced) {
    const placeholders = $$('.work-card .media .placeholder');
    const parallaxItems = placeholders.map(p => {
      if (p.parentElement && p.parentElement.classList.contains('media-parallax')) {
        return p.parentElement;
      }
      const wrap = document.createElement('div');
      wrap.className = 'media-parallax';
      p.parentNode.insertBefore(wrap, p);
      wrap.appendChild(p);
      return wrap;
    });
    if (parallaxItems.length) {
      let pRaf = 0;
      const updateParallax = () => {
        pRaf = 0;
        const vh = window.innerHeight;
        for (const w of parallaxItems) {
          const r = w.getBoundingClientRect();
          const center = (r.top + r.bottom) / 2;
          const dy = (center - vh / 2);
          const offset = Math.max(-22, Math.min(22, dy * -0.06));
          w.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px, 0)';
        }
      };
      window.addEventListener('scroll', () => { if (!pRaf) pRaf = requestAnimationFrame(updateParallax); }, { passive: true });
      window.addEventListener('resize', () => { if (!pRaf) pRaf = requestAnimationFrame(updateParallax); }, { passive: true });
      updateParallax();
    }
  }

  /* ---- Header scroll state（含動態隱藏 Scroll-to-Hide）----
     往下捲超過一個緩衝區（避免微小晃動誤觸發）就收起 header，
     往上捲（任何幅度）或回到頂部附近就立刻顯示，
     行動選單開啟時鎖定顯示，避免 drawer 開著但 header 自己藏起來 */
  const header = $('#header');
  if (header) {
    let ticking = false;
    let lastY = window.scrollY;
    const HIDE_AFTER = 120;   // 超過這個高度才開始判斷隱藏，避免一開頁就誤觸發
    const TOLERANCE = 6;      // 忽略小幅度晃動（例如 momentum scroll 抖動）
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (y > 40) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');

      if (document.body.classList.contains('is-menu-open')) {
        header.classList.remove('is-hidden');
      } else if (y <= HIDE_AFTER) {
        header.classList.remove('is-hidden');
      } else if (delta > TOLERANCE) {
        header.classList.add('is-hidden');
      } else if (delta < -TOLERANCE) {
        header.classList.remove('is-hidden');
      }

      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();
  }

  /* ---- Mobile menu（≤760px 才會看到）----
     不修改 HTML，把 hamburger 跟 drawer 由 JS 注入。
     drawer 內的連結用 .nav 的 href 跟原始 label（已對 hover-swap 包過的 .hs-top 做兼容） */
  if (header) {
    const navEl = $('.nav', header);
    if (navEl) {
      const getLabel = (a) => {
        const top = a.querySelector('.hover-swap .hs-top');
        return (top ? top.textContent : a.textContent).trim();
      };
      const links = $$('a', navEl).map((a, i) => ({
        href: a.getAttribute('href') || '#',
        label: getLabel(a),
        active: a.classList.contains('is-active'),
        num: String(i + 1).padStart(2, '0')
      }));

      // Hamburger 按鈕（直接掛在 body，避免被 header 的 stacking context 蓋住）
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'menu-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'mobile-menu');
      toggle.setAttribute('aria-label', '打開選單');
      toggle.innerHTML = '<span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>';
      document.body.appendChild(toggle);

      // Drawer
      const drawer = document.createElement('div');
      drawer.id = 'mobile-menu';
      drawer.className = 'mobile-menu';
      drawer.setAttribute('aria-hidden', 'true');

      const linksHtml = links.map(l => `
        <a href="${l.href}"${l.active ? ' class="is-active"' : ''}>
          <span class="menu-num">${l.num} ${l.active ? '· current' : '— page'}</span>${l.label}
        </a>`).join('');

      drawer.innerHTML = `
        <div class="mobile-menu-inner">
          <nav class="mobile-menu-nav" aria-label="主導航（行動版）">
            ${linksHtml}
          </nav>
          <div class="mobile-menu-foot">
            <div class="row"><span>For enquiries</span><a href="mailto:hello.halfhumble@gmail.com">hello.halfhumble@gmail.com</a></div>
            <div class="row"><span>Taichung · UTC+8</span><a href="contact.html">Start a project →</a></div>
          </div>
        </div>`;
      document.body.appendChild(drawer);

      const open = () => {
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', '關閉選單');
        document.body.classList.add('is-menu-open');
      };
      const close = () => {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '打開選單');
        document.body.classList.remove('is-menu-open');
      };

      toggle.addEventListener('click', () => {
        if (toggle.getAttribute('aria-expanded') === 'true') close();
        else open();
      });

      // 點選連結 → 先把 drawer 收起（讓既有 page-curtain 接手轉場）
      drawer.addEventListener('click', (e) => {
        if (e.target.closest('a')) close();
      });

      // ESC 關閉
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close();
      });

      // 視窗放大回桌機 → 自動關閉，避免狀態殘留
      const mq = window.matchMedia('(min-width: 761px)');
      const onMqChange = (e) => { if (e.matches) close(); };
      if (mq.addEventListener) mq.addEventListener('change', onMqChange);
      else if (mq.addListener) mq.addListener(onMqChange);
    }
  }

  /* ---- Hero line-up ---- */
  const heroLines = $$('[data-line]');
  if (heroLines.length) {
    if (prefersReduced) {
      heroLines.forEach(el => el.classList.add('is-visible'));
    } else {
      heroLines.forEach((el, i) => {
        el.style.transform = 'translateY(110%)';
        el.style.transition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ' + (260 + i * 180) + 'ms';
        requestAnimationFrame(() => { el.style.transform = 'translateY(0%)'; });
      });
    }
  }

  /* ---- Service row 01/02/03 三欄 detail 自動 inject ---- */
  // 對每個 .service-row 加上 .service-detail 區塊：01 Service / 02 Time / 03 From
  // 預設值用 service title 查表，HTML 可用 data-time, data-from 覆寫
  const serviceDefaults = {
    'Brand Identity': { tags: ['Logo / Wordmark', 'Color / Typography', 'Brand Guideline'], time: '4–6 週交付', from: 'NT$ 80,000+' },
    'Visual System':   { tags: ['Key Visual', 'Event Identity', 'Editorial'],              time: '3–5 週交付', from: 'NT$ 60,000+' },
    'Wayfinding & Space': { tags: ['Signage System', 'Wayfinding', 'Spatial'],             time: '6–10 週交付', from: 'NT$ 120,000+' },
    'Packaging':       { tags: ['Structure', 'Print Spec', 'Production'],                  time: '4–8 週交付', from: 'NT$ 90,000+' }
  };
  $$('.service-row').forEach(row => {
    if (row.querySelector('.service-detail')) return; // 已注入
    const h3 = row.querySelector('h3');
    if (!h3) return;
    const title = h3.textContent.trim();
    const meta = serviceDefaults[title] || { tags: [], time: '依案件評估', from: '請洽詢' };

    // 上方插入滿版 hero strip（Huehaus 風圖大於字）
    if (!row.querySelector('.service-strip')) {
      const strip = document.createElement('div');
      strip.className = 'service-strip';
      strip.setAttribute('aria-hidden', 'true');
      const stripLabel = document.createElement('span');
      stripLabel.className = 'service-strip-label';
      stripLabel.textContent = title + ' · placeholder';
      strip.appendChild(stripLabel);
      row.insertBefore(strip, row.firstChild);
    }
    // 既有 tags 區（如果有）的內容拿出來當 01 Service 的列表
    const existingTagSpans = Array.from(row.querySelectorAll('.body .tags span')).map(s => s.textContent.trim());
    const serviceTags = existingTagSpans.length ? existingTagSpans : meta.tags;
    const timeText = row.getAttribute('data-time') || meta.time;
    const fromText = row.getAttribute('data-from') || meta.from;

    const detail = document.createElement('div');
    detail.className = 'service-detail';
    detail.innerHTML = ''
      + '<div class="cell">'
      +   '<span class="cell-num">01</span>'
      +   '<span class="cell-label">Service</span>'
      +   '<span class="cell-value"><ul>' + serviceTags.map(t => '<li>' + t + '</li>').join('') + '</ul></span>'
      + '</div>'
      + '<div class="cell">'
      +   '<span class="cell-num">02</span>'
      +   '<span class="cell-label">Time</span>'
      +   '<span class="cell-value">' + timeText + '</span>'
      + '</div>'
      + '<div class="cell">'
      +   '<span class="cell-num">03</span>'
      +   '<span class="cell-label">From</span>'
      +   '<span class="cell-value">' + fromText + '</span>'
      + '</div>';
    row.appendChild(detail);
  });

  /* ---- Word-by-word reveal: section-bar h2 / enquiry h2（Huehaus 風）---- */
  // 把 h2 的子節點拆成 .word > .word-inner 結構，IntersectionObserver 加 .is-visible 後逐字滑入。
  // 支援 <em> / <br> / 中英混排（中文每個字一個 word，英文整個單字一個 word）。
  const wrapWordsForReveal = (h) => {
    if (!h || h.dataset.wordsWrapped === '1') return;
    let idx = 0;
    const wrapTextNode = (textNode) => {
      const frag = document.createDocumentFragment();
      const text = textNode.nodeValue;
      // 切：英文用空白切、中文每個字符獨立、保留標點與空白
      const tokens = text.match(/[　-鿿ー]|[A-Za-z0-9]+(?:[''-][A-Za-z0-9]+)*|\S|\s+/g) || [];
      tokens.forEach(tok => {
        if (/^\s+$/.test(tok)) {
          frag.appendChild(document.createTextNode(tok));
          return;
        }
        const word = document.createElement('span');
        word.className = 'word';
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        inner.style.setProperty('--i', idx++);
        inner.textContent = tok;
        word.appendChild(inner);
        frag.appendChild(word);
      });
      return frag;
    };
    const processNode = (node) => {
      const children = Array.from(node.childNodes);
      children.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = wrapTextNode(child);
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') return;
          // 對 <em> 等內嵌標籤，遞迴處理裡面的 text，但把它整個視為跨多個 word 仍可用 inline 結構
          processNode(child);
        }
      });
    };
    processNode(h);
    h.classList.add('word-reveal-host');
    h.dataset.wordsWrapped = '1';
  };
  // service.html 用 anime.js scrambleText 接手所有標題，所以不走 word-reveal
  const _path = (location.pathname || '').toLowerCase();
  const _isService = _path.endsWith('service.html') || _path.endsWith('/service') || _path.endsWith('/service/');
  if (!prefersReduced && !_isService) {
    $$('.section-bar h2, .enquiry h2').forEach(wrapWordsForReveal);
  }

  /* ---- Reveal observer ---- */
  const revealEls = $$('.reveal, .fade-up, .work-card, .word-reveal-host');
  if (revealEls.length) {
    if (prefersReduced) {
      revealEls.forEach(el => el.classList.add('is-visible'));
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(el => io.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('is-visible'));
    }
  }

  /* ---- Section ticker scroll velocity ---- */
  if (!prefersReduced) {
    const tracks = $$('.section-ticker .track');
    if (tracks.length) {
      const baseDur = 40;
      let lastY = window.scrollY, lastT = performance.now();
      let boost = 0, target = 0;
      let raf = 0;
      const update = () => {
        boost += (target - boost) * 0.08;
        target *= 0.92;
        const dur = baseDur * (1 - Math.min(boost, 1) * 0.55);
        tracks.forEach(t => {
          t.style.setProperty('--ticker-duration', dur.toFixed(2) + 's');
          t.style.animationDuration = dur.toFixed(2) + 's';
        });
        if (Math.abs(boost) > 0.002 || Math.abs(target) > 0.002) raf = requestAnimationFrame(update);
        else { raf = 0; boost = 0; target = 0; }
      };
      window.addEventListener('scroll', () => {
        const now = performance.now();
        const dy = window.scrollY - lastY;
        const dt = Math.max(now - lastT, 1);
        const v = Math.min(Math.abs(dy) / dt / 2, 1.4);
        target = Math.max(target, v);
        lastY = window.scrollY; lastT = now;
        if (!raf) raf = requestAnimationFrame(update);
      }, { passive: true });
    }
  }

  /* ---- Work filter ---- */
  const chips = $$('.chip');
  const cards = $$('.work-card[data-tags]');
  const countEl = $('#count');
  const totalCases = cards.length;
  if (chips.length && cards.length) {
    const apply = (filter) => {
      let visibleCount = 0;
      cards.forEach(card => {
        const tags = (card.getAttribute('data-tags') || '').toLowerCase().split(/\s*,\s*/);
        const show = filter === 'all' || tags.includes(filter);
        card.classList.toggle('is-hidden', !show);
        if (show) visibleCount++;
      });
      if (countEl) countEl.textContent = visibleCount + ' / ' + totalCases + ' works';
    };
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        apply(chip.getAttribute('data-filter'));
      });
    });
  }

  /* ---- Featured/All mode toggle ---- */
  const modeBtns = $$('.mode-btn');
  if (modeBtns.length) {
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const mode = btn.getAttribute('data-mode');
        cards.forEach(card => {
          const isFeat = card.classList.contains('is-feature') || card.hasAttribute('data-featured');
          if (mode === 'featured') card.classList.toggle('is-hidden', !isFeat);
          else card.classList.remove('is-hidden');
        });
        if (countEl) {
          const visible = cards.filter(c => !c.classList.contains('is-hidden')).length;
          countEl.textContent = visible + ' / ' + totalCases + ' works';
        }
        chips.forEach(c => c.classList.remove('is-active'));
        const allChip = chips.find(c => c.getAttribute('data-filter') === 'all');
        if (allChip) allChip.classList.add('is-active');
      });
    });

    // 頁面載入時執行一次初始模式（讓 Featured 按鈕的初始狀態真正生效）
    const initBtn = modeBtns.find(b => b.classList.contains('is-active'));
    if (initBtn) initBtn.click();
  }

  /* ---- Scroll-driven page tint (monopo 風 ambient bg shift) ---- */
  // 在 body 最前面插入一個 fixed 全屏 .page-tint 元素，IntersectionObserver 觀察 sections
  // 每個 section 進入 viewport 時切換 .page-tint 的背景色，1.1s 慢速 transition
  if (!prefersReduced) {
    let tint = $('.page-tint');
    if (!tint) {
      tint = document.createElement('div');
      tint.className = 'page-tint';
      tint.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(tint, document.body.firstChild);
    }
    // CORAL HORIZON: 白底為主，Papaya Whip 為 accent 區段，dark sections 維持深色
    const tintMap = [
      { sel: '.hero',              color: '#FFFFFF' },
      { sel: '.section.featured',  color: '#FFFFFF' },
      { sel: '.section.services',  color: '#FFEDD5' },
      { sel: '.section.process',   color: '#FFFAF1' },
      { sel: '.section.clients',   color: '#FFF6E5' },
      { sel: '.enquiry',           color: '#111111' },
      { sel: '.site-footer',       color: '#111111' },
      { sel: '.page-head',         color: '#FFFFFF' },
      { sel: '.service-hero',      color: '#FFFFFF' },
      { sel: '.about-hero',        color: '#FFFFFF' },
      { sel: '.contact-hero',      color: '#FFFFFF' },
      { sel: '.case-hero',         color: '#FFFFFF' }
    ];
    const observed = [];
    tintMap.forEach(({sel, color}) => {
      const el = $(sel);
      if (el) {
        el.dataset.tintColor = color;
        observed.push(el);
      }
    });
    if (observed.length && 'IntersectionObserver' in window) {
      let current = null;
      // 用 Map 記錄每個 section 目前的 intersectionRatio，上滑離開時才能正確還原
      const ratioMap = new Map();
      observed.forEach(el => ratioMap.set(el, 0));
      const tintIO = new IntersectionObserver((entries) => {
        // 更新每個 entry 的比例（離開時設為 0）
        entries.forEach(e => {
          ratioMap.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        });
        // 從所有 observed 中找目前比例最高的
        let bestEl = null, bestRatio = 0;
        ratioMap.forEach((ratio, el) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestEl = el; }
        });
        // 若沒有任何 section 可見（兩段之間的空白區域），預設回白底
        const c = bestEl ? bestEl.dataset.tintColor : '#FFFFFF';
        if (c && c !== current) {
          tint.style.backgroundColor = c;
          current = c;
        }
      }, { threshold: [0, 0.3, 0.5, 0.7] });
      observed.forEach(el => tintIO.observe(el));
    }
  }

  /* ---- Case prev/next navigation ---- */
  // 正確順序（對應 work.html 列表順序）
  const CASE_ORDER = [
    { file: 'gougoushan.html',          title: 'Gougoushan 黑皮狗狗山｜流浪犬的友善表情' },
    { file: 'tcappa.html',              title: 'TCAPPA 兒虐防治｜不讓人迴避的議題' },
    { file: 'tayal-meimei.html',        title: '泰雅妹妹｜舞團形象視覺設計' },
    { file: 'brookesia-offical.html',   title: 'Brookesia｜美妝品牌視覺規劃與拍攝' },
    { file: 'liang-chuan.html',         title: '良全預拌混凝土｜品牌識別優化設計' },
    { file: 'poet-of-sun.html',         title: '編太陽的詩人｜把詩編進一場時尚秀' },
    { file: 'jia-pin.html',             title: '嘉品畜牧｜品牌重塑設計' },
    { file: 'xu-yu-xuan.html',          title: '許育璿｜地方競選品牌形象識別設計' },
    { file: 'han-shui-mao.html',        title: '酣睡貓｜寢具品牌識別設計' },
    { file: 'tspem.html',               title: 'TSPEM｜國際研討會主視覺設計' },
    { file: 'entrepreneur-road.html',   title: '文化部文化資產局｜創業路主視覺設計' },
    { file: 'design-scene-3.html',      title: '設計現場 3.0｜線上設計展主視覺與企劃設計' },
    { file: 'friendly-city.html',       title: '友善興邦 幸福安康｜公共議題牆面視覺設計' },
    { file: 'poster-365.html',          title: '365 海報設計｜每天一張的視覺紀律' },
    { file: 'visual-art-series.html',   title: '根光 Root Light｜視覺藝術影像' },
    { file: 'typography-experiment.html', title: '字體設計實驗｜筆畫之間的留白' },
    { file: 'tcappa-concrete.html',     title: '台中市預拌混凝土商業同業公會｜公會型組織的識別' },
    { file: 'zhumu-zaoshan.html',        title: '築夢造山募資計畫｜狗狗山動物友善協會' },
    { file: 'national-games-2021.html', title: '110年全國運動會在新北' },
    { file: 'chiayi-design-expo-2021.html', title: '2021 台灣設計展在嘉義（嘉義百趴）' },
    { file: 'reef-heart-moment.html',   title: '宜居實習生｜礁心時刻' },
    { file: 'gongping-christmas.html',  title: '公平里｜就很公平聖誕節' },
    { file: 'liang-chuan-tea-gift.html', title: '良全預拌混凝土｜年度禮盒包裝設計' },
    { file: 'heritage-puppet-camp.html', title: '文化部文化資產局｜皮影戲＋布袋戲夏令營主視覺設計' },
    { file: 'gangno.html',              title: 'Gangno｜復古服飾品牌視覺設計' },
    { file: 'illustration-design.html', title: '插畫設計' },
    { file: 'photography.html',         title: '攝影作品集' },
  ];
  (function initCaseNav() {
    const currentFile = location.pathname.split('/').pop();
    const idx = CASE_ORDER.findIndex(c => c.file === currentFile);
    if (idx === -1) return; // 不在 case 頁就跳過
    const total = CASE_ORDER.length;
    const prev = CASE_ORDER[(idx - 1 + total) % total];
    const next = CASE_ORDER[(idx + 1) % total];
    const nextCaseEl = $('.next-case');
    if (!nextCaseEl) return;
    // 替換成含 prev + next 的雙欄導覽
    nextCaseEl.innerHTML = `
      <div class="case-nav-label">
        <span>${idx + 1} / ${total}</span>
        <a href="../work.html" class="case-nav-all">All works ↗</a>
      </div>
      <div class="case-nav-row">
        <a class="case-nav-btn is-prev" href="${prev.file}">
          <span class="case-nav-dir">← Prev</span>
          <span class="case-nav-title">${prev.title}</span>
        </a>
        <a class="case-nav-btn is-next" href="${next.file}">
          <span class="case-nav-dir">Next →</span>
          <span class="case-nav-title">${next.title}</span>
        </a>
      </div>`;
  })();

  /* ---- 手機版：左右滑動切換案例（works/ 頁面才啟動）---- */
  if (isTouch && location.pathname.includes('/works/')) {
    let tx0 = 0, ty0 = 0;
    document.addEventListener('touchstart', (e) => {
      tx0 = e.changedTouches[0].clientX;
      ty0 = e.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx0;
      const dy = e.changedTouches[0].clientY - ty0;
      // 水平滑動 > 60px，且水平位移明顯大於垂直（排除一般滾動）
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const currentFile = location.pathname.split('/').pop();
      const idx = CASE_ORDER.findIndex(c => c.file === currentFile);
      if (idx === -1) return;
      const total = CASE_ORDER.length;
      const target = dx < 0
        ? CASE_ORDER[(idx + 1) % total].file          // 左滑 → 下一個
        : CASE_ORDER[(idx - 1 + total) % total].file; // 右滑 → 上一個
      // 模擬點擊，觸發既有的 page-transition click handler
      const a = document.createElement('a');
      a.href = target;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, { passive: true });
  }

  /* ---- 案例頁中／英切換（lang-toggle）：預設中文，按鈕記住偏好 ---- */
  (function initLangToggle() {
    const KEY = 'hh-lang';
    const btn = $('[data-lang-toggle]');
    if (!btn) return;
    const apply = (lang) => document.body.classList.toggle('lang-en', lang === 'en');
    if (localStorage.getItem(KEY) === 'en') apply('en');
    btn.addEventListener('click', () => {
      const next = document.body.classList.contains('lang-en') ? 'zh' : 'en';
      apply(next);
      localStorage.setItem(KEY, next);
    });
  })();

  /* ---- work.html list mode + floating preview（francescomichelini 風）---- */
  const path = location.pathname.toLowerCase();
  const isWorkListPage = path.endsWith('work.html') || path.endsWith('/work') || path.endsWith('/work/');
  const workGridEl = $('.work-grid');
  if (isWorkListPage && workGridEl && !isTouch && !prefersReduced) {
    // Inject Grid / List toggle buttons into toolbar
    const toolbar = $('.toolbar');
    if (toolbar) {
      const modesWrap = document.createElement('div');
      modesWrap.className = 'modes';
      modesWrap.innerHTML =
        '<button class="mode-btn is-active" data-mode="grid" aria-label="Grid view">Grid</button>' +
        '<button class="mode-btn" data-mode="list" aria-label="List view">List</button>';
      toolbar.appendChild(modesWrap);

      modesWrap.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          modesWrap.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          const mode = btn.getAttribute('data-mode');
          workGridEl.classList.toggle('is-list-mode', mode === 'list');
          if (mode !== 'list') preview.classList.remove('is-visible');
        });
      });
    }

    // Floating preview for list mode
    const preview = document.createElement('div');
    preview.className = 'work-list-preview';
    const previewImg = document.createElement('img');
    previewImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
    preview.appendChild(previewImg);
    document.body.appendChild(preview);

    document.addEventListener('mousemove', (e) => {
      if (!preview.classList.contains('is-visible')) return;
      const pw = preview.offsetWidth;
      const ph = preview.offsetHeight;
      const x = Math.min(e.clientX + 28, window.innerWidth - pw - 16);
      const y = Math.max(16, Math.min(e.clientY - ph / 2, window.innerHeight - ph - 16));
      preview.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    });

    $$('.work-card', workGridEl).forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (!workGridEl.classList.contains('is-list-mode')) return;
        const img = card.querySelector('.media img');
        if (img) { previewImg.src = img.src; preview.classList.add('is-visible'); }
      });
      card.addEventListener('mouseleave', () => {
        preview.classList.remove('is-visible');
      });
    });
  }

})();
