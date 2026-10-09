"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Puts the `dark` class on <html>, which is what the dark variant in
// globals.css keys on. Follows the OS setting until the user picks a theme.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
