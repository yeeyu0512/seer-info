// Homepage artwork and responsive image sources.
export const homeCarouselSlides = [
    { src: "./assets/site/home-banner-1600.webp", srcset: "./assets/site/home-banner-960.webp 960w, ./assets/site/home-banner-1600.webp 1600w, ./assets/site/home-banner-2400.webp 2400w", sizes: "(max-width: 1200px) calc(100vw - 32px), 1120px", width: 1600, height: 900, alt: "賽爾號角色聚會場景", position: "50% 25%" },
    { src: "./assets/site/home-banner-3-1600.webp", srcset: "./assets/site/home-banner-3-960.webp 960w, ./assets/site/home-banner-3-1600.webp 1600w, ./assets/site/home-banner-3-2400.webp 2400w", sizes: "(max-width: 1200px) calc(100vw - 32px), 1120px", width: 1600, height: 762, alt: "賽爾號角色與金色星環場景", position: "32% 20%" },
    { src: "./assets/site/home-banner-2-1600.webp", srcset: "./assets/site/home-banner-2-960.webp 960w, ./assets/site/home-banner-2-1600.webp 1600w, ./assets/site/home-banner-2-2400.webp 2400w", sizes: "(max-width: 1200px) calc(100vw - 32px), 1120px", width: 1600, height: 933, alt: "賽爾號紅髮角色與暮色水面", position: "50% 20%" }
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
    let transition = null;
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
            image.loading = "eager";
            image.addEventListener("load", () => { placeholder.hidden = true; });
            image.addEventListener("error", () => {
                image.hidden = true;
                placeholder.hidden = false;
                placeholder.textContent = "圖片無法載入";
            });
            image.decoding = "async";
            image.fetchPriority = index === 0 ? "high" : "auto";
            if (slide.width && slide.height) { image.width = slide.width; image.height = slide.height; }
            if (slide.srcset) { image.sizes = slide.sizes || "100vw"; image.srcset = slide.srcset; }
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
            timer = window.setTimeout(() => show(current + 1), 7000);
        }
    }
    function show(index) {
        const next = (index + slides.length) % slides.length;
        const previous = current;
        const direction = index < current ? 1 : -1;
        transition?.finish();
        current = next;
        panels.forEach((panel, i) => {
            panel.hidden = i !== current;
            panel.setAttribute("aria-hidden", String(i !== current));
            panel.inert = i !== current;
        });
        if (previous !== current && !reducedMotion.matches) {
            const outgoing = panels[previous], incoming = panels[current];
            outgoing.hidden = false;
            const options = { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
            const exit = outgoing.animate([
                { transform: "translateX(0)" },
                { transform: `translateX(${direction * 100}%)` },
            ], options);
            const enter = incoming.animate([
                { transform: `translateX(${-direction * 100}%)` },
                { transform: "translateX(0)" },
            ], options);
            // Finish an interrupted transition before starting the next one.
            const active = {
                finish() {
                    exit.cancel();
                    enter.cancel();
                    outgoing.hidden = true;
                    if (transition === active) transition = null;
                },
            };
            transition = active;
            enter.onfinish = () => active.finish();
        }
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
    reducedMotion.addEventListener("change", () => {
        transition?.finish();
        paused = reducedMotion.matches;
        updatePause();
    });
    if (!slides.length) { carousel.hidden = true; return; }
    carousel.querySelector("[data-carousel-prev]").disabled = slides.length < 2;
    carousel.querySelector("[data-carousel-next]").disabled = slides.length < 2;
    pause.disabled = slides.length < 2;
    show(0);
    updatePause();
}
