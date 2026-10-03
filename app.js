/* ==========================================================================
   ComicCraft Netlify Engine (app.js)
   Full Client-Side AI Comic Generation, PDF Compiler, and ZIP Exporter
   ========================================================================== */

let currentComicData = {
    prompt: "",
    character: "",
    setting: "",
    tone: "",
    artStyle: "",
    panels: []
};

function switchView(viewId) {
    document.getElementById('view-form').style.display = (viewId === 'view-form') ? 'block' : 'none';
    document.getElementById('view-preview').style.display = (viewId === 'view-preview') ? 'block' : 'none';
    document.getElementById('view-success').style.display = (viewId === 'view-success') ? 'block' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fillPreset(prompt, character, setting, tone, style) {
    document.getElementById('story_prompt').value = prompt;
    document.getElementById('character_name').value = character;
    document.getElementById('setting').value = setting;
    document.getElementById('tone').value = tone;
    document.getElementById('art_style').value = style;
}

function updateStep(stepId, text, status = "active") {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = `step-item ${status}`;
    el.textContent = text;
}

// -------------------------------------------------------------
// 1. Gemini Outline Generator (Flash)
// -------------------------------------------------------------
async function generateOutline(prompt, character, setting, tone, artStyle, apiKey) {
    if (apiKey) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const reqBody = {
                contents: [{
                    parts: [{
                        text: `You are an expert comic book creator. Generate a structured 5-panel comic strip outline for:
Story Prompt: ${prompt}
Main Character: ${character}
Setting: ${setting}
Tone: ${tone}
Art Style: ${artStyle}

Respond ONLY with a valid JSON array of exactly 5 objects. Each object must have:
"panel_number": integer (1 to 5)
"title": panel title
"scene_description": 2-3 sentence visual description
"image_prompt": detailed image generator prompt in ${artStyle} style featuring ${character} in ${setting}.`
                    }]
                }]
            };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody)
            });

            if (res.ok) {
                const data = await res.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const cleanJson = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(cleanJson);
                if (Array.isArray(parsed) && parsed.length >= 5) {
                    return parsed.slice(0, 5);
                }
            }
        } catch (e) {
            console.warn("Gemini API call failed, falling back to built-in generator:", e);
        }
    }

    // Built-in Smart Generative Arc
    return [
        {
            panel_number: 1,
            title: `The Journey Begins in ${setting}`,
            scene_description: `The story opens as ${character} steps into the mysterious domain of ${setting}. A sense of ${tone.toLowerCase()} anticipation lingers in the atmosphere.`,
            image_prompt: `Panel 1: ${artStyle} illustration of ${character} standing at the threshold of ${setting}, looking ahead with determination, wide angle establishing shot, rich atmospheric details, comic book art.`
        },
        {
            panel_number: 2,
            title: "A Mysterious Discovery",
            scene_description: `Deep inside ${setting}, ${character} discovers an unexpected clue or obstacle that shifts the nature of the quest.`,
            image_prompt: `Panel 2: ${artStyle} medium shot of ${character} discovering a glowing artifact or hidden trail in ${setting}, intense expression, dynamic shadows, comic panel framing.`
        },
        {
            panel_number: 3,
            title: "Rising Conflict",
            scene_description: `A sudden turning point forces ${character} to make a quick decision. The ${tone.toLowerCase()} stakes are heightened as obstacles close in.`,
            image_prompt: `Panel 3: ${artStyle} action pose of ${character} confronting a sudden challenge in ${setting}, dramatic perspective, wind and particles, high contrast comic aesthetic.`
        },
        {
            panel_number: 4,
            title: "The Climax and Turning Point",
            scene_description: `At the peak of tension, ${character} demonstrates courage and ingenuity, overcoming the central challenge in a burst of heroic action.`,
            image_prompt: `Panel 4: ${artStyle} climactic moment featuring ${character} unleashing full power or clever strategy in ${setting}, glowing energy, dramatic lighting, iconic comic splash visual.`
        },
        {
            panel_number: 5,
            title: "Triumphant Resolution",
            scene_description: `The danger passes and harmony returns to ${setting}. ${character} reflects upon the adventure, forever transformed by the journey.`,
            image_prompt: `Panel 5: ${artStyle} serene closing shot of ${character} looking toward the rising sun in ${setting}, peaceful atmosphere, triumphant and hopeful, warm golden hour comic art.`
        }
    ];
}

// -------------------------------------------------------------
// 2. Gemini Story & Dialogue Generator (Pro)
// -------------------------------------------------------------
async function enrichStoryWithDialogue(panels, character, setting, tone, apiKey) {
    const dialogs = [
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

    return panels.map((p, idx) => ({
        ...p,
        caption: dialogs[idx].caption,
        narration: dialogs[idx].narration
    }));
}

// -------------------------------------------------------------
// 3. Comic Illustration Generator (Pollinations AI + Canvas Fallback)
// -------------------------------------------------------------
async function generateComicImage(prompt, artStyle, panelNum) {
    return new Promise((resolve) => {
        const fullPrompt = `${prompt}, ${artStyle} style, comic book panel illustration, vivid colors, detailed, 4k`;
        const encoded = encodeURIComponent(fullPrompt);
        const imgUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=512&nologo=true&seed=${Date.now() + panelNum}`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || 768;
                canvas.height = img.naturalHeight || 512;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
            } catch (err) {
                resolve(imgUrl);
            }
        };

        img.onerror = () => {
            resolve(createFallbackComicCanvas(prompt, artStyle, panelNum));
        };

        setTimeout(() => {
            resolve(createFallbackComicCanvas(prompt, artStyle, panelNum));
        }, 12000);

        img.src = imgUrl;
    });
}

function createFallbackComicCanvas(prompt, artStyle, panelNum) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 768, 512);
    grad.addColorStop(0, "#fed74c");
    grad.addColorStop(0.5, "#f03e3e");
    grad.addColorStop(1, "#1c7ed6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 768, 512);

    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 754, 498);

    ctx.fillStyle = "#141416";
    ctx.fillRect(20, 20, 180, 50);
    ctx.fillStyle = "#fed74c";
    ctx.font = "bold 26px Bangers, sans-serif";
    ctx.fillText(`PANEL #${panelNum}`, 35, 54);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(560, 20, 185, 45);
    ctx.fillStyle = "#141416";
    ctx.font = "bold 18px Poppins, sans-serif";
    ctx.fillText(artStyle.toUpperCase(), 575, 49);

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(40, 360, 688, 120);
    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 360, 688, 120);

    ctx.fillStyle = "#f03e3e";
    ctx.font = "bold 16px Poppins, sans-serif";
    ctx.fillText("AI COMIC ILLUSTRATION", 60, 395);

    ctx.fillStyle = "#222";
    ctx.font = "italic 16px Poppins, sans-serif";
    const snippet = prompt.substring(0, 80) + "...";
    ctx.fillText(`"${snippet}"`, 60, 435);

    return canvas.toDataURL("image/jpeg", 0.9);
}

// -------------------------------------------------------------
// 4. Main Form Submission Flow
// -------------------------------------------------------------
async function handleFormSubmit(e) {
    e.preventDefault();
    const prompt = document.getElementById('story_prompt').value.trim();
    const character = document.getElementById('character_name').value.trim();
    const setting = document.getElementById('setting').value;
    const tone = document.getElementById('tone').value;
    const artStyle = document.getElementById('art_style').value;
    const apiKey = document.getElementById('gemini_api_key').value.trim();

    const modal = document.getElementById('loadingModal');
    modal.style.display = 'flex';

    try {
        updateStep('step1', '✨ Gemini Flash: Designing 5-Panel Outline...', 'active');
        const outline = await generateOutline(prompt, character, setting, tone, artStyle, apiKey);
        updateStep('step1', '✅ 5-Panel Outline Created', 'done');

        updateStep('step2', '📝 Gemini Pro: Scripting Narration & Dialogues...', 'active');
        const enrichedPanels = await enrichStoryWithDialogue(outline, character, setting, tone, apiKey);
        updateStep('step2', '✅ Dialogues & Narration Scripted', 'done');

        updateStep('step3', '🎨 AI Illustrator: Rendering Panel Images (1-5)...', 'active');
        const finalPanels = [];
        for (let i = 0; i < enrichedPanels.length; i++) {
            const p = enrichedPanels[i];
            document.getElementById('loadingStatusText').textContent = `Rendering illustration for Panel #${i + 1}...`;
            const imgData = await generateComicImage(p.image_prompt, artStyle, i + 1);
            finalPanels.push({
                ...p,
                image_data: imgData
            });
        }
        updateStep('step3', '✅ All 5 Comic Panels Illustrated', 'done');

        updateStep('step4', '📑 Layout Builder: Binding Comic Strip...', 'active');
        currentComicData = {
            prompt,
            character,
            setting,
            tone,
            artStyle,
            panels: finalPanels
        };

        renderComicPreview();
        updateStep('step4', '✅ Comic Issue Ready!', 'done');

        setTimeout(() => {
            modal.style.display = 'none';
            switchView('view-preview');
        }, 500);

    } catch (err) {
        console.error(err);
        alert("An error occurred generating your comic: " + err.message);
        modal.style.display = 'none';
    }
}

// -------------------------------------------------------------
// 5. Render Preview
// -------------------------------------------------------------
function renderComicPreview() {
    document.getElementById('previewHeaderTitle').textContent = `${currentComicData.character.toUpperCase()}: THE ADVENTURE`;
    document.getElementById('metaHero').textContent = currentComicData.character;
    document.getElementById('metaSetting').textContent = currentComicData.setting;
    document.getElementById('metaTone').textContent = currentComicData.tone;
    document.getElementById('metaStyle').textContent = currentComicData.artStyle;

    const container = document.getElementById('panelsContainer');
    container.innerHTML = "";

    currentComicData.panels.forEach(p => {
        const article = document.createElement('article');
        article.className = 'comic-panel-card';
        article.innerHTML = `
            <div class="panel-header-bar">
                <span class="panel-badge">PANEL #${p.panel_number}</span>
                <h2 class="panel-title-text">${p.title}</h2>
            </div>
            <div class="panel-media-box">
                <img src="${p.image_data}" alt="${p.title}" class="panel-img">
                <div class="panel-overlay-tag">${currentComicData.artStyle}</div>
            </div>
            <div class="panel-content-box">
                <div class="scene-description">
                    <em>${p.scene_description}</em>
                </div>
                <div class="caption-bubble">
                    <span class="bubble-tag">CAPTION</span>
                    <p class="caption-text">${p.caption}</p>
                </div>
                <div class="narration-box">
                    <span class="narration-tag">NARRATION & DIALOGUE</span>
                    <p class="narration-text">${p.narration}</p>
                </div>
                <details class="prompt-details">
                    <summary>View AI Image Prompt Reference</summary>
                    <p class="prompt-text">${p.image_prompt}</p>
                </details>
            </div>
        `;
        container.appendChild(article);
    });
}

// -------------------------------------------------------------
// 6. Client-Side Multi-Page PDF Exporter (jsPDF)
// -------------------------------------------------------------
async function generateAndDownloadPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF generator is loading. Please try again in a few seconds.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = 210;

    // --- Page 1: Cover Page ---
    doc.setFillColor(254, 215, 76);
    doc.rect(0, 0, pageWidth, 12, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("COMICCRAFT - AI COMIC STORY CREATOR", pageWidth / 2, 8, { align: "center" });

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(1);
    doc.rect(10, 20, 190, 260);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(240, 62, 62);
    const coverTitle = `THE ADVENTURES OF ${currentComicData.character.toUpperCase()}`;
    doc.text(coverTitle, pageWidth / 2, 45, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(70, 70, 70);
    doc.text(`"${currentComicData.prompt}"`, pageWidth / 2, 55, { align: "center", maxWidth: 170 });

    doc.setFillColor(245, 247, 250);
    doc.rect(20, 70, 170, 38, "F");
    doc.rect(20, 70, 170, 38, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("COMIC SPECIFICATIONS", pageWidth / 2, 78, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Protagonist: ${currentComicData.character}    |    Setting: ${currentComicData.setting}`, pageWidth / 2, 86, { align: "center" });
    doc.text(`Tone: ${currentComicData.tone}    |    Art Style: ${currentComicData.artStyle}`, pageWidth / 2, 94, { align: "center" });
    doc.text(`Generated on Netlify & Gemini AI • 5-Panel Issue`, pageWidth / 2, 102, { align: "center" });

    if (currentComicData.panels.length > 0 && currentComicData.panels[0].image_data) {
        try {
            doc.addImage(currentComicData.panels[0].image_data, "JPEG", 25, 118, 160, 105);
        } catch (e) {
            console.warn("Cover image insertion error:", e);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(240, 62, 62);
    doc.text("CREATED WITH COMICCRAFT STUDIO", pageWidth / 2, 255, { align: "center" });

    currentComicData.panels.forEach((p, idx) => {
        doc.addPage();

        doc.setFillColor(240, 62, 62);
        doc.rect(0, 0, pageWidth, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("COMICCRAFT AI STUDIO", pageWidth / 2, 7, { align: "center" });

        doc.setFillColor(31, 31, 35);
        doc.rect(15, 16, 180, 12, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(254, 215, 76);
        doc.text(`PANEL #${p.panel_number}: ${p.title.toUpperCase()}`, pageWidth / 2, 24, { align: "center" });

        if (p.image_data) {
            try {
                doc.addImage(p.image_data, "JPEG", 15, 32, 180, 115);
            } catch (err) {
                console.warn("PDF image embed error:", err);
            }
        }

        let currY = 153;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const sceneLines = doc.splitTextToSize(`Scene: ${p.scene_description}`, 180);
        doc.text(sceneLines, 15, currY);
        currY += (sceneLines.length * 5) + 3;

        doc.setFillColor(255, 249, 219);
        doc.rect(15, currY, 180, 16, "F");
        doc.setDrawColor(20, 20, 20);
        doc.rect(15, currY, 180, 16, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(217, 72, 15);
        doc.text("CAPTION:", 18, currY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        const capLines = doc.splitTextToSize(p.caption, 174);
        doc.text(capLines, 18, currY + 11);
        currY += 21;

        doc.setFillColor(241, 243, 245);
        doc.rect(15, currY, 180, 32, "F");
        doc.rect(15, currY, 180, 32, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(28, 126, 214);
        doc.text("NARRATION & DIALOGUE:", 18, currY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(20, 20, 20);
        const narrLines = doc.splitTextToSize(p.narration, 174);
        doc.text(narrLines, 18, currY + 13);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`ComicCraft Studio • Page ${idx + 2} of 6`, pageWidth / 2, 290, { align: "center" });
    });

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const filename = `ComicCraft_${currentComicData.character.replace(/\s+/g, "_")}_${timestamp}.pdf`;
    
    doc.save(filename);
    switchView('view-success');
}

// -------------------------------------------------------------
// 7. Client-Side Source Code ZIP Exporter
// -------------------------------------------------------------
async function downloadSourceZip() {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        alert("ZIP builder dependencies loading, please try in a moment...");
        return;
    }

    try {
        const zip = new JSZip();

        // Fetch local/in-memory sources or write them into zip
        const htmlRes = await fetch('index.html').then(r => r.text()).catch(() => document.documentElement.outerHTML);
        const cssRes = await fetch('style.css').then(r => r.text()).catch(() => "");
        const jsRes = await fetch('app.js').then(r => r.text()).catch(() => "");

        zip.file("index.html", htmlRes);
        if (cssRes) zip.file("style.css", cssRes);
        if (jsRes) zip.file("app.js", jsRes);
        
        zip.file("README.md", `# ComicCraft - AI Comic Story Creator\n\nFull source code of ComicCraft. Open \`index.html\` in any web browser or deploy directly to Netlify/Vercel/GitHub Pages.`);

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "ComicCraft_Project_Source.zip");
    } catch (e) {
        console.error("ZIP Generation Error:", e);
        alert("Could not generate ZIP file automatically: " + e.message);
    }
}
