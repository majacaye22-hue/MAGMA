import type { CSSProperties } from "react";

// Critical dimensions are inline so streamed markup never briefly paints at
// the original image size while route styles are arriving.
export const postMediaStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "var(--post-media-height, max(240px, calc(100svh - 300px)))",
  maxWidth: "100%",
  objectFit: "contain",
};

export const postShellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 800,
  minWidth: 0,
  marginInline: "auto",
};
