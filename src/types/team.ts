export interface Team {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
  excludedUserIds: string[];
  createdAt: string;
}
