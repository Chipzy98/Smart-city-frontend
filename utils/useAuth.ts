"use client";

import { useState } from "react";

export function useAuth() {
  const [token] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("token");
  });

  return token;
}