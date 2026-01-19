import authReducer, {
  setUser,
  setLoading,
  setError,
  clearAuth,
} from '../../src/store/authSlice';
import { User } from '../../src/types';

describe('authSlice', () => {
  const initialState = {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
  };

  const mockUser: User = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    isAnonymous: false,
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const result = authReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });
  });

  describe('setUser', () => {
    it('should set user and authenticate', () => {
      const result = authReducer(initialState, setUser(mockUser));
      expect(result.user).toEqual(mockUser);
      expect(result.isAuthenticated).toBe(true);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should clear user when null is provided', () => {
      const state = { ...initialState, user: mockUser, isAuthenticated: true };
      const result = authReducer(state, setUser(null));
      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
    });

    it('should clear loading and error states', () => {
      const state = { ...initialState, loading: true, error: 'some error' };
      const result = authReducer(state, setUser(mockUser));
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const result = authReducer(initialState, setLoading(true));
      expect(result.loading).toBe(true);
    });

    it('should set loading to false', () => {
      const state = { ...initialState, loading: true };
      const result = authReducer(state, setLoading(false));
      expect(result.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      const state = { ...initialState, loading: true };
      const result = authReducer(state, setError('Authentication failed'));
      expect(result.error).toBe('Authentication failed');
      expect(result.loading).toBe(false);
    });

    it('should clear error when null is provided', () => {
      const state = { ...initialState, error: 'Previous error' };
      const result = authReducer(state, setError(null));
      expect(result.error).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should reset to initial state', () => {
      const state = {
        user: mockUser,
        loading: true,
        error: 'some error',
        isAuthenticated: true,
      };
      const result = authReducer(state, clearAuth());
      expect(result).toEqual(initialState);
    });
  });
});
