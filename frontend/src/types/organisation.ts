// Organisation types

import { BaseModel } from './base';

export interface Organisation extends BaseModel {
    name: string;
    slug: string;
    logo_url?: string;
}
