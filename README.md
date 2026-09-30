# Praxis

Praxis is a web-based Pomodoro timer and daily consistency tracker designed to facilitate deep focus sessions and build long-term productivity habits. 

The application features a custom retro-inspired interface, utilizing high-contrast typography and a dark aesthetic to minimize distractions during intensive study or development workflows.

## Live Application
The application is deployed and accessible at: **https://praxis-coral-nine.vercel.app**

---

## 🔒 1. How to Stop GitHub Protection Notifications (Secret Scanning)

If GitHub sends you notifications about Google API keys exposed in your public repository (`https://github.com/peyushh69/praxis`), follow these standard professional steps:

### Step 1: Remove the config file from git tracking
`firebase-applet-config.json` is already in `.gitignore`, but if it was committed previously, Git continues tracking it. Run these commands in your local project terminal:

```bash
# Untrack the sensitive config file without deleting it locally
git rm --cached firebase-applet-config.json

# Commit the removal
git commit -m "Protect Firebase API credentials and use environment variables"

# Push the update to GitHub
git push origin main
```

### Step 2: Configure Environment Variables in Vercel
Go to **Vercel Dashboard** -> Your Project (`praxis`) -> **Settings** -> **Environment Variables**, and add:

- `VITE_FIREBASE_API_KEY` = *(Your Firebase Web API key)*
- `VITE_FIREBASE_AUTH_DOMAIN` = `praxis-6c979.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID` = `praxis-6c979`
- `VITE_FIREBASE_STORAGE_BUCKET` = `praxis-6c979.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` = `778903558380`
- `VITE_FIREBASE_APP_ID` = `1:778903558380:web:29801b6a8965fb3efeedc9`
- `VITE_FIREBASE_DATABASE_ID` = `ai-studio-pixelpomodorocon-88b8db8c-3477-4800-8b85-91f52c78f3aa`

### Step 3: Restrict API Key in Google Cloud (Professional Best Practice)
Firebase Web API keys are client-facing identifiers. To guarantee 100% security against unauthorized use:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your Firebase project (`praxis-6c979`).
3. Click on the API key (`Browser key (auto created by Firebase)`).
4. Under **Application restrictions**, choose **Websites (HTTP referrers)** and add:
   - `https://praxis-coral-nine.vercel.app/*`
   - `https://*.vercel.app/*`
   - `http://localhost:*`
5. Under **API restrictions**, choose **Restrict key** and allow only:
   - `Identity Toolkit API`
   - `Cloud Firestore API`
6. Click **Save**.

---

## 🔑 2. How to Fix Google Login on Vercel (`auth/unauthorized-domain`)

When you click **LOGIN WITH GOOGLE** on `https://praxis-coral-nine.vercel.app`, Firebase requires the domain to be authorized:

1. Open [Firebase Console](https://console.firebase.google.com/) and open project `praxis-6c979`.
2. Go to **Build** -> **Authentication** in the left sidebar.
3. Click the **Settings** tab at the top.
4. Scroll to **Authorized domains** and click **Add domain**.
5. Paste:
   ```
   praxis-coral-nine.vercel.app
   ```
6. Click **Add**.

*Note: You can also use **Email & Password Sign-In** or **Guest Mode** inside the app, which work immediately without needing domain authorization!*

---

## Core Features
- **Focus Timer**: Configurable Pomodoro intervals (Focus, Short Break, Long Break) with a retro pixel console display.
- **Consistency Matrix**: Contribution heatmap to visually track daily streaks and focus volume.
- **Milestone Countdown**: Dot-matrix target card for upcoming deadlines or exams.
- **Cloud & Local Synchronization**: Multi-device sync with Firestore, with complete offline localStorage fallback.
- **Task & Routine Tracking**: Manage daily objectives and radial habit rings.
- **PWA & Android Support**: Installable progressive web application.

---

## Local Development

```bash
# 1. Clone repository
git clone https://github.com/peyushh69/praxis.git
cd praxis

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

---

## Creator & Ownership
Designed and developed by Peyush. All rights reserved.
