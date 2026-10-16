// ============================================
// تشخیص دارک مود نیتیو در سایت
// ============================================
function siteAlreadyHasDarkMode() {
  const html = document.documentElement;
  const body = document.body;

  // بررسی color-scheme روی html یا body
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
      if (luminance < 0.3) return true;
    }
  }

  // بررسی تگ meta color-scheme
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta && meta.content.includes("dark")) return true;

  // بررسی media query prefers-color-scheme
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      // این فقط می‌گه سیستم کاربر دارکه، نه اینکه سایت دارک مود داره
      // ولی اگه سایت به این کوئری پاسخ بده، یعنی دارک مود داره
      // این رو به عنوان یه سیگنال ضعیف در نظر می‌گیریم
      // return true; // غیرفعاله چون ممکنه اشتباه باشه
    }
  } catch (e) {}

  return false;
}

// ============================================
// نمایش نوتیفیکیشن داخل صفحه
// ============================================
function showNativeDarkModeNotification() {
  // اگه قبلاً نمایش داده شده، دوباره نشون نده
  if (document.getElementById("dm-native-notification")) return;
  if (sessionStorage.getItem("dm-native-notified") === "true") return;

  const notification = document.createElement("div");
  notification.id = "dm-native-notification";
  notification.innerHTML = `
    <div class="dm-notif-content">
      <span class="dm-notif-icon">💡</span>
      <div class="dm-notif-text">
        <strong>این سایت دارک مود داخلی داره!</strong>
        <span>می‌تونی از تنظیمات خود سایت هم استفاده کنی.</span>
      </div>
      <button class="dm-notif-close" title="بستن">✕</button>
    </div>
  `;

  document.body.appendChild(notification);

  // دکمه بستن
  notification.querySelector(".dm-notif-close").addEventListener("click", () => {
    notification.classList.add("dm-notif-hide");
    setTimeout(() => notification.remove(), 300);
  });

  // auto-dismiss بعد از ۶ ثانیه
  setTimeout(() => {
    if (document.getElementById("dm-native-notification")) {
      notification.classList.add("dm-notif-hide");
      setTimeout(() => notification.remove(), 300);
    }
  }, 6000);

  // ذخیره تو session که تو همین تب دوباره نشون نده
  sessionStorage.setItem("dm-native-notified", "true");
}

// ============================================
// اعمال/حذف دارک مود
// ============================================
function applyDarkMode(enabled, intensity, sepia, showNotif) {
  const html = document.documentElement;
  const body = document.body;
  const filterVal =
    "invert(1) hue-rotate(180deg) brightness(" +
    (intensity || 100) +
    "%) sepia(" +
    (sepia || 0) +
    "%)";

  if (enabled) {
    // کلاس روی html (برای counter-filter تصاویر)
    html.classList.add("dm-active");

    // فیلتر inline روی html — مطمئن‌ترین روش
    html.style.setProperty("filter", filterVal, "important");
    html.style.setProperty("-webkit-filter", filterVal, "important");
    html.style.setProperty("background-color", "#ffffff", "important");

    // روی body هم بذار به عنوان backup
    if (body) {
      body.style.setProperty("background-color", "#ffffff", "important");
      body.style.setProperty("min-height", "100vh", "important");
    }

    // متغیرها هم برای CSS
    html.style.setProperty("--dm-intensity", (intensity || 100) + "%");
    html.style.setProperty("--dm-sepia", (sepia || 0) + "%");

    if (showNotif && siteAlreadyHasDarkMode()) {
      showNotification();
    }
  } else {
    html.classList.remove("dm-active");

    html.style.removeProperty("filter");
    html.style.removeProperty("-webkit-filter");
    html.style.removeProperty("background-color");
    html.style.removeProperty("--dm-intensity");
    html.style.removeProperty("--dm-sepia");

    if (body) {
      body.style.removeProperty("background-color");
      body.style.removeProperty("min-height");
    }

    const notif = document.getElementById("dm-native-notification");
    if (notif && notif.parentNode) notif.parentNode.removeChild(notif);
  }
}

// ============================================
// خواندن تنظیمات از storage
// ============================================
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

      applyDarkMode(settings.enabled, settings.intensity, settings.sepia, true);
    }
  );
}

// ============================================
// فقط یک بار listener ست کن
// ============================================
if (!window.__darkModeListenerAttached) {
  window.__darkModeListenerAttached = true;

  chrome.storage.onChanged.addListener(() => {
    loadSettings();
  });

  // پیام از popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "toggle") {
      loadSettings();
    }
    if (msg.action === "checkNativeDark") {
      sendResponse({ hasNativeDark: siteAlreadyHasDarkMode() });
    }
    if (msg.action === "forceNotify") {
      showNativeDarkModeNotification();
    }
    return true;
  });
}

// اجرا
loadSettings();
window.addEventListener("DOMContentLoaded", loadSettings);
