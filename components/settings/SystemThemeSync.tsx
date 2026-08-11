"use client";

import { useEffect } from "react";

/**
 * Keeps "System" honest: if the OS flips to dark while the app is open, the
 * page should follow without a reload. Only acts while the user's choice is
 * actually "system".
 */
export default function SystemThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      const root = document.documentElement;
      if (root.dataset.themeChoice !== "system") return;
      root.dataset.theme = media.matches ? "dark" : "light";
    };

    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return null;
}
