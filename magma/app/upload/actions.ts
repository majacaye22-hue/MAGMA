"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

export async function createPost(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "debes iniciar sesión para publicar" };
  }

  // ── Extract fields ────────────────────────────────────────────────────────
  const type = formData.get("type") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const fileUrl = (formData.get("fileUrl") as string) || null;
  const filePath = (formData.get("filePath") as string) || null;
  const date = (formData.get("date") as string)?.trim() || null;
  const venue = (formData.get("venue") as string)?.trim() || null;

  const validTypes = ["arte", "música", "fotografía", "evento"];
  if (!validTypes.includes(type)) {
    return { status: "error", message: "selecciona un tipo de obra" };
  }
  if (!title) {
    return { status: "error", message: "el título es obligatorio" };
  }

  const username =
    (user.user_metadata?.username as string) ??
    user.email?.split("@")[0] ??
    user.id;

  // ── Insert into posts ─────────────────────────────────────────────────────
  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    username,
    type,
    title,
    description,
    file_url: fileUrl,
    file_path: filePath,
    date,
    venue,
  });

  if (error) {
    console.error("posts insert error:", error);
    return { status: "error", message: error.message };
  }

  redirect(`/profile/${username}`);
}
