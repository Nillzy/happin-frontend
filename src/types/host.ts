export interface PersonInfo {
    person_id: string;
    first_name: string;
    last_name?: string;
    phone_number?: string;
}

export interface Participant {
    participation_id: string;
    person: PersonInfo;
    status: 'Accepted' | 'Declined' | 'Pending';
    ticket_count?: number;
    created_at?: string;
    custom_field_responses?: { custom_field_id: string; value: string | string[] }[];
    ticket_responses?: { ticket_id: string; responses: { custom_field_id: string; value: string | string[] }[] }[];
}

export interface ParticipantCounts {
    accepted: number;
    declined: number;
    pending: number;
}

export interface ParticipantListResponse {
    participants: Participant[];
    counts: ParticipantCounts;
}

export interface RemoveParticipantsRequest {
    participation_ids: string[];
}

export interface RemoveParticipantsResponse {
    removed_count: number;
}

export interface ScanTicketResponse {
    valid: boolean;
    reason?: 'already_used' | 'not_found';
    guest_name?: string;
    used_at?: string;
    ticket_number?: number;
    option_name?: string;
}
