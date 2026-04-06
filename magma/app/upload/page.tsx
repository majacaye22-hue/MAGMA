import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  // When Supabase is not configured, render a preview with a placeholder user
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let username = "tú";
  let userId = "preview";

  if (supabaseConfigured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/upload");

    username =
      (user.user_metadata?.username as string) ??
      user.email?.split("@")[0] ??
      "";
    userId = user.id;
  }

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        padding: "48px 24px 80px",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "26px",
            color: "#e8e4dc",
            letterSpacing: "0.03em",
            marginBottom: "6px",
          }}
        >
          subir obra
        </h1>
        <p
          style={{
            fontFamily: "Space Mono",
            fontSize: "12px",
            color: "#888780",
          }}
        >
          publicando como{" "}
          <span style={{ color: "#D85A30" }}>@{username}</span>
        </p>
      </div>

      <UploadForm username={username} userId={userId} />
    </div>
  );
}
