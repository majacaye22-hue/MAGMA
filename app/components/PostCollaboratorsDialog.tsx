"use client";

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CollaborationPanel } from './CollaborationPanel';

export function PostCollaboratorsDialog({ postId, userId, onClose }: {
  postId: string; userId: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return createPortal(<dialog ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => event.stopPropagation()}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border border-white/20 bg-[#141412] p-5 text-[var(--magma-ash)] backdrop:bg-black/75">
    <header className="mb-4 flex items-center justify-between gap-4">
      <h2 id={titleId} className="font-semibold">invitar colaboradores</h2>
      <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm underline">cerrar</button>
    </header>
    <CollaborationPanel kind="post" targetId={postId} ownerId={userId} userId={userId} ownerInviteMode="expanded" />
  </dialog>, document.body);
}
