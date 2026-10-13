"use client";

import { useEffect } from "react";

/** Forward invite links that use the app's Site URL (/) to the setup screen. */
export function InviteLinkRedirect() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("type") !== "invite") return;
    if (window.location.pathname === "/auth/accept") return;

    window.location.replace(`/auth/accept${window.location.hash}`);
  }, []);

  return null;
}
