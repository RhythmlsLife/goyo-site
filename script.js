/* ==========================================================================
   GOYO 공식 프로젝트 웹사이트 — 인터랙션 스크립트
   기능: 다크모드 · 모바일 메뉴 · 영상 챕터 점프 · 스크롤 추적 · 아카이브 탭 · 타임라인 필터 · 사진 확대
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ------------------------------------------------------------------------
     1. 다크모드 전환 (OS 설정 자동 연동 + 수동 전환 저장)
     ------------------------------------------------------------------------ */
  var themeBtn = document.getElementById('themeBtn');
  var iconSun = document.getElementById('iconSun');
  var iconMoon = document.getElementById('iconMoon');
  var themeLabel = document.getElementById('themeLabel');
  var mediaDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function isDarkActive() {
    var saved = root.getAttribute('data-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return mediaDark ? mediaDark.matches : false;
  }

  function renderThemeBtn() {
    if (!themeBtn) return;
    var dark = isDarkActive();
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
    if (iconSun) iconSun.style.display = dark ? 'block' : 'none';
    if (iconMoon) iconMoon.style.display = dark ? 'none' : 'block';
    if (themeLabel) themeLabel.textContent = dark ? '라이트' : '다크';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = isDarkActive() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('goyo-theme', next); } catch (e) {}
      renderThemeBtn();
    });
  }

  if (mediaDark && mediaDark.addEventListener) {
    mediaDark.addEventListener('change', function () {
      var saved = null;
      try { saved = localStorage.getItem('goyo-theme'); } catch (e) {}
      if (!saved) {
        root.removeAttribute('data-theme');
        renderThemeBtn();
      }
    });
  }
  renderThemeBtn();

  /* ------------------------------------------------------------------------
     2. 모바일 메뉴 드로어
     ------------------------------------------------------------------------ */
  var menuBtn = document.getElementById('menuBtn');
  var mobileDrawer = document.getElementById('mobileDrawer');
  var navEl = document.querySelector('.nav');

  function setDrawerOpen(open) {
    if (!menuBtn || !mobileDrawer) return;
    mobileDrawer.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }

  if (menuBtn && mobileDrawer) {
    menuBtn.addEventListener('click', function () {
      setDrawerOpen(!mobileDrawer.classList.contains('open'));
    });

    mobileDrawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawerOpen(false);
      });
    });

    document.addEventListener('click', function (e) {
      if (mobileDrawer.classList.contains('open') && navEl && !navEl.contains(e.target)) {
        setDrawerOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        setDrawerOpen(false);
        menuBtn.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     3. 60초 시연 영상 챕터 점프 컨트롤
     ------------------------------------------------------------------------ */
  var demoVideo = document.getElementById('demoVideo');
  var chapterBtns = Array.prototype.slice.call(document.querySelectorAll('.chapter-btn[data-seek]'));

  function updateActiveChapter(timeSec) {
    var activeBtn = chapterBtns[0] || null;
    for (var i = 0; i < chapterBtns.length; i++) {
      var t = parseFloat(chapterBtns[i].getAttribute('data-seek')) || 0;
      if (timeSec >= t - 0.25) {
        activeBtn = chapterBtns[i];
      }
    }
    chapterBtns.forEach(function (b) {
      b.classList.toggle('active', b === activeBtn);
    });
  }

  if (demoVideo && chapterBtns.length) {
    chapterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sec = parseFloat(btn.getAttribute('data-seek')) || 0;
        var seekAndPlay = function () {
          try { demoVideo.currentTime = sec; } catch (e) {}
          var p = demoVideo.play();
          if (p && p.catch) p.catch(function () {});
          updateActiveChapter(sec);
        };
        if (demoVideo.readyState >= 1) {
          seekAndPlay();
        } else {
          demoVideo.addEventListener('loadedmetadata', seekAndPlay, { once: true });
          demoVideo.load();
        }
      });
    });

    demoVideo.addEventListener('timeupdate', function () {
      updateActiveChapter(demoVideo.currentTime);
    });
  }

  /* ------------------------------------------------------------------------
     4. 스크롤 위치 추적 (ScrollSpy) + 상단 읽기 진행률 바
     ------------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"], #mobileDrawer a[href^="#"]')
  );
  var progressBar = document.getElementById('readProgress');

  var sectionIds = [];
  navLinks.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    if (id && sectionIds.indexOf(id) === -1) sectionIds.push(id);
  });

  var sections = sectionIds
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function setActiveNav(activeId) {
    navLinks.forEach(function (a) {
      var isMatch = a.getAttribute('href') === '#' + activeId;
      a.classList.toggle('on', isMatch);
      if (isMatch) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  var ticking = false;
  function onScrollUpdate() {
    ticking = false;
    var scrollY = window.scrollY || window.pageYOffset;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar && docHeight > 0) {
      var pct = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
      progressBar.style.width = pct.toFixed(2) + '%';
    }

    if (!sections.length) return;

    if (docHeight > 0 && scrollY >= docHeight - 28) {
      setActiveNav(sections[sections.length - 1].id);
      return;
    }

    var offset = (navEl ? navEl.offsetHeight : 62) + 56;
    var currentId = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= offset) {
        currentId = sections[i].id;
      } else {
        break;
      }
    }
    setActiveNav(currentId);
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScrollUpdate);
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', onScrollUpdate, { passive: true });
  onScrollUpdate();

  /* ------------------------------------------------------------------------
     5. 개발 아카이브 탭 전환 (1~10차 기록 | 구상과 결정 | 부품 조달)
     ------------------------------------------------------------------------ */
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn[data-tab]'));
  var tabPanels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel[data-tab]'));

  function activateArchiveTab(tabName) {
    if (!tabName) return;
    tabBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === tabName;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    tabPanels.forEach(function (panel) {
      var on = panel.getAttribute('data-tab') === tabName;
      panel.hidden = !on;
    });
    onScrollUpdate();
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activateArchiveTab(btn.getAttribute('data-tab'));
    });
  });

  // 본문 내 크로스 링크(예: "설계 결정") 클릭 시 해당 탭 자동 열기
  document.querySelectorAll('[data-open-tab]').forEach(function (link) {
    link.addEventListener('click', function () {
      activateArchiveTab(link.getAttribute('data-open-tab'));
    });
  });

  /* ------------------------------------------------------------------------
     6. 1~10차 개발 타임라인 단계 필터
     ------------------------------------------------------------------------ */
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filter-btn[data-phase]'));
  var phaseGroups = Array.prototype.slice.call(document.querySelectorAll('.phase-group[data-phase]'));

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-phase');
      filterBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      phaseGroups.forEach(function (group) {
        var visible = target === 'all' || group.getAttribute('data-phase') === target;
        group.classList.toggle('is-hidden', !visible);
      });
      onScrollUpdate();
    });
  });

  /* ------------------------------------------------------------------------
     7. 사진 확대 모달 (Lightbox — 이전/다음 넘기기 지원)
     ------------------------------------------------------------------------ */
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbi');
  var lbCap = document.getElementById('lbc');
  var lbCount = document.getElementById('lbCount');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var lbClose = document.getElementById('lbx');

  var zoomButtons = Array.prototype.slice.call(document.querySelectorAll('button[data-cap]'));
  var activeList = zoomButtons;
  var currentIndex = -1;

  function showLightboxAt(index) {
    if (!lb || !activeList.length) return;
    currentIndex = (index + activeList.length) % activeList.length;
    var btn = activeList[currentIndex];
    var img = btn.querySelector('img');
    if (!img) return;
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.getAttribute('alt') || '';
    lbCap.textContent = btn.getAttribute('data-cap') || '';
    if (lbCount) {
      lbCount.textContent = (currentIndex + 1) + ' / ' + activeList.length;
    }
  }

  zoomButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // 현재 화면에 표시 중인 사진들만 순환 목록으로 구성
      activeList = zoomButtons.filter(function (b) {
        return b.offsetParent !== null;
      });
      if (!activeList.length) activeList = zoomButtons;
      var idx = activeList.indexOf(btn);
      showLightboxAt(idx >= 0 ? idx : 0);
      if (lb && lb.showModal) {
        if (!lb.open) lb.showModal();
      } else if (lb) {
        lb.setAttribute('open', '');
      }
    });
  });

  function closeLightbox() {
    if (!lb) return;
    if (lb.close) lb.close();
    else lb.removeAttribute('open');
  }

  if (lbPrev) lbPrev.addEventListener('click', function () { showLightboxAt(currentIndex - 1); });
  if (lbNext) lbNext.addEventListener('click', function () { showLightboxAt(currentIndex + 1); });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);

  if (lb) {
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox();
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showLightboxAt(currentIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); showLightboxAt(currentIndex + 1); }
    });
  }
})();
