"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it renders its own document and
// cannot rely on globals.css, the fonts or the theme class. Colours follow the
// OS setting instead.
const css = `
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    background: Canvas;
    color: CanvasText;
  }
  main { max-width: 24rem; text-align: center; }
  h1 { font-size: 1.125rem; font-weight: 500; margin: 0 0 0.5rem; }
  p { font-size: 0.875rem; opacity: 0.7; margin: 0 0 1rem; }
  button {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.5rem;
    border: 1px solid CanvasText;
    background: CanvasText;
    color: Canvas;
    cursor: pointer;
  }
`;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <head>
        <title>Terjadi kesalahan · Tarékah</title>
        <style>{css}</style>
      </head>
      <body>
        <main>
          <h1>Terjadi kesalahan</h1>
          <p>Aplikasi gagal dimuat. Coba lagi beberapa saat lagi.</p>
          <button onClick={() => retry()}>Coba lagi</button>
        </main>
      </body>
    </html>
  );
}
