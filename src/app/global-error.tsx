"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it renders its own document and
// cannot rely on globals.css, the fonts or the theme class. The palette is
// repeated here by value and follows the OS setting; a system serif stands in
// for Fraunces.
const css = `
  :root {
    color-scheme: light dark;
    --kertas: #faf7f0;
    --permukaan: #ffffff;
    --tinta: #1c1a17;
    --tinta-redup: #6b665c;
    --garis: #e7e1d5;
    --nila: #4a43b0;
    --di-atas-nila: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --kertas: #14131f;
      --permukaan: #1d1c2b;
      --tinta: #edeae3;
      --tinta-redup: #a29e95;
      --garis: #2f2d44;
      --nila: #8f88e6;
      --di-atas-nila: #14131f;
    }
  }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;
    font-family: system-ui, sans-serif;
    background: var(--kertas);
    color: var(--tinta);
  }
  main {
    width: 100%;
    max-width: 28rem;
    box-sizing: border-box;
    padding: 3.5rem 1.5rem;
    text-align: center;
    background: var(--permukaan);
    border: 1px solid var(--garis);
    border-radius: 0.625rem;
  }
  h1 {
    font-family: ui-serif, Georgia, serif;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.015em;
    margin: 0 0 0.75rem;
  }
  p { font-size: 0.875rem; color: var(--tinta-redup); margin: 0 0 1.25rem; }
  button {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    height: 2.25rem;
    padding: 0 0.875rem;
    border-radius: 0.5rem;
    border: 0;
    background: var(--nila);
    color: var(--di-atas-nila);
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid var(--nila); outline-offset: 2px; }
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
