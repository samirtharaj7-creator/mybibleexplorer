/*
 * My Bible Explorer: shared Library menu.
 *
 * Every study site loads this one file from https://mybibleexplorer.com/library.js.
 * To add, rename or reorder a study, edit LIBRARY below and deploy the hub only.
 * Books stay in Bible order; topics stay in alphabetical order.
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
    apply();
    // Menus that a site script or React draws later are picked up as they appear.
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }

  // Wait for the page to finish loading so React has hydrated before anything is added.
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
