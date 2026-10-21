export type ProjectCoverShape = "horizontal" | "vertical";

// Stored alongside project links in the existing JSON settings payload.
export function projectCoverShape(links: { cover_shape?: string } | null | undefined): ProjectCoverShape {
  return links?.cover_shape === "horizontal" ? "horizontal" : "vertical";
}

export function projectCoverStyle(shape: ProjectCoverShape) {
  return {
    aspectRatio: shape === "horizontal" ? "4 / 3" : "2 / 3",
    width: shape === "horizontal" ? "320px" : "240px",
    maxWidth: "100%",
  };
}
