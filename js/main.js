;(function(){
  'use strict';

  var API_URL = 'https://prudential-tax-partners-api.prudential-tax-partners-api.workers.dev';

  // ===== PRELOADER =====
  window.addEventListener('load', function(){
    document.getElementById('preloader').classList.add('hidden');
  });

  // ===== HEADER SCROLL =====
  var header = document.getElementById('header');
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 80);
  });

  // ===== SCROLL INDICATOR FADE =====
  var scrollIndicator = document.querySelector('.scroll-indicator');
  if(scrollIndicator){
    window.addEventListener('scroll', function(){
      scrollIndicator.style.opacity = Math.max(0, 1 - window.scrollY / 200);
    });
  }

  // ===== MOBILE MENU =====
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('nav');
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
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav a');
  window.addEventListener('scroll', function(){
    var current = '';
    sections.forEach(function(s){
      var top = s.offsetTop - 120;
      if(window.scrollY >= top) current = s.getAttribute('id');
    });
    navLinks.forEach(function(a){
      a.classList.remove('active');
      if(a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
  });

  // ===== COUNTER ANIMATION =====
  function animateCounters(){
    var nums = document.querySelectorAll('.stat-num');
    nums.forEach(function(el){
      var target = parseInt(el.getAttribute('data-target'));
      var duration = 2000;
      var step = Math.max(1, Math.floor(target / 60));
      var current = 0;
      var inc = setInterval(function(){
        current += step;
        if(current >= target){
          current = target;
          clearInterval(inc);
        }
        el.textContent = current.toLocaleString();
      }, duration / (target / step));
    });
  }
  var heroStats = document.querySelector('.hero-stats');
  var countersTriggered = false;
  if(heroStats){
    var obs = new IntersectionObserver(function(entries){
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
  var track = document.getElementById('testimonialTrack');
  var dotsContainer = document.getElementById('testimonialDots');
  if(track && dotsContainer){
    var cards = track.querySelectorAll('.testimonial-card');
    var total = cards.length;
    var idx = 0;
    cards.forEach(function(_, i){
      var dot = document.createElement('span');
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
      var target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  // ===== SCROLL REVEAL =====
  var revealEls = document.querySelectorAll('.reveal');
  var revealObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, {threshold:0.1, rootMargin:'0px 0px -50px 0px'});
  revealEls.forEach(function(el){ revealObs.observe(el); });

  // ===== FORM SUBMISSION =====
  var contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = contactForm.querySelector('.btn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      var data = new URLSearchParams(new FormData(contactForm));
      fetch(API_URL + '/api/contact', {
        method: 'POST',
        body: data,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).then(function(res){
        return res.json();
      }).then(function(json){
        if(json.success){
          contactForm.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:3rem;margin-bottom:8px;color:var(--gold)">&#10003;</div><h3 style="font-family:Playfair Display,serif;font-size:1.5rem;color:var(--primary);margin-bottom:8px">Thank You</h3><p style="color:var(--text-muted)">Your message has been sent successfully. We will be in touch shortly.</p></div>';
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

  // ===== ENHANCED 3D TILT ON CARDS =====
  var tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = (y - centerY) / centerY * -10;
      var rotateY = (x - centerX) / centerX * 10;
      card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.03,1.03,1.03)';
      card.style.boxShadow = (rotateX < 0 ? Math.abs(rotateX) / 2 + 10 : 10) + 'px ' + (rotateY > 0 ? rotateY / 2 + 10 : 10) + 'px 40px rgba(61,50,44,0.1)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      card.style.boxShadow = '';
    });
  });

  // ===== HERO 3D PARALLAX ON MOUSE MOVE =====
  var hero = document.querySelector('.hero');
  var hero3dLayer = document.getElementById('hero3dLayer');
  var heroContent = document.getElementById('heroContent');
  var heroShapes = hero3dLayer ? hero3dLayer.querySelectorAll('.hero-3d-shape') : [];

  if(hero && hero3dLayer){
    hero.addEventListener('mousemove', function(e){
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      if(heroContent){
        heroContent.style.transform = 'translateZ(20px) rotateX(' + (y * -2) + 'deg) rotateY(' + (x * 2) + 'deg)';
      }

      heroShapes.forEach(function(shape, i){
        var depth = (i + 1) * 30;
        var moveX = x * depth;
        var moveY = y * depth;
        shape.style.transform = 'translateX(' + moveX + 'px) translateY(' + moveY + 'px)';
      });
    });

    hero.addEventListener('mouseleave', function(){
      if(heroContent){
        heroContent.style.transform = 'translateZ(0) rotateX(0deg) rotateY(0deg)';
      }
      heroShapes.forEach(function(shape){
        shape.style.transform = '';
      });
    });
  }

})();
