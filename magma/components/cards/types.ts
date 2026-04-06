export type CardType = "arte" | "música" | "fotografía" | "evento";

export interface FeedCard {
  id: string;
  type: CardType;
  title: string;
  author: string;
  authorInitials: string;
  upvotes: number;
  wide?: boolean; // spans 2 columns in the grid
  seed: number;
  date?: string; // for evento cards
  venue?: string; // for evento cards
}
