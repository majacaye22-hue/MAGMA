export type IconName = 'explorar' | 'mi círculo' | 'todo' | 'música' | 'fotografía' | 'video' | 'letras' | 'colaboración' | 'editar' | 'arte' | 'evento';

export function FeedMenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    arte: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
    evento: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18M8 16h2M14 16h2" /></>,
    explorar: <><circle cx="6" cy="16" r="4" /><circle cx="18" cy="16" r="4" /><path d="m2.3 14.5 3-9A2 2 0 0 1 7.2 4H8a2 2 0 0 1 2 2v10m11.7-1.5-3-9A2 2 0 0 0 16.8 4H16a2 2 0 0 0-2 2v10M10 9h4M10 14h4" /></>,
    'mi círculo': <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" /></>,
    todo: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    música: <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></>,
    fotografía: <><path d="M8 5 10 3h4l2 2h5v15H3V5Z" /><circle cx="12" cy="12" r="4" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    letras: <><path d="M5 4h14M12 4v16M8 20h8" /></>,
    colaboración: <><path d="m10 14 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 10a4.2 4.2 0 0 0 6 0l4-4a4.2 4.2 0 0 0-6-6l-1 1" /></>,
    editar: <><path d="m4 16 12-12 4 4L8 20H4Zm10-10 4 4" /></>,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="magma-feed-icon">{paths[name]}</svg>;
}
