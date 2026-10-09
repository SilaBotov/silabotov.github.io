document.addEventListener("DOMContentLoaded", () => {
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const delay = parseInt(entry.target.dataset.revealDelay || "0", 10);
                        setTimeout(() => entry.target.classList.add("is-visible"), delay);
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "0px 0px -60px 0px", threshold: 0.05 }
        );
        document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));
    } else {
        document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    }

    const currentYear = document.querySelector("[data-current-year]");
    const form = document.querySelector("#lead-form");
    const statusBox = document.querySelector("[data-form-status]");
    const sourceInput = document.querySelector("#lead-source");
    const scrollLinks = document.querySelectorAll("[data-scroll]");

    if (currentYear) {
        currentYear.textContent = String(new Date().getFullYear());
    }

    const cookieNoticeKey = "silabotov_cookie_notice_accepted";
    const showCookieNotice = () => {
        try {
            if (window.localStorage.getItem(cookieNoticeKey) === "1") {
                return;
            }
        } catch (error) {
            // Ignore storage errors and show the notice for the current session.
        }

        const notice = document.createElement("div");
        notice.className = "cookie-notice";
        notice.setAttribute("role", "dialog");
        notice.setAttribute("aria-live", "polite");
        notice.setAttribute("aria-label", "Уведомление об использовании cookie");
        notice.innerHTML = `
            <button class="cookie-notice__close" type="button" aria-label="Закрыть уведомление">×</button>
            <div class="cookie-notice__title">Этот сайт использует cookies</div>
            <p>Мы используем необходимые cookie для корректной работы сайта и форм. Подробнее — в <a href="/cookie/">политике cookie</a>.</p>
            <button class="cookie-notice__button" type="button">Понятно</button>
        `;

        const acceptNotice = () => {
            try {
                window.localStorage.setItem(cookieNoticeKey, "1");
            } catch (error) {
                // Storage can be unavailable in private modes.
            }
            notice.remove();
        };

        notice.querySelector(".cookie-notice__close")?.addEventListener("click", acceptNotice);
        notice.querySelector(".cookie-notice__button")?.addEventListener("click", acceptNotice);
        document.body.appendChild(notice);
    };

    showCookieNotice();

    scrollLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (!href || !href.startsWith("#")) {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", href);
        });
    });

    const buildSourceValue = () => {
        const params = new URLSearchParams(window.location.search);
        let referrer = "direct";
        const sourceParts = [];

        if (document.referrer) {
            try {
                referrer = new URL(document.referrer).hostname || "direct";
            } catch (error) {
                referrer = "direct";
            }
        }

        sourceParts.push(`page=${window.location.pathname || "/"}`);
        sourceParts.push(`ref=${referrer}`);

        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
            if (params.has(key)) {
                sourceParts.push(`${key}=${params.get(key)}`);
            }
        });

        return sourceParts.join("; ");
    };

    const setStatus = (message, kind) => {
        if (!statusBox) {
            return;
        }

        statusBox.textContent = message;
        statusBox.classList.remove("is-success", "is-error");

        if (kind === "success" || kind === "error") {
            statusBox.classList.add(`is-${kind}`);
        }
    };

    if (sourceInput) {
        sourceInput.value = buildSourceValue();
    }

    if (!form || !window.fetch) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);

        if (sourceInput) {
            formData.set("source", buildSourceValue());
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText = submitButton.textContent;
            submitButton.textContent = "Отправляем...";
        }

        setStatus("Проверяем данные и отправляем заявку...", "");

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            const payload = await response.json();

            if (!response.ok || !payload.ok) {
                throw new Error(payload.message || "Не удалось отправить заявку.");
            }

            form.reset();
            if (sourceInput) {
                sourceInput.value = buildSourceValue();
            }

            setStatus(payload.message || "Заявка отправлена. Мы скоро свяжемся с вами.", "success");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ошибка отправки. Попробуйте ещё раз.";
            setStatus(message, "error");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.originalText || "Отправить заявку";
            }
        }
    });
});
