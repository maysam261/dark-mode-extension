const toggleEl = document.getElementById("toggle");
const intensityEl = document.getElementById("intensity");
const sepiaEl = document.getElementById("sepia");
const intensityVal = document.getElementById("intensityVal");
const sepiaVal = document.getElementById("sepiaVal");
const hostnameEl = document.getElementById("hostname");
const whitelistBtn = document.getElementById("whitelistBtn");
const resetBtn = document.getElementById("resetBtn");
const whitelistItems = document.getElementById("whitelistItems");
const whitelistSection = document.getElementById("whitelistSection");
const nativeWarning = document.getElementById("nativeWarning");
const settingsEl = document.getElementById("settings");

let currentHostname = "";
let currentTabId = null;
let hasNativeDark = false;

// ============================================
// گرفتن اطلاعات تب فعلی
// ============================================
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  currentTabId = tab.id;

  try {
    const url = new URL(tab.url);
    currentHostname = url.hostname;
    hostnameEl.textContent = currentHostname;
  } catch {
    hostnameEl.textContent = "N/A";
    return;
  }

  // بارگذاری تنظیمات
  const settings = await chrome.storage.sync.get({
    enabled: false,
    intensity: 100,
    sepia: 0,
    whitelist: [],
  });

  const isWhitelisted = settings.whitelist.includes(currentHostname);

  toggleEl.checked = settings.enabled && !isWhitelisted;
  intensityEl.value = settings.intensity;
  sepiaEl.value = settings.sepia;
  intensityVal.textContent = settings.intensity + "%";
  sepiaVal.textContent = settings.sepia + "%";

  renderWhitelist(settings.whitelist);

  // بررسی دارک مود نیتیو
  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      action: "checkNativeDark",
    });
    if (res && res.hasNativeDark) {
      hasNativeDark = true;
      nativeWarning.style.display = "block";
    } else {
      nativeWarning.style.display = "none";
    }
  } catch (e) {
    nativeWarning.style.display = "none";
  }
}

// ============================================
// رندر لیست سفید
// ============================================
function renderWhitelist(list) {
  whitelistItems.innerHTML = "";
  if (list.length === 0) {
    whitelistSection.style.display = "none";
    return;
  }
  whitelistSection.style.display = "block";
  list.forEach((host) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${host}</span><button data-host="${host}">✕</button>`;
    whitelistItems.appendChild(li);
  });

  whitelistItems.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const host = e.target.dataset.host;
      const { whitelist } = await chrome.storage.sync.get({ whitelist: [] });
      const newList = whitelist.filter((h) => h !== host);
      await chrome.storage.sync.set({ whitelist: newList });
      renderWhitelist(newList);
      notifyTab();
    });
  });
}

// ============================================
// اطلاع‌رسانی به تب فعلی
// ============================================
async function notifyTab() {
  if (!currentTabId) return;
  chrome.tabs.sendMessage(currentTabId, { action: "toggle" }).catch(() => {});
}

// ============================================
// Toggle اصلی
// ============================================
toggleEl.addEventListener("change", async () => {
  await chrome.storage.sync.set({ enabled: toggleEl.checked });
  notifyTab();

  // اگه فعال شد و سایت نیتیو دارک مود داره، نوتیف رو دوباره نشون بده
  if (toggleEl.checked && hasNativeDark) {
    setTimeout(() => {
      chrome.tabs
        .sendMessage(currentTabId, { action: "forceNotify" })
        .catch(() => {});
    }, 300);
  }
});

// ============================================
// شدت تاریکی
// ============================================
intensityEl.addEventListener("input", () => {
  intensityVal.textContent = intensityEl.value + "%";
  chrome.storage.sync.set({ intensity: Number(intensityEl.value) });
  notifyTab();
});

// ============================================
// گرمی رنگ
// ============================================
sepiaEl.addEventListener("input", () => {
  sepiaVal.textContent = sepiaEl.value + "%";
  chrome.storage.sync.set({ sepia: Number(sepiaEl.value) });
  notifyTab();
});

// ============================================
// افزودن به لیست سفید
// ============================================
whitelistBtn.addEventListener("click", async () => {
  if (!currentHostname) return;
  const { whitelist } = await chrome.storage.sync.get({ whitelist: [] });
  if (!whitelist.includes(currentHostname)) {
    whitelist.push(currentHostname);
    await chrome.storage.sync.set({ whitelist });
    renderWhitelist(whitelist);
    toggleEl.checked = false;
    notifyTab();
  }
});

// ============================================
// ریست
// ============================================
resetBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    enabled: false,
    intensity: 100,
    sepia: 0,
    whitelist: [],
  });
  init();
  notifyTab();
});

init();
