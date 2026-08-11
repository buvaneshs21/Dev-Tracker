export const THEME_STORAGE_KEY = "devtrack-theme";

/**
 * Runs in <head> before first paint.
 *
 * Without it the page would render light and then repaint dark once React
 * hydrates — the classic theme flash. The server stamps the raw *choice*
 * (light/dark/system) on <html>; this resolves "system" against the OS and
 * writes the concrete theme that the CSS variant keys off.
 *
 * localStorage is the fallback for pages rendered without a session, so the
 * login and invitation screens match too.
 */
export const THEME_SCRIPT = `(function(){try{
var r=document.documentElement;
var c=r.dataset.themeChoice||localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"system";
localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)},c);
r.dataset.theme=c==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):c;
}catch(e){}})();`;

/** Applies a choice to the DOM immediately, without waiting for a round trip. */
export function applyTheme(choice: "light" | "dark" | "system"): void {
  const root = document.documentElement;
  root.dataset.themeChoice = choice;

  const resolved =
    choice === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : choice;

  root.dataset.theme = resolved;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private browsing can refuse storage; the server preference still holds.
  }
}
