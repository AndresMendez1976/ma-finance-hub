export interface AuthenticatedPrincipal {
  sub: string;
  tenantId: number;
  roles: string[];
  issuer: string;
  jti: string;
  iat: number;
  exp: number;
}
