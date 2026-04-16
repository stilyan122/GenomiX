(async function () {
  const culture =
    document.documentElement.lang?.toLowerCase().startsWith("bg") ? "bg" : "en";

  const url = `/i18n/lab.${culture}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return;

  const dict = await res.json();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const text = dict[key];
    if (text == null) return;
    el.textContent = text;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    const text = dict[key];
    if (text == null) return;
    el.setAttribute("placeholder", text);
  });

  document.querySelectorAll("[data-i18n-confirm]").forEach(el => {
    const key = el.getAttribute("data-i18n-confirm");
    if (!key) return;
    const text = dict[key];
    if (text == null) return;
    el.setAttribute("data-confirm-text", text);
  });

  window.gxConfirm = function (el, fallback) {
    const msg = el?.getAttribute?.("data-confirm-text") || fallback || "";
    return window.confirm(msg);
  };
})();