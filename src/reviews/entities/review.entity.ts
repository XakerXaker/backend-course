export class ReviewEntity {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  createdAt: Date;
  authorId?: string | null;
}
