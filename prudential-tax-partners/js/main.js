;(function(){
  'use strict';

  // ===== PRELOADER =====
  window.addEventListener('load', function(){
    document.getElementById('preloader').classList.add('hidden');
  });

  // ===== HEADER SCROLL =====
  const header = document.getElementById('header');
  let lastScroll = 0;
  window.addEventListener('scroll', function(){
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 80);
    lastScroll = y;
  });

  // ===== MOBILE MENU =====
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  toggle.addEventListener('click', function(){
    nav.classList.toggle('open');
    toggle.classList.toggle('active');
  });
  nav.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', function(){
      nav.classList.remove('open');
      toggle.classList.remove('active');
    });
  });

  // ===== ACTIVE NAV LINK =====
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav a');
  window.addEventListener('scroll', function(){
    let current = '';
    sections.forEach(function(s){
      const top = s.offsetTop - 120;
      if(window.scrollY >= top) current = s.getAttribute('id');
    });
    navLinks.forEach(function(a){
      a.classList.remove('active');
      if(a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
  });

  // ===== COUNTER ANIMATION =====
  function animateCounters(){
    const nums = document.querySelectorAll('.stat-num');
    nums.forEach(function(el){
      const target = parseInt(el.getAttribute('data-target'));
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const step = Math.max(1, Math.floor(target / 60));
      let current = 0;
      const inc = setInterval(function(){
        current += step;
        if(current >= target){
          current = target;
          clearInterval(inc);
        }
        el.textContent = current.toLocaleString() + suffix;
      }, duration / (target / step));
    });
  }

  // ===== INTERSECTION OBSERVER FOR COUNTERS =====
  const heroStats = document.querySelector('.hero-stats');
  let countersTriggered = false;
  if(heroStats){
    const obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting && !countersTriggered){
          countersTriggered = true;
          animateCounters();
          obs.disconnect();
        }
      });
    }, {threshold:0.3});
    obs.observe(heroStats);
  }

  // ===== TESTIMONIAL SLIDER =====
  const track = document.getElementById('testimonialTrack');
  const dotsContainer = document.getElementById('testimonialDots');
  if(track && dotsContainer){
    const cards = track.querySelectorAll('.testimonial-card');
    const total = cards.length;
    let idx = 0;
    cards.forEach(function(_, i){
      const dot = document.createElement('span');
      if(i === 0) dot.classList.add('active');
      dot.addEventListener('click', function(){ goTo(i); });
      dotsContainer.appendChild(dot);
    });
    function goTo(n){
      idx = n;
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dotsContainer.querySelectorAll('span').forEach(function(d, i){
        d.classList.toggle('active', i === idx);
      });
    }
    setInterval(function(){ goTo((idx + 1) % total); }, 5000);
  }

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      const target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

})();