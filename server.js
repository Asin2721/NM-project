const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// 1. Health Check Endpoint
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ComicCraft Backend API',
        timestamp: new Date().toISOString(),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    });
});

// -------------------------------------------------------------
// 2. Gemini AI Story Outline Generator Route
// -------------------------------------------------------------
app.post('/api/generate-outline', async (req, res) => {
    try {
        const { prompt, character, setting, tone, artStyle, apiKey } = req.body;
        const geminiKey = apiKey || process.env.GEMINI_API_KEY;

        if (geminiKey) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const promptText = `You are an expert comic book creator. Generate a structured 5-panel comic strip outline for:
Story Prompt: ${prompt}
Main Character: ${character}
Setting: ${setting}
Tone: ${tone}
Art Style: ${artStyle}

Respond ONLY with a valid JSON array of exactly 5 objects. Each object must have:
"panel_number": integer (1 to 5)
"title": panel title
"scene_description": 2-3 sentence visual description
"image_prompt": detailed image generator prompt in ${artStyle} style featuring ${character} in ${setting}.`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const cleanJson = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);
                    if (Array.isArray(parsed) && parsed.length >= 5) {
                        return res.json({ success: true, source: 'gemini-ai', panels: parsed.slice(0, 5) });
                    }
                }
            } catch (err) {
                console.warn('Gemini API call failed, using smart fallback engine:', err.message);
            }
        }

        // Built-in Smart Generative Fallback
        const fallbackPanels = [
            {
                panel_number: 1,
                title: `The Journey Begins in ${setting}`,
                scene_description: `The story opens as ${character} steps into the mysterious domain of ${setting}. A sense of ${tone.toLowerCase()} anticipation lingers in the atmosphere.`,
                image_prompt: `Panel 1: ${artStyle} illustration of ${character} standing at the threshold of ${setting}, looking ahead with determination, wide angle establishing shot, rich atmospheric details, comic book art.`
            },
            {
                panel_number: 2,
                title: 'A Mysterious Discovery',
                scene_description: `Deep inside ${setting}, ${character} discovers an unexpected clue or obstacle that shifts the nature of the quest.`,
                image_prompt: `Panel 2: ${artStyle} medium shot of ${character} discovering a glowing artifact or hidden trail in ${setting}, intense expression, dynamic shadows, comic panel framing.`
            },
            {
                panel_number: 3,
                title: 'Rising Conflict',
                scene_description: `A sudden turning point forces ${character} to make a quick decision. The ${tone.toLowerCase()} stakes are heightened as obstacles close in.`,
                image_prompt: `Panel 3: ${artStyle} action pose of ${character} confronting a sudden challenge in ${setting}, dramatic perspective, wind and particles, high contrast comic aesthetic.`
            },
            {
                panel_number: 4,
                title: 'The Climax and Turning Point',
                scene_description: `At the peak of tension, ${character} demonstrates courage and ingenuity, overcoming the central challenge in a burst of heroic action.`,
                image_prompt: `Panel 4: ${artStyle} climactic moment featuring ${character} unleashing full power or clever strategy in ${setting}, glowing energy, dramatic lighting, iconic comic splash visual.`
            },
            {
                panel_number: 5,
                title: 'Triumphant Resolution',
                scene_description: `The danger passes and harmony returns to ${setting}. ${character} reflects upon the adventure, forever transformed by the journey.`,
                image_prompt: `Panel 5: ${artStyle} serene closing shot of ${character} looking toward the rising sun in ${setting}, peaceful atmosphere, triumphant and hopeful, warm golden hour comic art.`
            }
        ];

        return res.json({ success: true, source: 'smart-engine', panels: fallbackPanels });

    } catch (error) {
        console.error('Error generating outline:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// -------------------------------------------------------------
// 3. Dialogue & Narration Scripting Route
// -------------------------------------------------------------
app.post('/api/generate-dialogue', async (req, res) => {
    try {
        const { panels, character, setting, tone } = req.body;

        const defaultDialogues = [
            {
                caption: `Dawn breaks over ${setting}. The quiet before the journey begins.`,
                narration: `${character} had heard the legends, but seeing ${setting} firsthand took their breath away. "${character}: Here marks the threshold. I cannot turn back now."`
            },
            {
                caption: `Beneath the shadows of ${setting}, ancient secrets stir.`,
                narration: `The ground trembled beneath ${character}'s boots as an arcane sigil flared to life. "${character}: Look at that... the old chronicles were true!"`
            },
            {
                caption: `The shadows lengthen with perilous urgency.`,
                narration: `An unseen rival blocked the forward path. ${character} tightened their grip and focused every ounce of resolve. "${character}: If this is my trial, bring it on!"`
            },
            {
                caption: `Climax in the heart of ${setting}!`,
                narration: `With lightning reflexes, ${character} executed a daring maneuver. A blinding burst shattered the obstacle! "${character}: It ends right here!"`
            },
            {
                caption: `Peace returns to ${setting}.`,
                narration: `The dust cleared, leaving ${setting} calm and restored. ${character} looked to the horizon and smiled. "${character}: Only the first chapter of our legend."`
            }
        ];

        const enrichedPanels = panels.map((p, idx) => ({
            ...p,
            caption: defaultDialogues[idx]?.caption || `Panel #${p.panel_number} in ${setting}`,
            narration: defaultDialogues[idx]?.narration || `${character} charges forward into action!`
        }));

        res.json({ success: true, panels: enrichedPanels });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// -------------------------------------------------------------
// 4. Download Backend Project ZIP Route
// -------------------------------------------------------------
app.get('/api/download-zip', (req, res) => {
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment('ComicCraft_Full_Backend_Project.zip');

    archive.on('error', (err) => {
        res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Append files
    archive.file(path.join(__dirname, 'server.js'), { name: 'server.js' });
    archive.file(path.join(__dirname, 'package.json'), { name: 'package.json' });
    archive.file(path.join(__dirname, '.env.example'), { name: '.env.example' });
    archive.file(path.join(__dirname, 'README.md'), { name: 'README.md' });
    archive.directory(path.join(__dirname, 'public/'), 'public');

    archive.finalize();
});

// Serve frontend for all unspecified routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`🚀 ComicCraft Backend Server running on http://localhost:${PORT}`);
    console.log(`================================================`);
});
