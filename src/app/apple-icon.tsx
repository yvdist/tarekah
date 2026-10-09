import { ImageResponse } from "next/og";
import {
  MARK_RISE,
  MARK_STEM,
  MARK_STROKE_WIDTH,
  MARK_VIEW_BOX,
} from "@/components/brand/mark-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS fills transparency with black and rounds the corners itself, so the
// mark sits on a full square of kertas.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf7f0",
      }}
    >
      <svg
        viewBox={MARK_VIEW_BOX}
        width="120"
        height="120"
        fill="none"
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
      >
        <path d={MARK_STEM} stroke="#4a43b0" />
        <path d={MARK_RISE} stroke="#e0a021" />
      </svg>
    </div>,
    size,
  );
}
