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
    latitude?: number | null;
    longitude?: number | null;
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
    gradient_id?: number | null;
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
    custom_fields?: CustomField[];
    my_rsvp_status?: RsvpStatus | null;
    ticket?: { ticket_id: string; guest_name?: string }[];
    max_tickets_per_person?: number;
}

export type CustomFieldType = 'text' | 'textarea' | 'single_select' | 'multi_select';

export interface CustomField {
    custom_field_id?: string;
    label: string;
    field_type: CustomFieldType;
    is_required: boolean;
    options?: string[] | null;
    sort_order: number;
}

export interface CustomFieldResponseItem {
    custom_field_id: string;
    value: string | string[];
}

export interface TicketResponses {
    ticket_id: string;
    guest_name?: string;
    responses: CustomFieldResponseItem[];
}

export type RsvpStatus = 'Accepted' | 'Declined' | 'Pending';

export interface RsvpResponse {
    event_participation_id: string;
    event_id: string;
    person_id: string;
    status: RsvpStatus;
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
    image_url?: string;
    gradient_id?: number | null;
}

export interface EventUpdateRequest {
    title?: string;
    starts_at?: string;
    ends_at?: string | null;
    description?: string | null;
    category?: string | null;
    max_capacity?: number | null;
    max_tickets_per_person?: number | null;
    is_public?: boolean;
    is_free?: boolean;
    status?: string;
    location?: Partial<LocationCreate>;
    image_url?: string;
    gradient_id?: number | null;
    media_urls?: string[];
}

export interface UserTicket {
    ticket_id: string;
    qr_token: string;
    guest_name?: string;
    ticket_number?: number;
    event_id: string;
    event_title: string;
    starts_at?: string;
    city?: string;
    ticket_option_name: string;
    price: number;
    currency: string;
    status: 'active' | 'used' | 'expired';
    created_at?: string;
    used_at?: string;
}

export interface UserTicketListResponse {
    tickets: UserTicket[];
    total: number;
}
