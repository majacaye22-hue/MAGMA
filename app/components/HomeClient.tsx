"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Post } from "./card-art";
import { eventMedia } from '@/lib/event-media';

const mono = "var(--font-space-mono), monospace";

function salaIsOpen(post: Post) {
  if (!post.event_date) return false;
  const now = Date.now();
  const eventTime = new Date(post.event_date).getTime();
  return now >= eventTime - 48 * 60 * 60 * 1000 && now <= eventTime + 72 * 60 * 60 * 1000;
}

function isFutureEvent(post: Post) {
  return Boolean(post.event_date && new Date(post.event_date).getTime() > Date.now());
}

function formatEventDate(date: string | null) {
  if (!date) return "fecha por anunciar";
  return new Date(date).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function sortEvents(a: Post, b: Post) {
  if (salaIsOpen(a) !== salaIsOpen(b)) return salaIsOpen(a) ? -1 : 1;
  if (!a.event_date || !b.event_date) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
}

export function HomeFlyers() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/home", { cache: "no-store" });
      if (!response.ok) { setPosts([]); return; }
      const data = await response.json() as { posts: Post[]; comments: { post_id: string }[] };
      const counts = new Map<string, number>();
      for (const comment of data.comments) counts.set(comment.post_id, (counts.get(comment.post_id) ?? 0) + 1);
      setCommentCounts(counts);
      setPosts(data.posts);
    }
    void load();
  }, []);

  if (posts === null) return <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "30px 0" }}>pegando carteles...</p>;
  const flyers = posts.filter((post) => post.type === "evento" && Boolean(eventMedia(post).poster));
  const currentFlyers = flyers.filter((post) => salaIsOpen(post) || isFutureEvent(post));
  const totalSignals = flyers.reduce((sum, post) => sum + post.upvotes + (commentCounts.get(post.id) ?? 0), 0);
  const sortedFlyers = [...flyers].sort(totalSignals >= 6 ? (a, b) => (b.upvotes + (commentCounts.get(b.id) ?? 0)) - (a.upvotes + (commentCounts.get(a.id) ?? 0)) || sortEvents(a, b) : sortEvents);
  const posters = [...currentFlyers, ...sortedFlyers.filter((post) => !currentFlyers.some((current) => current.id === post.id))].slice(0, 6);

  if (posters.length === 0) return <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "30px 0" }}>la barda todavía espera su primer cartel</p>;
  return <div className="grid gap-3 sm:grid-cols-3">{posters.map((post, index) => <Link key={post.id} href={`/post/${post.id}`} className="group block" style={{ color: "inherit", textDecoration: "none", transform: `rotate(${[-0.5, 0.35, -0.2][index]}deg)` }}><article style={{ background: "#141412", border: "0.5px solid #2a2a28", overflow: "hidden", height: "100%" }}><img src={eventMedia(post).poster!} alt={post.title ?? "Cartel de evento"} style={{ display: "block", width: "100%", aspectRatio: "0.76", objectFit: "cover" }} /><div style={{ padding: "12px" }}>{salaIsOpen(post) && <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", marginBottom: "7px", textTransform: "uppercase" }}>● sala abierta</p>}<h3 style={{ color: "#F2F4F8", fontFamily: "var(--font-syne), sans-serif", fontSize: "17px", fontWeight: 800, lineHeight: 1.05, marginBottom: "7px" }}>{post.title ?? "sin título"}</h3><p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.5 }}>{formatEventDate(post.event_date)}</p>{totalSignals >= 6 && <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "7px" }}>↑ {post.upvotes + (commentCounts.get(post.id) ?? 0)} señales</p>}</div></article></Link>)}</div>;
}
