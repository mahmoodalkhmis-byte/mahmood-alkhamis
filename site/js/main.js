/* ==================================================================
   main.js — يبني الموقع من ملفين محتوى:
     content/projects.json  ← المشاريع (الصور والوصف)
     content/site.json      ← نصوص الموقع (الواجهة، النبذة، التواصل)
   الملفين تعدّلهم من لوحة التحكم (Pages CMS)، ما تحتاج تلمس هذا الملف.
   ================================================================== */

/* القسمين ثابتين: لكل قسم اسم وصفحة.
   العنوان الإنجليزي الصغير والنبذة تنكتب في لوحة التحكم (site.json) */
const SECTIONS = {
  sport: { title: "رياضي", page: "sports.html", label: "SPORTS", intro: "" },
  story: { title: "مشاريع", page: "projects.html", label: "PEOPLE · PLACES · STORIES", intro: "" },
};

let PROJECTS = [];
let SITE = {};

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const meta = (p) => [p.location, p.year].filter(Boolean).join(" · ");

/* يحمي النص من الرموز الخاصة بـ HTML */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/* مسار الصورة كما تحفظه لوحة التحكم (images/...).
   نشيل أي "/" في البداية عشان الصور تشتغل حتى لو الموقع داخل مجلد فرعي */
const src = (path) => String(path ?? "").replace(/^\/+/, "");

/* النص الطويل: كل سطر = فقرة */
const paragraphs = (t) =>
  (Array.isArray(t) ? t : String(t ?? "").split(/\n+/))
    .map((s) => String(s).trim())
    .filter(Boolean);

/* يجيب قيمة من site.json بمسار مثل "about.lead" */
const pick = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), SITE);

/* معلومات القسم: الاسم والصفحة من فوق، والباقي من site.json */
const sectionInfo = (key) => ({ ...SECTIONS[key], ...(SITE.sections?.[key] || {}) });

/* مشاريع نفس القسم، ورقم المشروع داخل قسمه (01، 02، ...) */
const sameSection = (p) => PROJECTS.filter((q) => q.category === p.category);
const numInSection = (p) => sameSection(p).indexOf(p) + 1;

async function loadJSON(path) {
  // no-cache: يتأكد من السيرفر إذا الملف تغيّر، عشان التعديلات تبان على طول
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------
   النصوص الثابتة في الصفحات: أي عنصر عليه واحد من هذي يتعبّى من site.json
     data-text="contact.title"   نص عادي
     data-lines="hero.title"     كل سطر جديد = <br>
     data-paras="about.body"     كل سطر = فقرة <p>
     data-src="hero.photo"       صورة
     data-list="about.tags"      قائمة (الوسوم، الأرقام)
     data-link="email|linkedin"  روابط البريد و LinkedIn (الفوتر وغيره)
   ------------------------------------------------------------------ */
function fillSiteContent() {
  document.querySelectorAll("[data-text]").forEach((el) => {
    const v = pick(el.dataset.text);
    if (typeof v === "string") el.textContent = v;
  });

  document.querySelectorAll("[data-lines]").forEach((el) => {
    const v = pick(el.dataset.lines);
    if (typeof v === "string") el.innerHTML = paragraphs(v).map(esc).join("<br>");
  });

  document.querySelectorAll("[data-paras]").forEach((el) => {
    const v = pick(el.dataset.paras);
    if (v != null) el.innerHTML = paragraphs(v).map((t) => `<p>${esc(t)}</p>`).join("");
  });

  document.querySelectorAll("[data-src]").forEach((el) => {
    const v = pick(el.dataset.src);
    if (v && src(v) !== el.getAttribute("src")) el.src = src(v);
  });

  const facts = pick("about.facts");
  document.querySelectorAll('[data-list="about.facts"]').forEach((el) => {
    if (Array.isArray(facts))
      el.innerHTML = facts
        .map((f) => `<div class="fact"><strong>${esc(f.value)}</strong><span>${esc(f.text)}</span></div>`)
        .join("");
  });

  const tags = pick("about.tags");
  document.querySelectorAll('[data-list="about.tags"]').forEach((el) => {
    if (Array.isArray(tags)) el.innerHTML = tags.map((t) => `<li>${esc(t)}</li>`).join("");
  });

  const c = SITE.contact || {};
  document.querySelectorAll('[data-link="email"]').forEach((a) => {
    if (c.email) a.href = `mailto:${c.email}`;
  });
  document.querySelectorAll('[data-link="linkedin"]').forEach((a) => {
    if (c.linkedin) a.href = c.linkedin;
  });
}

/* صفحة "تواصل معي": القائمة كاملة من site.json */
function renderContactList(el) {
  const c = SITE.contact;
  if (!c) return;
  const link = (href, label, value, external) => `
    <li>
      <a href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ""}>
        <span class="label">${esc(label)}</span>
        <span class="value">${esc(value)}</span>
      </a>
    </li>`;
  const items = [];
  if (c.email) items.push(link(`mailto:${c.email}`, "البريد", c.email));
  if (c.phone)
    items.push(link(`https://wa.me/${String(c.phone).replace(/\D/g, "")}`, "الجوال / واتساب", c.phone, true));
  if (c.linkedin)
    items.push(link(c.linkedin, "LinkedIn", c.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), true));
  if (c.location)
    items.push(`
    <li>
      <div class="row">
        <span class="label">الموقع</span>
        <span class="value ar">${esc(c.location)}</span>
      </div>
    </li>`);
  el.innerHTML = items.join("");
}

/* بطاقة مربعة: صورة الغلاف واسم المشروع عليها
   k = ترتيبها في الشبكة، عشان البطاقات تظهر وحدة ورا الثانية (70ms بين كل عمود) */
function cardHTML(p, k = 0) {
  return `
    <a class="card" href="project.html?id=${encodeURIComponent(p.id)}"
       data-reveal style="--reveal-delay:${(k % 3) * 70}ms">
      <img src="${esc(src(p.cover))}" alt="${esc(p.title)}" loading="lazy"
           style="object-position:${esc(p.coverPosition || "50% 50%")}">
      <span class="card-num">${pad(numInSection(p))}</span>
      <span class="card-info">
        <span class="card-title">${esc(p.title)}</span>
        <span class="card-meta">${esc(meta(p))}</span>
      </span>
    </a>`;
}

/* صفحة القسم (رياضي أو مشاريع): العنوان والنبذة، وبعدها الأغلفة
   القسم يتحدد من data-category في الصفحة نفسها (sports.html / projects.html) */
function renderSectionPage(el) {
  const key = el.dataset.category;
  const cat = sectionInfo(key);
  const list = PROJECTS.filter((p) => p.category === key);
  el.innerHTML = `
    <div class="page-head wrap">
      <span class="eyebrow">${esc(cat.label)}</span>
      <h1>${esc(cat.title)}</h1>
      ${cat.intro ? `<p>${esc(cat.intro)}</p>` : ""}
    </div>
    <div class="wrap section-grid">
      <div class="grid">${list.map(cardHTML).join("")}</div>
    </div>`;
}

/* الصفحة الرئيسية: المشاريع المختارة (featured) */
function renderFeatured(el) {
  const list = PROJECTS.filter((p) => p.featured);
  el.innerHTML = (list.length ? list : PROJECTS.slice(0, 3)).map(cardHTML).join("");
}

/* صفحة المشروع: الغلاف ← الوصف ← الصور */
function renderProject(el) {
  const id = new URLSearchParams(location.search).get("id");
  const p = PROJECTS.find((q) => q.id === id);
  if (!p) {
    el.innerHTML = `
      <div class="wrap empty">
        <h1>المشروع غير موجود</h1>
        <p><a class="btn" href="index.html">ارجع للرئيسية</a></p>
      </div>`;
    return;
  }
  const cat = sectionInfo(p.category);
  const section = sameSection(p);
  const next = section[(section.indexOf(p) + 1) % section.length]; // التالي من نفس القسم
  const photos = (p.photos || []).map(src);
  document.title = `${p.title} | محمود آل خميس`;

  // نعلّم القسم الحالي في الهيدر (رياضي أو مشاريع)
  const navLink = document.querySelector(`.nav a[data-nav="${p.category}"]`);
  if (navLink) navLink.setAttribute("aria-current", "page");

  el.innerHTML = `
    <article class="project">
      <div class="wrap">
        <a class="back" href="${esc(cat.page)}"><span class="arrow arrow--back" aria-hidden="true">→</span> ${esc(cat.title)}</a>
      </div>

      <figure class="project-cover wrap">
        <img src="${esc(src(p.cover))}" alt="${esc(p.title)}">
      </figure>

      <header class="project-head wrap">
        <div class="project-title" data-reveal>
          <span class="eyebrow">${esc(cat.label)} · ${pad(numInSection(p))}</span>
          <h1>${esc(p.title)}</h1>
          ${p.subtitle ? `<p class="project-sub">${esc(p.subtitle)}</p>` : ""}
          <p class="project-meta">${esc(meta(p))}${meta(p) ? " · " : ""}${photos.length} صور</p>
        </div>
        <div class="project-desc" data-reveal style="--reveal-delay:90ms">
          ${paragraphs(p.description).map((t) => `<p>${esc(t)}</p>`).join("")}
        </div>
      </header>

      <section class="gallery wrap">
        ${photos
          .map(
            (f, k) => `
          <button class="shot" type="button" data-index="${k}" aria-label="عرض الصورة ${k + 1}"
                  data-reveal style="--reveal-delay:${(k % 2) * 70}ms">
            <img src="${esc(f)}" alt="${esc(p.title)} — صورة ${k + 1}" loading="lazy">
          </button>`
          )
          .join("")}
      </section>

      ${
        next && next !== p
          ? `<nav class="next-project wrap" data-reveal>
        <span class="eyebrow">NEXT PROJECT</span>
        <a href="project.html?id=${encodeURIComponent(next.id)}">${esc(next.title)} <span class="arrow" aria-hidden="true">←</span></a>
      </nav>`
          : ""
      }
    </article>`;

  setupLightbox(photos);
}

/* عارض الصور بملء الشاشة */
function setupLightbox(srcs) {
  const box = $("lightbox");
  if (!box || !srcs.length) return;
  const img = box.querySelector("img");
  const count = box.querySelector(".lb-count");
  let cur = 0;

  const show = (k) => {
    cur = (k + srcs.length) % srcs.length;
    img.src = srcs[cur];
    count.textContent = `${cur + 1} / ${srcs.length}`;
  };

  document.querySelectorAll(".shot").forEach((b) =>
    b.addEventListener("click", () => {
      show(Number(b.dataset.index));
      box.showModal();
    })
  );
  box.querySelector(".lb-close").onclick = () => box.close();
  box.querySelector(".lb-next").onclick = () => show(cur + 1);
  box.querySelector(".lb-prev").onclick = () => show(cur - 1);
  box.addEventListener("click", (e) => { if (e.target === box) box.close(); });

  // الموقع عربي (من اليمين لليسار): السهم الأيسر = التالية
  document.addEventListener("keydown", (e) => {
    if (!box.open) return;
    if (e.key === "ArrowLeft") show(cur + 1);
    if (e.key === "ArrowRight") show(cur - 1);
  });

  // السحب بالإصبع في الجوال
  let x0 = null;
  box.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  box.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(cur + (dx > 0 ? 1 : -1));
    x0 = null;
  });
}

/* الظهور مع النزول (نفس طريقة سعف):
   أي عنصر عليه data-reveal يظهر ويطلع لفوق أول ما يدخل الشاشة، مرة وحدة بس.
   يشتغل بعد ما تنبني الصفحة من ملفات المحتوى. */
function setupReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );
  items.forEach((el) => io.observe(el));
}

/* زر "للأعلى": المثلث يطير لفوق لما تضغطه (التمرير نفسه سلس من CSS) */
function setupToTop() {
  document.querySelectorAll("[data-top]").forEach((link) => {
    link.addEventListener("click", () => {
      link.classList.remove("is-rising");
      void link.offsetWidth; // يعيد تشغيل الحركة من البداية
      link.classList.add("is-rising");
      setTimeout(() => link.classList.remove("is-rising"), 800);
    });
  });
}

/* تشغيل: نحمّل ملفات المحتوى، بعدها نبني الصفحة */
async function start() {
  try {
    const [projects, site] = await Promise.all([
      loadJSON("content/projects.json"),
      loadJSON("content/site.json"),
    ]);
    PROJECTS = (projects.projects || []).filter((p) => p && p.id && p.title);
    SITE = site || {};
  } catch (err) {
    // مثلًا لو فتحت الملف مباشرة بدون سيرفر: النصوص المكتوبة في الصفحة تبقى زي ما هي
    console.error("تعذّر تحميل ملفات المحتوى:", err);
  }

  fillSiteContent();
  if ($("contact-list")) renderContactList($("contact-list"));
  if ($("section-page")) renderSectionPage($("section-page"));
  if ($("featured-list")) renderFeatured($("featured-list"));
  if ($("project-page")) renderProject($("project-page"));
  document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));

  document.documentElement.classList.add("content-ready");
  setupReveal();
  setupToTop();
}

start();
