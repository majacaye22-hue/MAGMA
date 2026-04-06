import FeedGrid from "@/components/FeedGrid";
import { FEED } from "@/lib/data";

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px 48px",
      }}
    >
      <div
        style={{
          marginBottom: "28px",
          paddingBottom: "20px",
          borderBottom: "1px solid #2a2a28",
        }}
      >
        <h1
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "13px",
            color: "#888780",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Feed
        </h1>
      </div>

      <FeedGrid cards={FEED} />
    </div>
  );
}
