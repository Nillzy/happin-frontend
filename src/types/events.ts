export interface EventLocation {
    location_id: number;
    city: string;
    street?: string;
    house_number?: string;
    postal_code?: string;
    country?: string;
    type?: string;
}

export interface EventListItem {
    event_id: number;
    title: string;
    starts_at: string;
    ends_at?: string;
    description?: string;
    category?: string;
    max_capacity?: number;
    is_public: boolean;
    image_url?: string;
    location?: EventLocation;
    participant_count: number;
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
}

export interface LocationCreate {
    city: string;
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
    location: LocationCreate;
}
