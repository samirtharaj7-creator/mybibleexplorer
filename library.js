/*
 * My Bible Explorer: shared Library menu.
 *
 * Every study site loads this one file from https://mybibleexplorer.com/library.js.
 * To add, rename or reorder a study, edit LIBRARY below and deploy the hub only.
 * Books stay in Bible order; topics stay in alphabetical order.
 * This file also sets the menu's look (colors, fonts, columns), so it is the same on every site.
 *
 * Each site still ships its own built-in list as a fallback. This script hides
 * that list and shows the shared one beside it, so pages built by React or by a
 * site script are never edited underneath their own code.
 */
(function () {
  "use strict";

  var LIBRARY = {
    book: [
      ["Genesis", "https://genesis.mybibleexplorer.com/"],
      ["Psalms", "https://psalms.mybibleexplorer.com/"],
      ["Isaiah", "https://isaiah.mybibleexplorer.com/"],
      ["Daniel", "https://daniel.mybibleexplorer.com/"],
      ["Romans", "https://romans.mybibleexplorer.com/"],
      ["Corinthians", "https://corinthians.mybibleexplorer.com/"],
      ["Galatians", "https://galatians.mybibleexplorer.com/"],
      ["Ephesians", "https://ephesians.mybibleexplorer.com/"],
      ["Philippians", "https://philippians.mybibleexplorer.com/"],
      ["Colossians", "https://colossians.mybibleexplorer.com/"],
      ["Thessalonians", "https://thessalonians.mybibleexplorer.com/"],
      ["1 & 2 Timothy", "https://timothy.mybibleexplorer.com/"],
      ["Titus", "https://titus.mybibleexplorer.com/"],
      ["Philemon", "https://philemon.mybibleexplorer.com/"],
      ["Hebrews", "https://hebrews.mybibleexplorer.com/"],
      ["James", "https://james.mybibleexplorer.com/"],
      ["Peter", "https://peter.mybibleexplorer.com/"],
      ["Letters of John", "https://johnletters.mybibleexplorer.com/"],
      ["Jude", "https://jude.mybibleexplorer.com/"],
      ["Revelation", "https://revelation.mybibleexplorer.com/"]
    ],
    topic: [
      ["Ask Ellen White", "https://askew.mybibleexplorer.com/"],
      ["Find Your Way Home", "https://stc.mybibleexplorer.com/"],
      ["Hermeneutics", "https://hermeneutics.mybibleexplorer.com/"],
      ["Last Day Events", "https://lastdayevents.mybibleexplorer.com/index.html"],
      ["Life of Christ", "https://christ.mybibleexplorer.com/"],
      ["Parables", "https://parables.mybibleexplorer.com/"],
      ["Salvation", "https://salvation.mybibleexplorer.com/"],
      ["Sanctuary", "https://sanctuary.mybibleexplorer.com/#structure"]
    ]
  };

  var here = location.hostname.replace(/^www\./, "");

  // One look for the menu on every site (the Genesis and letter-study design).
  var CSS = [
    "html body .mbe-library-menu .mbe-library-panel{position:fixed!important;top:var(--mbe-lib-top,56px)!important;right:var(--mbe-lib-right,12px)!important;left:auto!important;bottom:auto!important;width:min(920px,calc(100vw - 24px))!important;max-width:none!important;max-height:calc(100vh - var(--mbe-lib-top,56px) - 16px)!important;overflow:auto!important;overscroll-behavior:contain;margin:0!important;padding:12px!important;background:#142032!important;color:#ede4d3!important;border:1px solid #344055!important;border-radius:8px!important;box-shadow:0 24px 50px -34px rgba(0,0,0,.72)!important;z-index:1000!important;text-align:left!important;transform:none!important;}",
    "html body .mbe-library-menu .mbe-library-groups{display:grid!important;grid-template-columns:2fr 1fr!important;gap:18px!important;padding:4px!important;margin:0!important;}",
    "html body .mbe-library-menu .mbe-library-group{min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:none!important;}",
    "html body .mbe-library-menu .mbe-library-heading{margin:2px 8px 9px!important;padding:0!important;color:#e3c278!important;font:700 11.2px/1 Jost,system-ui,sans-serif!important;letter-spacing:.16em!important;text-transform:uppercase!important;text-align:left!important;}",
    "html body .mbe-library-menu .mbe-library-grid[data-mbe-shared]{display:grid!important;gap:6px!important;margin:0!important;padding:0!important;}",
    "html body .mbe-library-menu .mbe-library-grid-books[data-mbe-shared]{grid-template-columns:repeat(2,minmax(0,1fr))!important;}",
    "html body .mbe-library-menu .mbe-library-grid-topics[data-mbe-shared]{grid-template-columns:1fr!important;}",
    "html body .mbe-library-menu [data-mbe-shared] .mbe-library-item{display:flex!important;flex-direction:column!important;min-width:0!important;margin:0!important;padding:11px 12px!important;border:0!important;border-radius:6px!important;background:transparent!important;color:#ede4d3!important;font-style:normal!important;text-decoration:none!important;box-shadow:none!important;}",
    "html body .mbe-library-menu [data-mbe-shared] .mbe-library-item:hover{background:#202c3e!important;color:#e3c278!important;}",
    "html body .mbe-library-menu [data-mbe-shared] .mbe-library-item[aria-current=page]{background:rgba(237,228,211,.12)!important;color:#ede4d3!important;}",
    "html body .mbe-library-menu [data-mbe-shared] .mbe-library-name{color:inherit!important;font:400 16.3px/1.1 'Cormorant Garamond',Garamond,'Times New Roman',serif!important;letter-spacing:normal!important;text-transform:none!important;}",
    "@media(max-width:720px){html body .mbe-library-menu .mbe-library-groups{grid-template-columns:1fr!important;}html body .mbe-library-menu .mbe-library-grid-books[data-mbe-shared]{grid-template-columns:1fr 1fr!important;}}"
  ].join("\n");

  function addStyle() {
    if (document.getElementById("mbe-library-style")) return;
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&family=Jost:wght@700&display=swap";
    document.head.appendChild(font);
    var style = document.createElement("style");
    style.id = "mbe-library-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Open the panel just under the ribbon, lined up with the Library button.
  function place(menu) {
    var panel = menu.querySelector(".mbe-library-panel");
    var toggle = menu.querySelector(".mbe-library-toggle") || menu;
    if (!panel) return;
    var bar = menu.closest("header") || toggle;
    var top = Math.round(bar.getBoundingClientRect().bottom) + 1;
    var right = Math.max(12, Math.round(window.innerWidth - toggle.getBoundingClientRect().right) - 12);
    var width = Math.min(920, window.innerWidth - 24);
    right = Math.min(right, window.innerWidth - width - 12);
    panel.style.setProperty("--mbe-lib-top", top + "px");
    panel.style.setProperty("--mbe-lib-right", Math.max(12, right) + "px");
  }

  function build(category, fallback) {
    var grid = document.createElement("div");
    grid.className = fallback.className;
    grid.setAttribute("data-mbe-shared", category);
    LIBRARY[category].forEach(function (entry) {
      var a = document.createElement("a");
      a.className = "mbe-library-item";
      a.href = entry[1];
      if (new URL(entry[1]).hostname === here) a.setAttribute("aria-current", "page");
      var span = document.createElement("span");
      span.className = "mbe-library-name";
      span.textContent = entry[0];
      a.appendChild(span);
      grid.appendChild(a);
    });
    return grid;
  }

  function apply() {
    ["book", "topic"].forEach(function (category) {
      var selector = category === "book" ? ".mbe-library-grid-books" : ".mbe-library-grid-topics";
      var grids = document.querySelectorAll(selector + ":not([data-mbe-shared]):not([data-mbe-fallback])");
      Array.prototype.forEach.call(grids, function (fallback) {
        fallback.setAttribute("data-mbe-fallback", "");
        fallback.style.setProperty("display", "none", "important");
        fallback.parentNode.insertBefore(build(category, fallback), fallback.nextSibling);
      });
    });
  }

  function start() {
    addStyle();
    apply();
    document.addEventListener("toggle", function (event) {
      var menu = event.target;
      if (menu.classList && menu.classList.contains("mbe-library-menu") && menu.open) place(menu);
    }, true);
    window.addEventListener("resize", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".mbe-library-menu[open]"), place);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".mbe-library-menu[open]"), place);
    // Menus that a site script or React draws later are picked up as they appear.
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }

  // Wait for the page to finish loading so React has hydrated before anything is added.
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
