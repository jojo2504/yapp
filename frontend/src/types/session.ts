// Session types (from session.go)

import { BaseModel } from './base';

export interface Session extends BaseModel {
    user_id: number;
    token: string;
    expires_at: string;
}
