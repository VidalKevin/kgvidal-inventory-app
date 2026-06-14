"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function StickyTableSync() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const sync = () => {
      const toolbar = main.querySelector(".sticky-page-toolbar") as HTMLElement | null;
      if (!toolbar) return;
      main.style.setProperty("--sticky-table-top", `${toolbar.offsetHeight}px`);
    };

    // Measure after paint so the toolbar is fully rendered
    const raf = requestAnimationFrame(sync);

    const resizeObserver = new ResizeObserver(sync);
    const toolbar = main.querySelector(".sticky-page-toolbar");
    if (toolbar) resizeObserver.observe(toolbar);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      main.style.removeProperty("--sticky-table-top");
    };
  }, [pathname]);

  return null;
}
