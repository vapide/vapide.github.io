(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var revealTargets = document.querySelectorAll("[data-reveal]");

  function showAll() {
    for (var i = 0; i < revealTargets.length; i++) {
      revealTargets[i].classList.add("is-visible");
    }
  }

  if (!revealTargets.length) {
    // nothing to do
  } else if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    showAll();
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          entries[i].target.classList.add("is-visible");
          observer.unobserve(entries[i].target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    for (var i = 0; i < revealTargets.length; i++) {
      var el = revealTargets[i];
      var delay = parseInt(el.getAttribute("data-reveal-delay"), 10);
      if (delay > 0) el.style.setProperty("--reveal-delay", delay);
      revealObserver.observe(el);
    }

    // Anything already on screen at load should not wait for a scroll event.
    window.setTimeout(function () {
      for (var j = 0; j < revealTargets.length; j++) {
        var rect = revealTargets[j].getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          revealTargets[j].classList.add("is-visible");
        }
      }
    }, 60);
  }

  var nav = document.getElementById("site-nav");
  if (nav) {
    var ticking = false;
    var applyScrollState = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(applyScrollState);
      },
      { passive: true }
    );

    applyScrollState();
  }

  var toggle = document.querySelector(".nav__toggle");
  var links = document.getElementById("nav-links");

  if (toggle && links) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      links.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      toggle.focus();
    });

    window.addEventListener(
      "resize",
      function () {
        if (window.innerWidth > 820) setMenu(false);
      },
      { passive: true }
    );
  }

  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  if (navLinks.length && "IntersectionObserver" in window) {
    var linkFor = {};
    var sections = [];

    for (var k = 0; k < navLinks.length; k++) {
      var id = navLinks[k].getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (!section) continue;
      linkFor[id] = navLinks[k];
      sections.push(section);
    }

    var visible = {};

    var spy = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          visible[entries[i].target.id] = entries[i].isIntersecting;
        }

        // Highlight the first section currently in the band; if none is,
        // leave the last highlight alone rather than flickering to nothing.
        var current = null;
        for (var j = 0; j < sections.length; j++) {
          if (visible[sections[j].id]) {
            current = sections[j].id;
            break;
          }
        }
        if (!current) return;

        for (var id in linkFor) {
          if (Object.prototype.hasOwnProperty.call(linkFor, id)) {
            linkFor[id].classList.toggle("is-active", id === current);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    for (var m = 0; m < sections.length; m++) spy.observe(sections[m]);
  }
})();
