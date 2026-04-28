"use client";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  links: { spotify?: string; instagram?: string; website?: string } | null;
};

function SpotifyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const links = project.links ?? {};

  function navigate() {
    window.location.href = "/proyecto/" + project.id;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(); }}
      style={{
        display: "block",
        cursor: "pointer",
        backgroundColor: "#141412",
        border: "0.5px solid #2a2a28",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
      className="hover:border-[#D85A30] group"
    >
      {/* Cover */}
      <div style={{ height: "140px", backgroundColor: "#1a1a18", position: "relative", overflow: "hidden" }}>
        {project.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover_image_url}
            alt={project.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "32px", color: "#2a2a28", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
              {project.title.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.title}
        </p>
        {project.description && (
          <p style={{
            fontSize: "10px",
            color: "#5F5E5A",
            fontFamily: mono,
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: "10px",
          }}>
            {project.description}
          </p>
        )}

        {/* Link icons */}
        {(links.spotify || links.instagram || links.website) && (
          <div style={{ display: "flex", gap: "10px", marginTop: project.description ? 0 : "8px" }}>
            {links.spotify && (
              <a
                href={links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#5DCAA5" }}
                className="hover:opacity-70 transition-opacity"
              >
                <SpotifyIcon />
              </a>
            )}
            {links.instagram && (
              <a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#888780" }}
                className="hover:opacity-70 transition-opacity"
              >
                <InstagramIcon />
              </a>
            )}
            {links.website && (
              <a
                href={links.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#888780" }}
                className="hover:opacity-70 transition-opacity"
              >
                <WebIcon />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
