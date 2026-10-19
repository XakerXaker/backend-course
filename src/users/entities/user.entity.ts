export class UserEntity {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  createdAt: Date;
  membershipId?: string | null;
}
