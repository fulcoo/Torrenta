import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, SESSION_DURATION_MS } from '../auth';
import { useAppStore } from '../app';
import { useTorrentStore } from '../torrent';
import { safeStorage } from '@/utils/storage';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the independent server session and keeps the fallback password out of downloader config', async () => {
    vi.stubEnv('MODE', 'fpk-direct');
    safeStorage.setJSON('torrenta_auth_session', { username: 'admin', loginTime: Date.now() });
    const fetchSession = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'invalidCredentials' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ username: 'admin', expiresAt: Date.now() + SESSION_DURATION_MS, qbCredentials: false }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchSession);
    const authStore = useAuthStore();
    const appStore = useAppStore();
    const torrentStore = useTorrentStore();
    const saveConfig = vi.spyOn(appStore, 'saveConfig');
    vi.spyOn(appStore, 'loadServerSettings').mockResolvedValue();
    vi.spyOn(torrentStore, 'bootClient').mockResolvedValue(true);
    try {
      authStore.hydrateSecurityData({ authEnabled: true, skipGatewayPassword: true });
      expect(authStore.supportsGatewayLoginPreference).toBe(true);
      expect(authStore.needsDirectLogin).toBe(true);
      expect(await authStore.restoreDirectSession()).toBe(false);
      expect(authStore.directSessionReady).toBe(true);
      expect(await authStore.login('admin', 'wrong')).toEqual({ success: false, error: 'invalidCredentials' });
      expect(authStore.needsDirectLogin).toBe(true);
      expect(await authStore.login('admin', 'independent-password')).toEqual({ success: true });
      expect(fetchSession).toHaveBeenNthCalledWith(3, '/api/torrenta-session', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'independent-password' }),
      }));
      expect(saveConfig).not.toHaveBeenCalled();
      expect(authStore.session?.username).toBe('admin');
      expect(authStore.isAuthenticated).toBe(true);
      authStore.logout();
      expect(authStore.needsDirectLogin).toBe(true);
      expect(fetchSession).toHaveBeenLastCalledWith('/api/torrenta-session', { method: 'DELETE' });
    } finally {
      authStore.stopTicker();
    }
  });

  it('skips the extra password only in the fnOS desktop and restores saved downloader credentials', async () => {
    vi.stubEnv('MODE', 'fpk-gateway');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        security: { authEnabled: true, skipGatewayPassword: true, authUsername: 'admin', authPassword: 'saved-password' },
      }),
    }));
    const authStore = useAuthStore();
    const appStore = useAppStore();
    try {
      authStore.hydrateSecurityData({ authEnabled: true });
      expect(authStore.lockReason).toBe('auth_required');
      expect(authStore.supportsGatewayLoginPreference).toBe(true);
      await appStore.loadServerSettings();
      expect(authStore.lockReason).toBe('none');
      expect(authStore.getSecurityData().skipGatewayPassword).toBe(true);
      expect(appStore.username).toBe('admin');
      expect(appStore.password).toBe('saved-password');

      authStore.updateAuthConfig({ enabled: true, username: 'admin', skipGatewayPassword: false });
      authStore.logout();
      expect(authStore.lockReason).toBe('auth_required');
    } finally {
      authStore.stopTicker();
    }
  });

  it.each([
    ['fpk-gateway', '/app/torrenta/', '/app/torrenta/api/gateway-login-preference'],
    ['fpk-direct', '/', '/api/gateway-login-preference'],
  ])('saves the shared login preference from %s', async (mode, base, endpoint) => {
    vi.stubEnv('MODE', mode);
    vi.stubEnv('BASE_URL', base);
    const fetchSettings = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSettings);
    const authStore = useAuthStore();
    try {
      await authStore.saveGatewayLoginPreference(true, true);
      expect(fetchSettings).toHaveBeenCalledWith(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authEnabled: true, skipGatewayPassword: true }),
      });
    } finally {
      authStore.stopTicker();
    }
  });

  it('should initialize with auth disabled by default and unlocked when boot has not attempted', () => {
    const authStore = useAuthStore();
    expect(authStore.authEnabled).toBe(false);
    expect(authStore.authUsername).toBe('admin');
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isLocked).toBe(false);
    expect(authStore.lockReason).toBe('none');
    authStore.stopTicker();
  });

  it('should lock with connection issue when qBittorrent connection fails even if auth is disabled', () => {
    const authStore = useAuthStore();
    const torrentStore = useTorrentStore();
    
    // Auth disabled
    expect(authStore.authEnabled).toBe(false);

    // Simulate failed boot attempt
    torrentStore.hasAttemptedBoot = true;
    torrentStore.isConnected = false;

    // Should pop up login modal to solve the connection
    expect(authStore.isLocked).toBe(true);
    expect(['connection_failed', 'not_configured']).toContain(authStore.lockReason);
    authStore.stopTicker();
  });

  it('should require login when auth is enabled and no session exists', () => {
    safeStorage.setItem('torrenta_auth_enabled', 'true');
    safeStorage.setItem('torrenta_username', 'admin');
    safeStorage.setItem('torrenta_password', 'secret123');
    safeStorage.setItem('torrenta_skip_gateway_password', 'true');

    const authStore = useAuthStore();
    const torrentStore = useTorrentStore();
    torrentStore.isConnected = true; // Connection is ok

    expect(authStore.authEnabled).toBe(true);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isLocked).toBe(true);
    expect(authStore.lockReason).toBe('auth_required');
    authStore.stopTicker();
  });

  it('should fail login with wrong credentials and succeed with correct credentials', async () => {
    const authStore = useAuthStore();
    const torrentStore = useTorrentStore();
    torrentStore.isConnected = true;

    authStore.updateAuthConfig({
      enabled: true,
      username: 'myuser',
      password: 'password999',
    });

    // Logout to test fresh login
    authStore.logout();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isLocked).toBe(true);

    // Mock connectWithCredentials to check credentials
    vi.spyOn(torrentStore, 'connectWithCredentials').mockImplementation(async (_url, u, p) => {
      if (u === 'myuser' && p === 'password999') {
        torrentStore.isConnected = true;
        return true;
      }
      torrentStore.isConnected = false;
      throw new Error('用户名或密码错误');
    });

    // Wrong password
    const failRes = await authStore.login('myuser', 'wrongpass');
    expect(failRes.success).toBe(false);
    expect(authStore.isAuthenticated).toBe(false);

    // Wrong username
    const failRes2 = await authStore.login('otheruser', 'password999');
    expect(failRes2.success).toBe(false);
    expect(authStore.isAuthenticated).toBe(false);

    // Correct credentials
    const successRes = await authStore.login('myuser', 'password999');
    expect(successRes.success).toBe(true);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isLocked).toBe(false);
    expect(authStore.session?.username).toBe('myuser');
    expect(typeof authStore.session?.loginTime).toBe('number');
    authStore.stopTicker();
  });

  it('should keep session valid within 24 hours and expire after 24 hours', () => {
    vi.useFakeTimers();
    const startTime = new Date('2026-10-14T10:00:00Z').getTime();
    vi.setSystemTime(startTime);

    const authStore = useAuthStore();
    const torrentStore = useTorrentStore();
    torrentStore.isConnected = true;

    authStore.updateAuthConfig({
      enabled: true,
      username: 'admin',
      password: 'mypassword',
    });

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isLocked).toBe(false);

    // Advance 23 hours (should still be valid)
    vi.setSystemTime(startTime + 23 * 60 * 60 * 1000);
    authStore.now = startTime + 23 * 60 * 60 * 1000;
    expect(authStore.isExpired).toBe(false);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isLocked).toBe(false);
    expect(authStore.remainingTimeMs).toBeGreaterThan(0);

    // Call touchSession() to renew the session sliding window
    authStore.touchSession();
    expect(authStore.session?.loginTime).toBe(startTime + 23 * 60 * 60 * 1000);

    // Advance 2 hours after touchSession (25h from original start, but only 2h from touch)
    vi.setSystemTime(startTime + 25 * 60 * 60 * 1000);
    authStore.now = startTime + 25 * 60 * 60 * 1000;
    expect(authStore.isExpired).toBe(false);
    expect(authStore.isAuthenticated).toBe(true);

    // Advance to 24 hours + 1 second after touch (should be expired)
    const expiredTime = (startTime + 23 * 60 * 60 * 1000) + SESSION_DURATION_MS + 1000;
    vi.setSystemTime(expiredTime);
    authStore.now = expiredTime;
    expect(authStore.isExpired).toBe(true);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isLocked).toBe(true);
    expect(authStore.remainingTimeMs).toBe(0);

    // checkSessionExpiry should clean session
    authStore.checkSessionExpiry();
    expect(authStore.session).toBeNull();
    authStore.stopTicker();
  });

  it('should logout correctly and clear session', () => {
    const authStore = useAuthStore();
    const torrentStore = useTorrentStore();
    torrentStore.isConnected = true;

    authStore.updateAuthConfig({
      enabled: true,
      username: 'admin',
      password: 'password123',
    });
    expect(authStore.isAuthenticated).toBe(true);

    authStore.logout();
    expect(authStore.session).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isLocked).toBe(true);
    expect(safeStorage.getItem('torrenta_auth_session')).toBe('');
    authStore.stopTicker();
  });

  it('should sync security data from server sync payload', () => {
    const authStore = useAuthStore();
    authStore.hydrateSecurityData({
      authEnabled: true,
      authUsername: 'superadmin',
      authPassword: 'remotepassword',
    });

    expect(authStore.authEnabled).toBe(true);
    authStore.stopTicker();
  });
});
