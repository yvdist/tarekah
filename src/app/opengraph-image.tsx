import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  MARK_RISE,
  MARK_STEM,
  MARK_STROKE_WIDTH,
  MARK_VIEW_BOX,
} from "@/components/brand/mark-paths";
import { CLOUD } from "@/components/brand/mega-mendung";

export const alt =
  "Tarékah: setiap lamaran adalah satu léngkah. Catatan lamaran kerja yang tenang dan rapi.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The palette as hex: this renders outside the page, without the stylesheet.
const KERTAS = "#faf7f0";
const TINTA = "#1c1a17";
const TINTA_REDUP = "#6b665c";
const NILA = "#4a43b0";
const KUNYIT = "#e0a021";

const FONTS = join(process.cwd(), "src/assets/fonts");
const [semiBold, bold] = await Promise.all([
  readFile(join(FONTS, "Fraunces144ptSuperSoft-SemiBold.ttf")),
  readFile(join(FONTS, "Fraunces144ptSuperSoft-Bold.ttf")),
]);

// The same "e" as the wordmark: a plain letter under the rising stroke.
function AccentE() {
  return (
    <div style={{ display: "flex", position: "relative" }}>
      e
      <div
        style={{
          position: "absolute",
          top: "0.25em",
          left: "0.23em",
          width: "0.22em",
          height: "0.05em",
          borderRadius: "1em",
          background: KUNYIT,
          transform: "rotate(-20deg)",
        }}
      />
    </div>
  );
}

const CLOUD_LAYERS = [1, 0.8, 0.6];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: KERTAS,
        color: TINTA,
        fontFamily: "Fraunces",
        position: "relative",
      }}
    >
      {/* Mega mendung in kunyit lines, like prada on batik. */}
      <svg
        viewBox="0 0 240 112"
        width="620"
        height="289"
        fill="none"
        stroke={KUNYIT}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ position: "absolute", right: -130, top: 48 }}
      >
        {CLOUD_LAYERS.map((scale) => (
          <path
            key={scale}
            d={CLOUD}
            strokeWidth={0.8 / scale}
            transform={`translate(${120 * (1 - scale)} ${104 * (1 - scale)}) scale(${scale})`}
          />
        ))}
        <rect x="84" y="82" width="72" height="14" rx="7" strokeWidth="0.8" />
      </svg>

      <div style={{ display: "flex", alignItems: "center", color: NILA }}>
        <svg
          viewBox={MARK_VIEW_BOX}
          width="60"
          height="60"
          fill="none"
          strokeWidth={MARK_STROKE_WIDTH}
          strokeLinecap="round"
        >
          <path d={MARK_STEM} stroke={NILA} />
          <path d={MARK_RISE} stroke={KUNYIT} />
        </svg>
        <div
          style={{
            display: "flex",
            marginLeft: 22,
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: "-0.025em",
          }}
        >
          tar
          <AccentE />
          kah
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 100,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
          }}
        >
          <div style={{ display: "flex" }}>Setiap lamaran</div>
          <div style={{ display: "flex" }}>
            adalah satu l
            <AccentE />
            ngkah.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            fontWeight: 600,
            color: TINTA_REDUP,
          }}
        >
          Catatan lamaran kerja yang tenang, rapi, dan tanpa menghakimi.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: semiBold, style: "normal", weight: 600 },
        { name: "Fraunces", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
