import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, AuthResponse, AuthTokenResponsePassword, User, Session } from '@supabase/supabase-js';
import {
  sendOtp,
  verifyOtp,
  getSession,
  authorize,
  getUserProfile,
  updateDisplayName,
  updateName,
  updateCity,
  fetchCityFromBackend,
  signOut,
  deleteAccount,
  updateEmail,
  getSupabaseClient,
  uploadEventImage,
  uploadProfilePicture,
} from '../supabase';

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js');

// Mock LargeSecureStore
jest.mock('@/src/utils/LargeSecureStore', () => ({
  LargeSecureStore: jest.fn().mockImplementation(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock document and Image for upload tests
global.document = {
  createElement: jest.fn(() => ({
    width: 0,
    height: 0,
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
    })),
    toBlob: jest.fn((callback) => callback(new Blob(['test'], { type: 'image/jpeg' }))),
  })),
} as any;

global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin: string | null = null;
  width = 1920;
  height = 1080;

  set src(value: string) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

const mockSupabaseClient: Partial<SupabaseClient> = {
  auth: {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
  } as any,
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  } as any,
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  (global.fetch as jest.Mock).mockClear();
});

describe('supabase service', () => {
  describe('sendOtp', () => {
    it('should send OTP successfully', async () => {
      const mockSignInWithOtp = mockSupabaseClient.auth!.signInWithOtp as jest.Mock;
      mockSignInWithOtp.mockResolvedValueOnce({ error: null });

      await sendOtp('test@example.com');

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
    });

    it('should throw error when OTP sending fails', async () => {
      const mockSignInWithOtp = mockSupabaseClient.auth!.signInWithOtp as jest.Mock;
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { message: 'Rate limit exceeded' },
      });

      await expect(sendOtp('test@example.com')).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw error for invalid email format', async () => {
      const mockSignInWithOtp = mockSupabaseClient.auth!.signInWithOtp as jest.Mock;
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { message: 'Invalid email' },
      });

      await expect(sendOtp('invalid-email')).rejects.toThrow('Invalid email');
    });

    it('should throw error on network timeout', async () => {
      const mockSignInWithOtp = mockSupabaseClient.auth!.signInWithOtp as jest.Mock;
      mockSignInWithOtp.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(sendOtp('test@example.com')).rejects.toThrow('Network timeout');
    });

    it('should throw error on 500 server error', async () => {
      const mockSignInWithOtp = mockSupabaseClient.auth!.signInWithOtp as jest.Mock;
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { message: 'Internal server error' },
      });

      await expect(sendOtp('test@example.com')).rejects.toThrow('Internal server error');
    });
  });

  describe('verifyOtp', () => {
    const mockSession: Session = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: {} as User,
    };

    it('should verify OTP and return access token', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const token = await verifyOtp('test@example.com', '123456');

      expect(token).toBe('test-access-token');
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
    });

    it('should throw error when OTP is invalid', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid or expired OTP' },
      });

      await expect(verifyOtp('test@example.com', '000000')).rejects.toThrow('Invalid or expired OTP');
    });

    it('should throw error when no session is returned', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(verifyOtp('test@example.com', '123456')).rejects.toThrow('No session returned');
    });

    it('should throw error when session has no access_token', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockResolvedValueOnce({
        data: { session: { access_token: null } },
        error: null,
      });

      await expect(verifyOtp('test@example.com', '123456')).rejects.toThrow('No session returned');
    });

    it('should throw error on network failure', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockRejectedValueOnce(new Error('Network error'));

      await expect(verifyOtp('test@example.com', '123456')).rejects.toThrow('Network error');
    });

    it('should throw error on 401 unauthorized', async () => {
      const mockVerifyOtp = mockSupabaseClient.auth!.verifyOtp as jest.Mock;
      mockVerifyOtp.mockResolvedValueOnce({
        data: {},
        error: { message: 'Unauthorized' },
      });

      await expect(verifyOtp('test@example.com', '123456')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getSession', () => {
    it('should return access token when session exists', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-token',
          },
        },
      });

      const token = await getSession();

      expect(token).toBe('valid-token');
    });

    it('should return null when no session exists', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const token = await getSession();

      expect(token).toBeNull();
    });

    it('should return null when session has no access_token', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: { access_token: null },
        },
      });

      const token = await getSession();

      expect(token).toBeNull();
    });
  });

  describe('authorize', () => {
    it('should return true when user is authorized', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'valid-token' } },
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await authorize();

      expect(result).toBe(true);
      expect(mockGetUser).toHaveBeenCalledWith('valid-token');
    });

    it('should return false when no session exists', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const result = await authorize();

      expect(result).toBe(false);
    });

    it('should return false when getUser returns error', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'invalid-token' } },
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const result = await authorize();

      expect(result).toBe(false);
    });

    it('should return false when user is null', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'valid-token' } },
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await authorize();

      expect(result).toBe(false);
    });
  });

  describe('getUserProfile', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        display_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
      },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01',
    };

    it('should return user profile with avatar from backend', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;

      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ avatar_url: 'https://example.com/avatar.jpg' }),
      });

      const profile = await getUserProfile();

      expect(profile).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should return profile without avatar when backend fails', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;

      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const profile = await getUserProfile();

      expect(profile?.avatarUrl).toBeNull();
    });

    it('should return null when getUser returns error', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const profile = await getUserProfile();

      expect(profile).toBeNull();
    });

    it('should return null when user is null', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const profile = await getUserProfile();

      expect(profile).toBeNull();
    });

    it('should handle missing user metadata gracefully', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {},
          },
        },
        error: null,
      });

      const profile = await getUserProfile();

      expect(profile).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      });
    });

    it('should handle network timeout when fetching avatar', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;

      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const profile = await getUserProfile();

      expect(profile?.avatarUrl).toBeNull();
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name successfully', async () => {
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      await updateDisplayName('New Name');

      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { display_name: 'New Name' },
      });
    });

    it('should throw error when update fails', async () => {
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      await expect(updateDisplayName('New Name')).rejects.toThrow('Update failed');
    });

    it('should throw error on 401 unauthorized', async () => {
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Unauthorized' },
      });

      await expect(updateDisplayName('New Name')).rejects.toThrow('Unauthorized');
    });

    it('should throw error on network failure', async () => {
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;
      mockUpdateUser.mockRejectedValueOnce(new Error('Network error'));

      await expect(updateDisplayName('New Name')).rejects.toThrow('Network error');
    });
  });

  describe('updateName', () => {
    it('should update first and last name successfully', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockUpdateUser.mockResolvedValueOnce({ error: null });

      await updateName('John', 'Doe');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/users/me/name',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({ first_name: 'John', last_name: 'Doe' }),
        })
      );

      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { first_name: 'John', last_name: 'Doe' },
      });
    });

    it('should throw error when not authenticated', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(updateName('John', 'Doe')).rejects.toThrow('Not authenticated');
    });

    it('should throw error when backend update fails', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(updateName('John', 'Doe')).rejects.toThrow('Update failed: 500');
    });

    it('should throw error when Supabase update fails', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Supabase update failed' },
      });

      await expect(updateName('John', 'Doe')).rejects.toThrow('Supabase update failed');
    });

    it('should throw error on 403 forbidden', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(updateName('John', 'Doe')).rejects.toThrow('Update failed: 403');
    });
  });

  describe('updateCity', () => {
    it('should update city successfully', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await updateCity('Berlin');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/users/me/city',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({ city: 'Berlin' }),
        })
      );
    });

    it('should return silently when not authenticated', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      await updateCity('Berlin');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not throw error on backend failure', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(updateCity('Berlin')).resolves.not.toThrow();
    });

    it('should throw error on network failure', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(updateCity('Berlin')).rejects.toThrow('Network error');
    });
  });

  describe('fetchCityFromBackend', () => {
    it('should fetch city successfully', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ city: 'Munich' }),
      });

      const city = await fetchCityFromBackend();

      expect(city).toBe('Munich');
    });

    it('should return empty string when not authenticated', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const city = await fetchCityFromBackend();

      expect(city).toBe('');
    });

    it('should return empty string when backend returns error', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const city = await fetchCityFromBackend();

      expect(city).toBe('');
    });

    it('should return empty string when city is null', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ city: null }),
      });

      const city = await fetchCityFromBackend();

      expect(city).toBe('');
    });

    it('should throw error on network failure', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(fetchCityFromBackend()).rejects.toThrow('Network timeout');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const mockSignOut = mockSupabaseClient.auth!.signOut as jest.Mock;
      mockSignOut.mockResolvedValueOnce({ error: null });

      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const mockSignOut = mockSupabaseClient.auth!.signOut as jest.Mock;
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });

    it('should throw error on network failure', async () => {
      const mockSignOut = mockSupabaseClient.auth!.signOut as jest.Mock;
      mockSignOut.mockRejectedValueOnce(new Error('Network error'));

      await expect(signOut()).rejects.toThrow('Network error');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockSignOut = mockSupabaseClient.auth!.signOut as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockSignOut.mockResolvedValueOnce({ error: null });

      await deleteAccount();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/users/me',
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer test-token' },
        })
      );
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(deleteAccount()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when backend delete fails', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(deleteAccount()).rejects.toThrow('Delete failed: 500');
    });

    it('should throw error on 403 forbidden', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(deleteAccount()).rejects.toThrow('Delete failed: 403');
    });

    it('should throw error on network failure', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(deleteAccount()).rejects.toThrow('Network timeout');
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockUpdateUser.mockResolvedValueOnce({ error: null });

      await updateEmail('new@example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/users/check-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com' }),
        })
      );

      expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    });

    it('should throw error when not authenticated', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(updateEmail('new@example.com')).rejects.toThrow('Not authenticated');
    });

    it('should throw specific error when email already in use', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
      });

      await expect(updateEmail('existing@example.com')).rejects.toThrow('email_already_in_use');
    });

    it('should throw error when email check fails', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(updateEmail('new@example.com')).rejects.toThrow('Fehler bei der Überprüfung der E-Mail-Adresse.');
    });

    it('should throw error when Supabase update fails', async () => {
      const mockGetSession = mockSupabaseClient.auth!.getSession as jest.Mock;
      const mockUpdateUser = mockSupabaseClient.auth!.updateUser as jest.Mock;

      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      await expect(updateEmail('new@example.com')).rejects.toThrow('Update failed');
    });
  });

  describe('getSupabaseClient', () => {
    it('should return Supabase client singleton', () => {
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      expect(client1).toBe(client2);
      expect(client1).toBe(mockSupabaseClient);
    });
  });

  describe('uploadEventImage', () => {
    it('should upload event image successfully on native', async () => {
      // Mock native environment (no document)
      const originalDocument = global.document;
      (global as any).document = undefined;

      // Mock fetch for image blob
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
      });

      const mockUpload = jest.fn().mockResolvedValueOnce({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValueOnce({
        data: { publicUrl: 'https://storage.supabase.co/event-images/covers/test.jpg' },
      });

      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      };

      (mockSupabaseClient.storage!.from as jest.Mock).mockReturnValue(mockStorage);

      const url = await uploadEventImage('file:///path/to/image.jpg');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^covers\/\d+-[a-z0-9]+\.jpg$/),
        expect.any(Blob),
        { contentType: 'image/jpeg', upsert: true }
      );
      expect(url).toBe('https://storage.supabase.co/event-images/covers/test.jpg');

      global.document = originalDocument;
    });

    it('should throw error when upload fails', async () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
      });

      const mockUpload = jest.fn().mockResolvedValueOnce({
        error: { message: 'Upload failed' },
      });

      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      };

      (mockSupabaseClient.storage!.from as jest.Mock).mockReturnValue(mockStorage);

      await expect(uploadEventImage('file:///path/to/image.jpg')).rejects.toThrow('Upload failed: Upload failed');

      global.document = originalDocument;
    });

    it('should throw error on network failure when fetching blob', async () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(uploadEventImage('file:///path/to/image.jpg')).rejects.toThrow('Network timeout');

      global.document = originalDocument;
    });
  });

  describe('uploadProfilePicture', () => {
    it('should upload profile picture successfully', async () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
      });

      const mockUpload = jest.fn().mockResolvedValueOnce({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValueOnce({
        data: { publicUrl: 'https://storage.supabase.co/profile-pictures/user-123/avatar.jpg' },
      });

      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      };

      (mockSupabaseClient.storage!.from as jest.Mock).mockReturnValue(mockStorage);

      const url = await uploadProfilePicture('file:///path/to/image.jpg');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/avatar-\d+\.jpg$/),
        expect.any(Blob),
        { contentType: 'image/jpeg', upsert: true }
      );
      expect(url).toBe('https://storage.supabase.co/profile-pictures/user-123/avatar.jpg');

      global.document = originalDocument;
    });

    it('should throw error when user is not authenticated', async () => {
      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      await expect(uploadProfilePicture('file:///path/to/image.jpg')).rejects.toThrow('Not authenticated');
    });

    it('should throw error when upload fails', async () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
      });

      const mockUpload = jest.fn().mockResolvedValueOnce({
        error: { message: 'Storage quota exceeded' },
      });

      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      };

      (mockSupabaseClient.storage!.from as jest.Mock).mockReturnValue(mockStorage);

      await expect(uploadProfilePicture('file:///path/to/image.jpg')).rejects.toThrow('Upload failed: Storage quota exceeded');

      global.document = originalDocument;
    });

    it('should throw error on network failure when fetching blob', async () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      const mockGetUser = mockSupabaseClient.auth!.getUser as jest.Mock;
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(uploadProfilePicture('file:///path/to/image.jpg')).rejects.toThrow('Network error');

      global.document = originalDocument;
    });
  });
});
