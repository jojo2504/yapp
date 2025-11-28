// User types (from user.go)

import type { BaseModel } from '../types/base';
import type { UserRole } from '../types/enums.ts';
export interface User extends BaseModel {
    name: string;
    email: string;
    role: UserRole;
    organisation_id: number;
    avatar_url?: string;
    is_active: boolean;
    email_verified: boolean;
    avatar?: string;
}
export function GetUserInitials(user: User): string {
    if (!user || !user.name) return "";

    const parts = user.name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}