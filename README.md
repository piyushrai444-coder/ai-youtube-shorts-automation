# AI YouTube Shorts Automation Platform 🚀

A production-ready, fully autonomous Node.js/TypeScript platform that creates and publishes **2 YouTube Shorts every day** covering the latest AI tools, breakthroughs, coding agents, productivity software, and official tech updates.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Key Features](#key-features)
3. [Prerequisites & Required Accounts](#prerequisites--required-accounts)
4. [Local Development Setup](#local-development-setup)
5. [Google Cloud Console & YouTube OAuth Setup](#google-cloud-console--youtube-oauth-setup)
6. [Render Deployment Guide](#render-deployment-guide)
7. [Cron-job.org Scheduling Guide](#cron-joborg-scheduling-guide)
8. [Automation Pipeline & Idempotency](#automation-pipeline--idempotency)
9. [Admin Dashboard & Controls](#admin-dashboard--controls)
10. [Testing & Quality Verification](#testing--quality-verification)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Production Verification Checklist](#production-verification-checklist)

---

## System Architecture

```text
  Cron-job.org (10:00 AM & 7:00 PM IST)
                 │
                 ▼
  POST /api/cron/generate-short-1 (Bearer CRON_SECRET)
                 │
                 ▼
     [Idempotency & Job Queue]  ──────► Returns 202 Accepted (<100ms)
                 │
                 ▼ (Asynchronous Background Worker)
      [Research Engine] ── Multi-provider (RSS / Search APIs) + Hash Deduplication
                 │
                 ▼
      [AI Script Generator] ── Gemini 1.5 Flash / GPT-4o-mini (55–75 words, Hook/Expl/Benefit/CTA)
                 │
                 ▼
     [Voiceover Synthesis] ── OpenAI TTS / ElevenLabs (Strict duration measurement)
                 │
                 ▼
      [Visual Generator] ── Crisp 1080x1920 9:16 Canvas UI slides via Sharp
                 │
                 ▼
      [Caption Sync Engine] ── Word-timed subtitles (.srt)
                 │
                 ▼
       [FFmpeg Rendering] ── Subtitle burn + audio ducking + H.264/AAC 9:16 MP4
                 │
                 ▼
       [Video Validator] ── Enforces 1080x1920, H.264, AAC, and ≤ 30.0s limit
                 │
                 ▼
      [Permanent Storage] ── Cloudflare R2 / AWS S3 / Backblaze B2 / Local
                 │
                 ▼
     [YouTube Data API v3] ── Official OAuth 2.0 resumable upload + Quota handling
                 │
                 ▼
    [Live on YouTube Shorts] ── Logged in DB & displayed in Admin Dashboard
```

---

## Key Features

- **Strict 30-Second Limit Enforced**: Automated word-count budgeting (55–75 words) and FFmpeg audio pacing ensure no video ever exceeds 30 seconds.
- **True 9:16 Vertical Video**: High-definition 1080x1920 layout rendered via FFmpeg (`libx264`, `aac`, 30 FPS).
- **Synchronized Mobile Captions**: High-contrast, glowing-outline subtitles burned into the lower-third safe zone above the YouTube Shorts interface.
- **Daily Idempotency**: Slot-based idempotency keys (`YYYY-MM-DD-short-1` and `YYYY-MM-DD-short-2` in `Asia/Kolkata` timezone) guarantee exactly 2 Shorts per day without accidental duplication if Cron-job.org retries.
- **Non-Blocking HTTP Endpoints**: Cron requests respond in `<100ms` with `202 Accepted` while rendering proceeds in a resilient background state machine.
- **Fault-Tolerant & Restart-Resilient**: Survives server restarts or Render dyno cycling by automatically scanning and recovering interrupted jobs upon boot.
- **Official YouTube Data API v3**: Zero brittle browser automation. Uses official Google OAuth 2.0 with encrypted token storage, automated token refresh, and quota exhaustion detection.
- **Pluggable Abstraction Layer**:
  - `ResearchProvider`: RSS (OpenAI, Google AI, TechCrunch, VentureBeat, Hacker News) & Web Search APIs (Tavily/Serper).
  - `LLMProvider`: Google Gemini & OpenAI.
  - `TTSProvider`: OpenAI TTS & ElevenLabs.
  - `StorageProvider`: AWS S3, Cloudflare R2, Backblaze B2, and Local storage.
- **Self-Contained Admin Panel**: Server-rendered HTML dashboard with live metrics, video playback preview, audio inspection, script review, source attribution, and manual override controls (Generate Now, Retry, Upload, Delete).

---

## Prerequisites & Required Accounts

Before deploying or running locally, prepare accounts for:

1. **Node.js**: v18+ (Node 22 LTS recommended).
2. **PostgreSQL**: Local PostgreSQL or managed database (e.g. Render PostgreSQL).
3. **FFmpeg**: Bundled automatically via `@ffmpeg-installer/ffmpeg` and native in Docker.
4. **Google Cloud Account**: For YouTube Data API v3 OAuth credentials.
5. **AI Provider**:
   - Google AI Studio (Gemini API key — generous free tier) OR
   - OpenAI Platform (API key for GPT-4o-mini and OpenAI TTS).
6. **Object Storage (Optional for production)**: Cloudflare R2, AWS S3, or Backblaze B2. (Can use `STORAGE_PROVIDER=local` for dev).
7. **Cron-job.org Account**: Free account to trigger scheduled requests twice daily.
8. **Render Account**: For cloud hosting.

---

## Local Development Setup

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd ai-agent-for-yt
npm install
```

### 2. Configure Environment

Copy the configuration template:

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/yt_shorts_db?schema=public`).
- `SESSION_SECRET`: Long random secret string.
- `CRON_SECRET`: Random secret token for cron authentication.
- `LLM_PROVIDER`: `gemini` or `openai`.
- `LLM_API_KEY`: Your Gemini or OpenAI key.
- `TTS_PROVIDER`: `openai` (or `elevenlabs`).
- `TTS_API_KEY`: Your TTS key.

### 3. Initialize Database & Seed

```bash
# Push schema to database
npm run prisma:push

# Or run PostgreSQL migration
npm run prisma:migrate

# Seed default admin user and settings
npm run seed
```
> Default admin credentials created:
> - **Username**: `admin`
> - **Password**: `admin123`

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) to view the Admin Dashboard.

---

## Google Cloud Console & YouTube OAuth Setup

Follow these steps to connect your YouTube channel:

### 1. Create Google Cloud Project
1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** → **New Project**.
3. Name it `AI YouTube Shorts Bot` and click **Create**.

### 2. Enable YouTube Data API v3
1. In the left navigation, go to **APIs & Services** → **Library**.
2. Search for `YouTube Data API v3`.
3. Click on it and press **Enable**.

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in:
   - **App name**: `AI Shorts Automation`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes**, and add:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Save and Continue**.
7. Under **Test Users**, add the Google email address of the YouTube channel owner.

### 4. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application Type: **Web application**.
4. Name: `AI Shorts Web Client`.
5. Under **Authorized redirect URIs**, add:
   - For local development: `http://localhost:3000/admin/youtube/callback`
   - For Render deployment: `https://YOUR-APP.onrender.com/admin/youtube/callback`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret**.

### 5. Link YouTube Channel in Admin Portal
1. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env` (or Render Environment).
2. Start the server and navigate to [http://localhost:3000/admin/settings/youtube](http://localhost:3000/admin/settings/youtube).
3. Click **Connect YouTube Channel**.
4. Log into the Google account owning your YouTube channel and grant access.
5. Upon redirection, you will see **YouTube Connected ✓** along with your channel name, thumbnail, and channel ID.

---

## Render Deployment Guide

The platform includes a native `Dockerfile` and `render.yaml` specification for turnkey deployment.

### Method 1: Render Blueprint (Recommended)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New** → **Blueprint**.
3. Connect your repository. Render reads `render.yaml` and provisions:
   - **Web Service** (Docker-based with FFmpeg pre-installed).
   - **Render PostgreSQL Database**.
4. In the Render environment configuration, enter your sensitive API keys:
   - `LLM_API_KEY`
   - `TTS_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (`https://YOUR-APP.onrender.com/admin/youtube/callback`)
   - `APP_URL` (`https://YOUR-APP.onrender.com`)
   - `STORAGE_ACCESS_KEY` & `STORAGE_SECRET_KEY` (if using Cloudflare R2 / AWS S3)
5. Click **Apply**.

### Method 2: Manual Web Service
1. Create a **PostgreSQL** database on Render. Copy the **Internal Database URL**.
2. Click **New** → **Web Service** → Connect your repository.
3. Select Environment: **Docker**.
4. Add environment variables matching `.env.example`.
5. Health Check Path: `/health`.
6. Deploy!

### Post-Deployment First-Time Wizard
Navigate to `https://YOUR-APP.onrender.com/admin/setup`. The setup wizard allows you to configure your production admin credentials and initial branding with a single click.

---

## Cron-job.org Scheduling Guide

Cron-job.org ensures reliable, independent daily scheduling without relying on vulnerable in-memory Node cron jobs.

### Configure Short #1 (Morning Short)
1. Log in to [Cron-job.org](https://cron-job.org/).
2. Click **Create Cronjob**.
3. **Title**: `AI Short 1 - Morning (10:00 AM IST)`
4. **URL**: `https://YOUR-APP.onrender.com/api/cron/generate-short-1`
5. **Request Method**: `POST`
6. **Schedule**:
   - Timezone: `Asia/Kolkata`
   - Every day at: `10:00`
7. **Headers**:
   - Header Name: `Authorization`
   - Header Value: `Bearer <YOUR_CRON_SECRET>`
8. Click **Create**.

### Configure Short #2 (Evening Short)
1. Click **Create Cronjob**.
2. **Title**: `AI Short 2 - Evening (07:00 PM IST)`
3. **URL**: `https://YOUR-APP.onrender.com/api/cron/generate-short-2`
4. **Request Method**: `POST`
5. **Schedule**:
   - Timezone: `Asia/Kolkata`
   - Every day at: `19:00`
6. **Headers**:
   - Header Name: `Authorization`
   - Header Value: `Bearer <YOUR_CRON_SECRET>`
7. Click **Create**.

### How to Modify the Schedule
- You can adjust the trigger times directly in the Cron-job.org dashboard at any time.
- Update the display times in **Admin Panel → Settings → Schedule Timing** to keep the dashboard synchronized.

---

## Automation Pipeline & Idempotency

### Daily Slot Idempotency Mechanism
Every daily job is keyed by:
```text
<YYYY-MM-DD>-<slot>
Examples:
  2026-10-02-short-1
  2026-10-02-short-2
```
If Cron-job.org triggers a retry or network timeout occurs:
1. The endpoint inspects the active `JobRun` and `Short` records for that slot key.
2. If already processing or already `UPLOADED`, the system returns `200 OK` with `alreadyExists: true` and rejects duplicate generation.

### Strict 30-Second Limit Enforcer
YouTube Shorts requires under 60 seconds; our platform targets **30 seconds or less** for maximum algorithmic retention:
1. **Script Validation**: Reject scripts exceeding 80 words (normal conversational rate ~2.6 words/sec = ~28s).
2. **Auto-Repair**: Truncates and repairs verbosity while preserving the Hook, Explanation, Benefit, and CTA.
3. **Audio Duration Probing**: Measures voiceover audio using FFprobe. If audio is >30s, FFmpeg automatically applies an `atempo` speed adjustment filter to compress the timeline to ≤28.5s.
4. **Video Validation**: Inspects the rendered MP4 with FFprobe before upload. If duration >30.5s or aspect ratio is not 9:16, the video is marked `VALIDATION_FAILED` and upload is blocked.

### Crash Recovery Service
On application startup (e.g. Render restart), `JobRecoveryService`:
1. Queries all jobs stuck in `RUNNING` for over 15 minutes.
2. Checks if the associated video was already uploaded to YouTube (to avoid duplicate posts).
3. Marks uncompleted jobs as `RETRY_PENDING` and triggers an exponential backoff retry (1m → 5m → 15m).

---

## Admin Dashboard & Controls

Access the Admin Dashboard at `/admin`.

### Dashboard Metrics
- **Today's Generated**: Progress against daily 2-Short quota.
- **Live On YouTube**: Number of shorts uploaded today.
- **Processing / Pending**: In-flight jobs.
- **Failed / Incomplete**: Errored jobs tracked for retry.

### Manual Troubleshooting Controls
Although the system runs 100% autonomously, manual controls are provided:
- **Generate Short Now**: Instantly queues a manual Short outside of the scheduled slots.
- **Retry Pipeline**: Re-runs generation from the last successful stage.
- **Upload to YouTube**: Manually retries uploading a video saved in `UPLOAD_PENDING`.
- **Delete Short**: Permanently removes a Short record.

---

## Testing & Quality Verification

Run the comprehensive automated test suite:

```bash
npm test
```

### Test Coverage Highlights
- `tests/auth.test.ts`: Password hashing, salt validation, session authentication, invalid credential rejection.
- `tests/cron.test.ts`: Bearer token authorization, 401 challenge, daily slot idempotency.
- `tests/research.test.ts`: Live RSS parser, secondary provider fallback, SHA-256 topic deduplication.
- `tests/content.test.ts`: Word count bounds, 30s duration validation, clickbait detection, auto-repair logic.
- `tests/video.test.ts`: Canvas 1080x1920 PNG rendering, subtitle timing generator (.srt), 9:16 video validator.
- `tests/youtube.test.ts`: Google OAuth scope builder, encrypted refresh token retrieval, quota error handling.
- `tests/jobState.test.ts`: JobRun transitions, restart recovery, prevention of duplicate YouTube uploads.

### Verify Video Rendering Pipeline Locally
Test the real end-to-end FFmpeg rendering and validation pipeline:

```bash
npx tsx scripts/test-render.ts
```

This compiles a full 1080x1920 9:16 vertical MP4 video with burning subtitles and validates codec conformance.

---

## Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`production` or `development`) | `development` |
| `PORT` | HTTP port | `3000` |
| `APP_URL` | Public base URL of your application | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | *Required* |
| `SESSION_SECRET` | Session cookie encryption secret | *Required* |
| `CRON_SECRET` | Secret token for Cron-job.org authorization | *Required* |
| `TIMEZONE` | Automation timezone | `Asia/Kolkata` |
| `DAILY_SHORT_COUNT` | Target Shorts to produce per day | `2` |
| `SHORT_1_TIME` | Short #1 trigger time (Morning) | `10:00` |
| `SHORT_2_TIME` | Short #2 trigger time (Evening) | `19:00` |
| `LLM_PROVIDER` | `gemini` or `openai` | `gemini` |
| `LLM_API_KEY` | API Key for Gemini or OpenAI | *Required* |
| `LLM_MODEL` | Model identifier | `gemini-1.5-flash` |
| `RESEARCH_PROVIDER` | `rss`, `searchapi`, or `multi` | `rss` |
| `SEARCH_API_KEY` | Search API Key (Tavily/Serper) | Optional |
| `TTS_PROVIDER` | `openai` or `elevenlabs` | `openai` |
| `TTS_API_KEY` | API Key for TTS provider | *Required* |
| `TTS_VOICE` | Voice identifier (`alloy`, `onyx`, etc.) | `alloy` |
| `STORAGE_PROVIDER` | `local`, `s3`, `r2`, or `b2` | `local` |
| `STORAGE_BUCKET` | S3 / R2 Bucket name | Optional |
| `STORAGE_ACCESS_KEY` | S3 / R2 Access key | Optional |
| `STORAGE_SECRET_KEY` | S3 / R2 Secret key | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | *Required for YT* |
| `GOOGLE_CLIENT_SECRET`| Google OAuth 2.0 Client Secret | *Required for YT* |
| `GOOGLE_REDIRECT_URI` | OAuth Redirect URI callback | *Required for YT* |
| `YOUTUBE_PRIVACY_STATUS`| YouTube privacy: `public`, `unlisted`, `private`| `public` |
| `ENABLE_BACKGROUND_MUSIC`| Mix royalty-free background audio | `false` |
| `DEFAULT_CTA` | Default Call-To-Action text | *Follow for daily AI tools 🚀* |

---

## Production Verification Checklist

- [x] **PostgreSQL database** schema configured with Prisma models (`User`, `Topic`, `Short`, `Setting`, `JobRun`, `Session`).
- [x] **Prisma migrations** and `schema.prisma` configured.
- [x] **Admin Authentication** with bcrypt password hashing and secure HTTP-only sessions.
- [x] **Protected Cron Endpoints** with `Authorization: Bearer CRON_SECRET` validation.
- [x] **Multi-source AI Research** with automated URL and content hash deduplication.
- [x] **AI Content Synthesis** enforcing 55–75 words, Hook, Explanation, Benefit, CTA, and factuality.
- [x] **Voiceover TTS** with exact audio duration measurement and tempo auto-speedup.
- [x] **1080x1920 9:16 Visuals** rendered using vector SVG/Canvas and Sharp.
- [x] **Synchronized Captions** (.srt) burned directly into video via FFmpeg.
- [x] **Video Validator** enforcing 1080x1920, H.264 video, AAC audio, and duration ≤ 30s.
- [x] **Pluggable Object Storage** (S3, Cloudflare R2, Backblaze B2, and Local).
- [x] **Official YouTube Data API v3** OAuth 2.0 flow with encrypted token persistence and quota management.
- [x] **Daily Idempotency** (`YYYY-MM-DD-short-1` and `short-2`) preventing duplicate posts.
- [x] **Non-blocking HTTP execution** with asynchronous background job processing.
- [x] **Job Recovery Service** resolving interrupted jobs after server restarts.
- [x] **Render-ready Dockerfile** with native FFmpeg, fonts, and health check.
- [x] **Cron-job.org Integration** guide with exact timezones and headers.
- [x] **29/29 Automated Tests passing** across all modules.

---

## License

MIT License. Designed and built for automated, high-retention AI content publishing on YouTube Shorts.
