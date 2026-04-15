"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

export function PostActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = getSupabaseClient();
    await supabase.from("posts").delete().eq("id", postId);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4" style={{ marginBottom: "24px" }}>
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
  );
}
