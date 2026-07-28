export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  logoDataUrl: string | null;
  teamIds: string[];
  excludedUserIds: string[];
  createdAt: string;
}
