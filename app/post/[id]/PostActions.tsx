"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

export function PostActions({ postId, postAuthorId }: { postId: string; postAuthorId: string | null }) {
  const router = useRouter();
  const [isAuthor, setIsAuthor] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthor(!!session?.user && session.user.id === postAuthorId);
    });
    return () => subscription.unsubscribe();
  }, [postAuthorId]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const supabase = getSupabaseClient();

    // Delete comments first to avoid FK constraint violations
    const { error: commentsError } = await supabase
      .from("comments")
      .delete()
      .eq("post_id", postId);

    if (commentsError) {
      console.error("[delete] comments error:", commentsError);
      setDeleteError(`comments: ${commentsError.message} (${commentsError.code})`);
      setDeleting(false);
      return;
    }

    const { error: postError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (postError) {
      console.error("[delete] post error:", postError);
      setDeleteError(`post: ${postError.message} (${postError.code})`);
      setDeleting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!isAuthor) return null;

  return (
    <div className="flex flex-col gap-2" style={{ marginBottom: "24px" }}>
      <div className="flex items-center gap-4">
        <Link
          href={`/post/${postId}/edit`}
          style={{
            fontSize: "10px",
            color: "#888780",
            fontFamily: mono,
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            border: "0.5px solid #2a2a28",
            padding: "3px 10px",
          }}
          className="hover:opacity-70"
        >
          editar
        </Link>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="cursor-pointer hover:opacity-70"
            style={{
              fontSize: "10px",
              color: "#5F5E5A",
              fontFamily: mono,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            eliminar
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>
              ¿eliminar esta publicación?
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="cursor-pointer hover:opacity-70 disabled:opacity-40"
              style={{
                fontSize: "10px",
                color: "#D85A30",
                fontFamily: mono,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              {deleting ? "eliminando..." : "sí, eliminar"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="cursor-pointer hover:opacity-70"
              style={{
                fontSize: "10px",
                color: "#444441",
                fontFamily: mono,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              cancelar
            </button>
          </div>
        )}
      </div>

      {deleteError && (
        <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, wordBreak: "break-all" }}>
          error: {deleteError}
        </p>
      )}
    </div>
  );
}
