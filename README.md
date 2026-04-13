# Adaptive Reading

An adaptive reading app built with React + Vite, powered by Claude AI. Passages are generated at ACSF literacy levels (PLA Low → Level 3) and the app automatically adjusts the student's level based on their quiz scores.

## How it works

- **> 80% correct** → moves up one level
- **60–80% correct** → stays at the same level
- **< 60% correct** → drops down one level

Levels: PLA Low · PLA Mid · PLA High · PLB Low · PLB Mid · PLB High · Level 1 Low · Level 1 High · Level 2 Low · Level 2 High · Level 3

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/adaptive-reading.git
cd adaptive-reading
npm install
```

### 2. Add your API key

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/adaptive-reading.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com and sign in
2. Click **Add New Project**
3. Import your GitHub repository
4. Vercel will auto-detect Vite — no build settings needed

### 3. Add your API key in Vercel

In your Vercel project:
1. Go to **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from https://console.anthropic.com
3. Click **Save**
4. **Redeploy** the project (Deployments → the three dots → Redeploy)

Your app is now live!

---

## Project structure

```
adaptive-reading/
├── api/
│   └── generate.js        # Vercel serverless function (keeps API key safe)
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx            # Main React app
│   ├── App.module.css     # All styles
│   ├── main.jsx           # React entry point
│   └── index.css          # Global reset
├── index.html
├── vite.config.js
├── vercel.json
├── .env.example
└── package.json
```

## Tech stack

- React 18
- Vite 5
- CSS Modules
- Vercel (hosting + serverless functions)
- Anthropic Claude API
