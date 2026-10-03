# 🚀 ComicCraft AI - Node.js Express Backend & Web Application

Full-stack AI Comic Creator web application built with **Node.js, Express, Google Gemini AI, and HTML5/CSS3/JavaScript**.

---

## 🛠️ Project Structure

```
comiccraft-backend/
├── server.js            # Express API Server & Routes
├── package.json         # Node.js dependencies & scripts
├── .env.example         # Environment variables configuration template
├── README.md            # Documentation & setup instructions
└── public/              # Static Frontend Files
    ├── index.html       # Web App UI
    ├── style.css        # Pop-art Comic Design System
    └── app.js           # Client-side controller & API integration
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional)* Add your Google Gemini API key to `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Server
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 🔌 API Endpoints

- `GET /api/health` - Check backend server health status and Gemini key status.
- `POST /api/generate-outline` - Generate structured 5-panel comic storyline via Gemini AI.
- `POST /api/generate-dialogue` - Script dialogue, narration, and captions.
- `GET /api/download-zip` - Stream full project source archive (.zip) directly to client.

---

## 🚢 Deployment Options

- **Render / Railway**: Connect your repository, set build command `npm install` and start command `npm start`.
- **Vercel / Netlify**: Deploy as a serverless Node.js application.
- **Docker / VPS**: Run using `node server.js` or `pm2 start server.js`.
