/**
 * Basic tests for types/host
 */

import type {
  PersonInfo,
  Participant,
  ParticipantCounts,
  TicketOptionSummary,
  ParticipantListResponse,
  RemoveParticipantsRequest,
  RemoveParticipantsResponse,
  ScanTicketResponse,
} from '../host';

describe('host types', () => {
  describe('PersonInfo', () => {
    it('should accept minimal person info', () => {
      const person: PersonInfo = {
        person_id: 'person-123',
        first_name: 'John',
      };
      expect(person.person_id).toBe('person-123');
      expect(person.first_name).toBe('John');
    });

    it('should accept person info with all fields', () => {
      const person: PersonInfo = {
        person_id: 'person-456',
        first_name: 'Jane',
        last_name: 'Doe',
        phone_number: '+49123456789',
      };
      expect(person.last_name).toBe('Doe');
      expect(person.phone_number).toBe('+49123456789');
    });
  });

  describe('Participant', () => {
    it('should accept participant with Accepted status', () => {
      const participant: Participant = {
        participation_id: 'part-123',
        person: { person_id: 'p-1', first_name: 'John' },
        status: 'Accepted',
      };
      expect(participant.status).toBe('Accepted');
    });

    it('should accept participant with Declined status', () => {
      const participant: Participant = {
        participation_id: 'part-456',
        person: { person_id: 'p-2', first_name: 'Jane' },
        status: 'Declined',
      };
      expect(participant.status).toBe('Declined');
    });

    it('should accept participant with Pending status', () => {
      const participant: Participant = {
        participation_id: 'part-789',
        person: { person_id: 'p-3', first_name: 'Bob' },
        status: 'Pending',
      };
      expect(participant.status).toBe('Pending');
    });

    it('should accept participant with ticket info', () => {
      const participant: Participant = {
        participation_id: 'part-abc',
        person: { person_id: 'p-4', first_name: 'Alice' },
        status: 'Accepted',
        ticket_count: 2,
        ticket_options_bought: { 'opt-1': 1, 'opt-2': 1 },
      };
      expect(participant.ticket_count).toBe(2);
      expect(participant.ticket_options_bought).toEqual({ 'opt-1': 1, 'opt-2': 1 });
    });
  });

  describe('ParticipantCounts', () => {
    it('should accept counts with all zero', () => {
      const counts: ParticipantCounts = {
        accepted: 0,
        declined: 0,
        pending: 0,
      };
      expect(counts.accepted).toBe(0);
    });

    it('should accept counts with values', () => {
      const counts: ParticipantCounts = {
        accepted: 25,
        declined: 5,
        pending: 10,
      };
      expect(counts.accepted).toBe(25);
      expect(counts.declined).toBe(5);
      expect(counts.pending).toBe(10);
    });
  });

  describe('TicketOptionSummary', () => {
    it('should accept ticket option summary', () => {
      const summary: TicketOptionSummary = {
        name: 'Standard',
        price: 10.50,
        sold: 50,
      };
      expect(summary.name).toBe('Standard');
      expect(summary.price).toBe(10.50);
      expect(summary.sold).toBe(50);
    });

    it('should accept free tickets', () => {
      const summary: TicketOptionSummary = {
        name: 'Free',
        price: 0,
        sold: 100,
      };
      expect(summary.price).toBe(0);
    });
  });

  describe('ParticipantListResponse', () => {
    it('should accept empty response', () => {
      const response: ParticipantListResponse = {
        participants: [],
        counts: { accepted: 0, declined: 0, pending: 0 },
        ticket_option_summary: [],
      };
      expect(response.participants).toHaveLength(0);
    });

    it('should accept full response', () => {
      const response: ParticipantListResponse = {
        participants: [
          {
            participation_id: 'part-1',
            person: { person_id: 'p-1', first_name: 'John' },
            status: 'Accepted',
          },
        ],
        counts: { accepted: 1, declined: 0, pending: 0 },
        ticket_option_summary: [
          { name: 'Standard', price: 10, sold: 1 },
        ],
      };
      expect(response.participants).toHaveLength(1);
      expect(response.counts.accepted).toBe(1);
    });
  });

  describe('RemoveParticipantsRequest', () => {
    it('should accept request with participation IDs', () => {
      const request: RemoveParticipantsRequest = {
        participation_ids: ['part-1', 'part-2', 'part-3'],
      };
      expect(request.participation_ids).toHaveLength(3);
    });

    it('should accept empty request', () => {
      const request: RemoveParticipantsRequest = {
        participation_ids: [],
      };
      expect(request.participation_ids).toHaveLength(0);
    });
  });

  describe('RemoveParticipantsResponse', () => {
    it('should accept response with removed count', () => {
      const response: RemoveParticipantsResponse = {
        removed_count: 5,
      };
      expect(response.removed_count).toBe(5);
    });

    it('should accept zero removed count', () => {
      const response: RemoveParticipantsResponse = {
        removed_count: 0,
      };
      expect(response.removed_count).toBe(0);
    });
  });

  describe('ScanTicketResponse', () => {
    it('should accept valid ticket scan', () => {
      const response: ScanTicketResponse = {
        valid: true,
        guest_name: 'John Doe',
        ticket_number: 42,
        option_name: 'VIP',
      };
      expect(response.valid).toBe(true);
      expect(response.ticket_number).toBe(42);
    });

    it('should accept invalid ticket with reason', () => {
      const response: ScanTicketResponse = {
        valid: false,
        reason: 'already_used',
        used_at: '2026-06-08T10:00:00Z',
      };
      expect(response.valid).toBe(false);
      expect(response.reason).toBe('already_used');
    });

    it('should accept not_found ticket', () => {
      const response: ScanTicketResponse = {
        valid: false,
        reason: 'not_found',
      };
      expect(response.valid).toBe(false);
      expect(response.reason).toBe('not_found');
    });
  });
});
