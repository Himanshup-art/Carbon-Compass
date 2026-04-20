# EVS Carbon Footprint Project

This is a full-stack EVS carbon footprint calculator built with Next.js App Router and Firestore.

## What it includes

- travel, electricity, and food based carbon calculation
- India and global comparison
- green / amber / red rating
- personalized reduction suggestions
- Firestore-backed report history
- monthly trend tracking
- print-friendly result view for PDF export

## Setup

1. Install dependencies

```bash
npm install
```

2. Create your local env file

```bash
copy .env.example .env.local
```

3. Fill in the Firebase Admin SDK values from your Firebase service account.

4. Start development

```bash
npm run dev
```

## Firestore collection

The app saves entries into:

- `carbonEntries`

## Required env vars

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
