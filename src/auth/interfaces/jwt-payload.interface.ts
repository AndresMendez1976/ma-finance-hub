export interface JwtPayload {
  sub: string;
  tenant_id: number;
  roles: string[];
  jti: string;
  iss: string;
  iat: number;
  exp: number;
}
