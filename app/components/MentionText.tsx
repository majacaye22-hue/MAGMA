import Link from "next/link";
import { mentionParts, profileMentionHref } from "@/lib/mentions";

export function MentionText({ text }: { text: string }) {
  return <>{mentionParts(text).map((part, index) => index % 2 === 1
    ? <Link className="magma-mention-link" key={index} href={profileMentionHref(part.slice(1))}>{part}</Link>
    : part)}</>;
}
