export interface TicketOption {
    ticket_option_id?: string;
    name: string;
    description?: string | null;
    price: number;
    quantity_limit?: number | null;
    sort_order: number;
}

export interface EventLocation {
    location_id: string;
    city?: string | null;
    street?: string;
    house_number?: string;
    postal_code?: string;
    country?: string;
    type?: string;
}

export interface EventListItem {
    event_id: string;
    title: string;
    starts_at: string;
    ends_at?: string;
    description?: string;
    category?: string;
    max_capacity?: number;
    is_public: boolean;
    is_free: boolean;
    status: string;
    image_url?: string;
    location?: EventLocation;
    participant_count: number;
    is_host?: boolean;
}

export interface EventListResponse {
    events: EventListItem[];
    count: number;
}

export interface EventDetailResponse extends EventListItem {
    invitation_link?: string;
    created_at?: string;
    updated_at?: string;
    host_name?: string;
    media_urls: string[];
    ticket_options: TicketOption[];
}

export interface LocationCreate {
    city?: string;
    street?: string;
    house_number?: string;
    postal_code?: string;
    country?: string;
    type?: string;
    description?: string;
}

export interface EventCreateRequest {
    title: string;
    starts_at: string;
    ends_at?: string;
    description?: string;
    category?: string;
    max_capacity?: number;
    is_public: boolean;
    is_free?: boolean;
    status?: string;
    location: LocationCreate;
}

export interface EventUpdateRequest {
    title?: string;
    starts_at?: string;
    ends_at?: string | null;
    description?: string | null;
    category?: string | null;
    max_capacity?: number | null;
    is_public?: boolean;
    is_free?: boolean;
    status?: string;
    location?: Partial<LocationCreate>;
}
