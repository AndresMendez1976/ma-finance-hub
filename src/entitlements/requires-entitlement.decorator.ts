import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_KEY = 'required_entitlement';
export const RequiresEntitlement = (key: string) => SetMetadata(ENTITLEMENT_KEY, key);
