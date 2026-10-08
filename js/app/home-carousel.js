// Replace these empty slots with { src: "./assets/site/…", alt: "角色名稱", position: "50% 30%" }.
export const homeCarouselSlides = [
    { src: "./assets/site/background.png", alt: "賽爾號角色聚會場景", position: "50% 25%" },
    { src: "", alt: "" }
];

export function initHomeCarousel(home, slides = homeCarouselSlides) {
    const carousel = home.querySelector(".home-carousel");
    const stage = carousel.querySelector("[data-carousel-stage]");
    const pages = carousel.querySelector("[data-carousel-pages]");
    const pause = carousel.querySelector("[data-carousel-pause]");
    const count = carousel.querySelector("[data-carousel-count]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = 0, timer = null, paused = reducedMotion.matches, hovering = false;
    let touchStart = null;
    const panels = slides.map((slide, index) => {
        const panel = document.createElement("div");
        panel.className = "home-carousel-slide";
        panel.setAttribute("role", "group");
        panel.setAttribute("aria-roledescription", "投影片");
        panel.setAttribute("aria-label", `${index + 1} / ${slides.length}`);
        const placeholder = document.createElement("span");
        placeholder.className = "home-carousel-placeholder";
        placeholder.textContent = `圖片待補 · ${index + 1}`;
        panel.append(placeholder);
        if (slide.src) {
            const image = document.createElement("img");
            image.alt = slide.alt;
            image.style.objectPosition = slide.position || "50% 50%";
            image.draggable = false;
            image.loading = index === 0 ? "eager" : "lazy";
            image.addEventListener("load", () => { placeholder.hidden = true; });
            image.addEventListener("error", () => {
                image.hidden = true;
                placeholder.hidden = false;
                placeholder.textContent = "圖片無法載入";
            });
            image.src = slide.src;
            panel.append(image);
        }
        stage.append(panel);
        return panel;
    });
    const dots = slides.map((slide, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = String(index + 1).padStart(2, "0");
        button.setAttribute("aria-label", `第 ${index + 1} 張${slide.alt ? `：${slide.alt}` : ""}`);
        button.addEventListener("click", () => show(index));
        pages.append(button);
        return button;
    });
    function schedule() {
        window.clearTimeout(timer);
        timer = null;
        if (!paused && !hovering && !home.hidden && !document.hidden && slides.length > 1 &&
            !carousel.contains(document.activeElement)) {
            timer = window.setTimeout(() => show(current + 1), 5000);
        }
    }
    function show(index) {
        current = (index + slides.length) % slides.length;
        panels.forEach((panel, i) => { panel.hidden = i !== current; });
        dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === current)));
        count.textContent = `${current + 1} / ${slides.length}`;
        schedule();
    }
    function updatePause() {
        pause.textContent = paused ? "播放輪播" : "暫停輪播";
        pause.setAttribute("aria-label", paused ? "播放自動輪播" : "暫停自動輪播");
        schedule();
    }
    carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => show(current - 1));
    carousel.querySelector("[data-carousel-next]").addEventListener("click", () => show(current + 1));
    pause.addEventListener("click", () => { paused = !paused; updatePause(); });
    carousel.addEventListener("mouseenter", () => { hovering = true; schedule(); });
    carousel.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    carousel.addEventListener("focusin", schedule);
    carousel.addEventListener("focusout", () => queueMicrotask(schedule));
    carousel.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        show(current + (event.key === "ArrowLeft" ? -1 : 1));
    });
    stage.addEventListener("touchstart", (event) => {
        touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener("touchend", (event) => {
        if (!touchStart) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
        touchStart = null;
    }, { passive: true });
    stage.addEventListener("touchcancel", () => { touchStart = null; });
    document.addEventListener("visibilitychange", schedule);
    new MutationObserver(schedule).observe(home, { attributes: true, attributeFilter: ["hidden"] });
    reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; updatePause(); });
    if (!slides.length) { carousel.hidden = true; return; }
    carousel.querySelector("[data-carousel-prev]").disabled = slides.length < 2;
    carousel.querySelector("[data-carousel-next]").disabled = slides.length < 2;
    pause.disabled = slides.length < 2;
    show(0);
    updatePause();
}
