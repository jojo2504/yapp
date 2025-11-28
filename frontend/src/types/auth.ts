// Auth types (requests & responses)

import { User } from './user';

// Request DTOs
export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    organisation_id: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

// Response DTO
export interface AuthResponse {
    user: User;
    access_token: string;
    refresh_token: string;
    expires_in: number;
}
