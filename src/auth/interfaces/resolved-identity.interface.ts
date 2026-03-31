export interface ResolvedIdentity {
  user: {
    id: string;
    externalSubject: string;
    displayName: string;
    email: string | null;
  };
  membership: {
    id: string;
    role: string;
    isActive: boolean;
  };
}
