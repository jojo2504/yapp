// API types (generic)

export interface ApiError {
    error: string;
    details?: string;
    status: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}
