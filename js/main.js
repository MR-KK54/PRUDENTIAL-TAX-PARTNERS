;(function(){
  'use strict';

  var API_URL = 'https://prudential-tax-partners-api.your-subdomain.workers.dev';

  // ===== PRELOADER =====
  window.addEventListener('load', function(){
    document.getElementById('preloader').classList.add('hidden');
  });

  // ===== HEADER SCROLL =====
  const header = document.getElementById('header');
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 80);
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
      const duration = 2000;
      const step = Math.max(1, Math.floor(target / 60));
      let current = 0;
      const inc = setInterval(function(){
        current += step;
        if(current >= target){
          current = target;
          clearInterval(inc);
        }
        el.textContent = current.toLocaleString();
      }, duration / (target / step));
    });
  }
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

  // ===== SMOOTH SCROLL =====
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      const target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  // ===== SCROLL REVEAL =====
  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, {threshold:0.1, rootMargin:'0px 0px -50px 0px'});
  revealEls.forEach(function(el){ revealObs.observe(el); });

  // ===== FORM SUBMISSION =====
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      const btn = contactForm.querySelector('.btn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      const data = new URLSearchParams(new FormData(contactForm));
      fetch(API_URL + '/api/contact', {
        method: 'POST',
        body: data,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).then(function(res){
        return res.json();
      }).then(function(json){
        if(json.success){
          contactForm.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:3rem;margin-bottom:16px">✓</div><h3 style="color:var(--primary);margin-bottom:8px">Thank You!</h3><p style="color:var(--gray)">Your message has been sent successfully. We\'ll get back to you shortly.</p></div>';
        } else {
          btn.textContent = 'Send Message';
          btn.disabled = false;
          alert(json.message || 'Something went wrong. Please try again.');
        }
      }).catch(function(){
        btn.textContent = 'Send Message';
        btn.disabled = false;
        alert('Something went wrong. Please check your connection and try again.');
      });
    });
  }

  // ===== 3D TILT ON CARDS =====
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -6;
      const rotateY = (x - centerX) / centerX * 6;
      card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02,1.02,1.02)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    });
  });

})();
