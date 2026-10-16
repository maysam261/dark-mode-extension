// بررسی می‌کنه که سایت قبلاً دارک مود داشته یا نه
function siteAlreadyHasDarkMode() {
  const html = document.documentElement;
  const body = document.body;

  // بررسی color-scheme
  const htmlScheme = getComputedStyle(html).colorScheme || "";
  const bodyScheme = body ? getComputedStyle(body).colorScheme || "" : "";
  if (htmlScheme.includes("dark") || bodyScheme.includes("dark")) return true;

  // بررسی رنگ پس‌زمینه body
  if (body) {
    const bg = getComputedStyle(body).backgroundColor;
    const rgb = bg.match(/\d+/g);
    if (rgb) {
      const [r, g, b] = rgb.map(Number);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.3) return true; // پس‌زمینه تیره
    }
  }

  // بررسی وجود تگ meta color-scheme
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta && meta.content.includes("dark")) return true;

  return false;
}

// اعمال/حذف دارک مود
function applyDarkMode(enabled, intensity = 100, sepia = 0) {
  const html = document.documentElement;

  if (enabled && !siteAlreadyHasDarkMode()) {
    html.classList.add("dm-active");
    html.style.setProperty("--dm-intensity", intensity + "%");
    html.style.setProperty("--dm-sepia", sepia + "%");
  } else {
    html.classList.remove("dm-active");
    html.style.removeProperty("--dm-intensity");
    html.style.removeProperty("--dm-sepia");
  }
}

// خواندن تنظیمات از storage
function loadSettings() {
  chrome.storage.sync.get(
    { enabled: false, intensity: 100, sepia: 0, whitelist: [] },
    (settings) => {
      const hostname = location.hostname;
      const isWhitelisted = settings.whitelist.includes(hostname);

      if (isWhitelisted) {
        applyDarkMode(false);
        return;
      }

      applyDarkMode(settings.enabled, settings.intensity, settings.sepia);
    }
  );
}

// فقط یک بار ست کردن listener
if (!window.__darkModeListenerAttached) {
  window.__darkModeListenerAttached = true;

  chrome.storage.onChanged.addListener((changes) => {
    loadSettings();
  });

  // هندل کردن صفحاتی که داینامیک لود می‌شن
  const observer = new MutationObserver(() => {
    // اگه کلاس حذف شده باشه دوباره اعمال کن
    chrome.storage.sync.get(
      { enabled: false, whitelist: [] },
      (settings) => {
        if (
          settings.enabled &&
          !settings.whitelist.includes(location.hostname) &&
          !document.documentElement.classList.contains("dm-active") &&
          !siteAlreadyHasDarkMode()
        ) {
          applyDarkMode(true);
        }
      }
    );
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // پیام از popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "toggle") {
      loadSettings();
    }
    if (msg.action === "checkNativeDark") {
      sendResponse({ hasNativeDark: siteAlreadyHasDarkMode() });
    }
    return true;
  });
}

// اجرا
loadSettings();

// اجرای مجدد بعد از بارگذاری کامل
window.addEventListener("DOMContentLoaded", loadSettings);