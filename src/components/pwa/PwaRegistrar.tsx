"use client";

import { useEffect } from "react";

function shouldRegisterPwa() {
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PWA_TEST === "1";
}

export function PwaRegistrar() {
  useEffect(() => {
    if (!shouldRegisterPwa() || !("serviceWorker" in navigator)) return;

    let active = true;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (active) await registration.update();
      } catch (error) {
        console.error("LifeMate Command Center PWA registration failed", error);
      }
    }

    void register();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
