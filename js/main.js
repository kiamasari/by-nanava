/* =========================================================
   Ruslan Nanava — интерактив
   1) мобильное бургер-меню
   2) плавная инерционная прокрутка (Lenis, если подгрузилась)
   3) scroll-анимации: «пропечатка» текста и появление блоков
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var REDUCED = root.classList.contains("reduced");
  var ANIM = root.classList.contains("js") && !REDUCED;

  /* ---------- 1. Бургер-меню ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (burger) {
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }
  }
  function toggleMenu() {
    if (!nav) return;
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  }
  if (burger && nav) {
    burger.addEventListener("click", toggleMenu);
    nav.addEventListener("click", function (e) {
      if (e.target.closest(".nav__link")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    var mqDesk = window.matchMedia("(min-width: 769px)");
    mqDesk.addEventListener("change", function (e) { if (e.matches) closeMenu(); });
  }

  /* ---------- 2. Плавная инерционная прокрутка ---------- */
  var lenis = null;
  if (ANIM && typeof window.Lenis === "function") {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    root.style.scrollBehavior = "auto"; // отдаём управление Lenis
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  // Якорные ссылки: плавный переход с учётом высоты шапки
  var headerH = 64;
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) {
        lenis.scrollTo(target, { offset: -headerH });
      } else {
        var y = target.getBoundingClientRect().top + window.pageYOffset - headerH;
        window.scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" });
      }
    });
  });

  /* ---------- 3. Scroll-анимации ---------- */
  if (!ANIM) return; // без анимаций контент уже виден (см. CSS)

  var STAGGER_CHAR = 24; // мс, синхронно с CSS
  var SPACE_RE = /(\s+)/;

  // Разбивает содержимое элемента на слова/символы, сохраняя <br>, пробелы
  // и вложенные инлайн-элементы (например span с другим размером шрифта)
  function splitElement(el, mode) {
    var i = 0;

    function process(src, dest) {
      Array.prototype.slice.call(src.childNodes).forEach(function (node) {
        if (node.nodeType === 3) { // текст
          node.textContent.split(SPACE_RE).forEach(function (tok) {
            if (tok === "") return;
            if (/^\s+$/.test(tok)) { dest.appendChild(document.createTextNode(" ")); return; }

            var word = document.createElement("span");
            word.className = "word";
            if (mode === "words") {
              word.classList.add("word-fade");
              word.style.setProperty("--i", i++);
              word.textContent = tok;
            } else { // chars
              for (var k = 0; k < tok.length; k++) {
                var c = document.createElement("span");
                c.className = "char";
                c.style.setProperty("--i", i++);
                c.textContent = tok[k];
                word.appendChild(c);
              }
            }
            dest.appendChild(word);
          });
        } else if (node.nodeName === "BR") {
          dest.appendChild(document.createElement("br"));
        } else if (node.nodeType === 1) {
          // сохраняем обёртку (класс/стиль), а её содержимое бьём рекурсивно
          var wrap = node.cloneNode(false);
          dest.appendChild(wrap);
          process(node, wrap);
        }
      });
    }

    // строим во фрагменте по «живому» содержимому, затем заменяем разом
    var frag = document.createDocumentFragment();
    process(el, frag);
    el.textContent = "";
    el.appendChild(frag);

    // курсор-каретка для «печатной машинки»
    if (mode === "chars" && el.hasAttribute("data-caret")) {
      var caret = document.createElement("span");
      caret.className = "caret";
      caret.setAttribute("aria-hidden", "true");
      el.appendChild(caret);
      el.dataset.count = i; // число символов — для момента «допечатал»
    }
  }

  // Разбиваем все нужные элементы заранее
  var typeEls = Array.prototype.slice.call(document.querySelectorAll(".reveal-type"));
  var wordEls = Array.prototype.slice.call(document.querySelectorAll(".reveal-words"));
  typeEls.forEach(function (el) { splitElement(el, "chars"); });
  wordEls.forEach(function (el) { splitElement(el, "words"); });

  // Наблюдатель: добавляем .is-in при попадании в зону видимости
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add("is-in");

      // спрятать каретку после завершения «печати»
      if (el.hasAttribute("data-caret")) {
        var n = parseInt(el.dataset.count || "0", 10);
        var done = n * STAGGER_CHAR + 650;
        setTimeout(function () { el.classList.add("is-typed"); }, done);
      }
      io.unobserve(el); // анимируем один раз
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

  // элементы с задержкой (data-delay -> --d)
  document.querySelectorAll(".reveal[data-delay]").forEach(function (el) {
    el.style.setProperty("--d", el.getAttribute("data-delay"));
  });

  var animated = document.querySelectorAll(
    ".reveal, .reveal-media, .reveal-line, .reveal-type, .reveal-words"
  );
  animated.forEach(function (el) { io.observe(el); });

  // Подстраховка: если что-то уже в зоне видимости (или наблюдатель не сработал),
  // принудительно показываем такие элементы после полной загрузки страницы.
  function revealVisible() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    animated.forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 1.15 && r.bottom > 0) {
        el.classList.add("is-in");
        if (el.hasAttribute("data-caret")) el.classList.add("is-typed");
        io.unobserve(el);
      }
    });
  }
  window.addEventListener("load", function () { setTimeout(revealVisible, 100); });
})();
