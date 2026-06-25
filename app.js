const year = document.querySelector("#year");
const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
const hero = document.querySelector(".hero");
const heroImage = document.querySelector("#hero-slide-image");
const heroKicker = document.querySelector("#hero-kicker");
const heroLabel = document.querySelector("#hero-label");
const heroTitle = document.querySelector("#hero-title");
const heroDescription = document.querySelector("#hero-description");
const heroCta = document.querySelector("#hero-cta");
const heroCtaLabel = document.querySelector("#hero-cta-label");
const slideDots = document.querySelector("#slide-dots");
const progressBar = document.querySelector("#slide-progress-bar");

const slides = [
  {
    label: "Hermeneutics",
    title: "Learning to Interpret the Bible",
    description:
      "Before you study any book, it helps to know how to read it. Learn the principles that unlock any passage, so you're never stuck waiting for someone else to tell you what it means.",
    image: "./assets/slide-hermeneutics.png",
    href: "https://hermeneutics.mybibleexplorer.com",
    cta: "Open the guide"
  },
  {
    label: "Psalms",
    title: "The Psalms",
    description:
      "The Bible's songbook, where every emotion you've ever felt, joy, grief, anger, gratitude, meets God head-on. A good place to feel understood.",
    image: "./assets/slide-psalms.png",
    href: "https://psalms.mybibleexplorer.com",
    cta: "Enter the Psalms"
  },
  {
    label: "Daniel",
    title: "Daniel",
    description:
      "Kingdoms rise, kingdoms fall, and through it all one truth holds: God is still on the throne. One of Scripture's great prophetic adventures.",
    image: "./assets/slide-daniel.png",
    href: "https://daniel.mybibleexplorer.com",
    cta: "Begin Daniel"
  },
  {
    label: "Revelation",
    title: "Revelation",
    description:
      "The Bible's final act. We'll help you make sense of the symbols and visions, and find the hope sitting right at the center of it all.",
    image: "./assets/slide-revelation.jpg",
    href: "https://revelation.mybibleexplorer.com",
    cta: "Unseal Revelation"
  },
  {
    label: "Sanctuary",
    title: "The Sanctuary",
    description:
      "A blueprint hidden in plain sight. Explore how its design quietly tells the whole story of salvation.",
    image: "./assets/slide-sanctuary.png",
    href: "https://sanctuary.mybibleexplorer.com/#structure",
    cta: "Step inside"
  },
  {
    label: "Last Day Events",
    title: "Last Day Events",
    description:
      "What does the Bible actually say about how it all ends? And how do you get ready for it? Let's look together.",
    image: "./assets/slide-last-day-events.jpg",
    href: "https://lastdayevents.mybibleexplorer.com/index.html",
    cta: "Look ahead"
  }
];

const slideDuration = 6000;
let currentSlide = 0;
let slideTimer;

year.textContent = new Date().getFullYear();

slides.forEach((slide, index) => {
  const image = new Image();
  image.src = slide.image;

  const button = document.createElement("button");
  button.className = "slide-dot";
  button.type = "button";
  button.textContent = slide.label;
  button.setAttribute("aria-label", `Show ${slide.title}`);
  button.addEventListener("click", () => showSlide(index, true));
  slideDots.append(button);
});

function restartProgress() {
  progressBar.classList.remove("is-running");
  progressBar.style.width = "0%";
  void progressBar.offsetWidth;
  progressBar.style.width = "";
  progressBar.classList.add("is-running");
}

function showSlide(index, userInitiated = false) {
  currentSlide = (index + slides.length) % slides.length;
  const slide = slides[currentSlide];

  hero.classList.add("is-changing");
  window.setTimeout(() => {
    heroImage.src = slide.image;
    heroKicker.textContent = "Website Showcase";
    heroLabel.textContent = slide.label;
    heroTitle.textContent = slide.title;
    heroDescription.textContent = slide.description;
    heroCta.href = slide.href;
    heroCtaLabel.textContent = slide.cta;
    hero.classList.remove("is-changing");
  }, 160);

  [...slideDots.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === currentSlide);
    dot.setAttribute("aria-current", dotIndex === currentSlide ? "true" : "false");
  });

  restartProgress();

  if (userInitiated) {
    restartTimer();
  }
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function restartTimer() {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(nextSlide, slideDuration);
}

showSlide(0);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  restartTimer();
} else {
  progressBar.classList.remove("is-running");
  progressBar.style.width = "100%";
}

menuButton.addEventListener("click", () => {
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuButton.setAttribute("aria-expanded", String(willOpen));
});

mobileMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    mobileMenu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
  }
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("in"));
}
