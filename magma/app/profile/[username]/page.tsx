import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileHeader, {
  ActivitySidebar,
  CollaboratorsSidebar,
  EventsSidebar,
} from "@/components/profile/ProfileHeader";
import WorksGrid from "@/components/profile/WorksGrid";
import { getProfile, getUserCards } from "@/lib/data";

interface ProfilePageProps {
  params: { username: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = params;
  const profile = getProfile(username);
  const works = getUserCards(username);

  // Deterministic seed from username for banner + avatar
  const seed = username.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "64px" }}>
      {/* Banner */}
      <ProfileBanner seed={seed} height={180} />

      {/* Header: avatar, name, bio, tags, stats */}
      <ProfileHeader profile={profile} />

      {/* Main content + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 272px",
          gap: "32px",
          padding: "0 32px",
          alignItems: "start",
        }}
      >
        {/* Works grid — real cards from feed data */}
        <WorksGrid cards={works} />

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <ActivitySidebar items={profile.recentActivity} />
          <CollaboratorsSidebar items={profile.collaborators} />
          <EventsSidebar items={profile.upcomingEvents} />
        </aside>
      </div>
    </div>
  );
}
