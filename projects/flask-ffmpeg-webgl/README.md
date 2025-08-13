# WebGL2 Video Shader Editor & Processor

A real-time WebGL2 video shader playground with FFmpeg rendering backend.  
Upload a video, tweak GLSL fragment shaders live in Monaco Editor, adjust parameters with lil-gui,  
and render the processed result to an MP4 file.

---

## ✨ Features
- **Live WebGL2 Preview** — edit shaders and see instant changes in the browser.
- **Monaco Editor** — full GLSL syntax highlighting & editing.
- **lil-gui Controls** — adjust shader uniforms in real-time.
- **One-Click Processing** — render your shader pipeline on the server via FFmpeg + Node.js WebGL filter.
- **Live Logs & Progress** — see render progress with SSE updates.
- **Download Result** — get your processed MP4 with original audio preserved.

---

## 📦 Requirements
- **Python** ≥ 3.10
- **Node.js** ≥ 18 (with `node-gyp` working)
- **FFmpeg** & **FFprobe** in your `PATH`
- A WebGL2-capable browser (Chrome, Firefox, Edge…)

---

## ⚙️ Installation

```bash
# Clone repository
git clone https://github.com/yourname/yourrepo.git
cd yourrepo

# Python environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Node.js dependencies for glfilter
cd path/to/glfilter
npm install
cd ..
````

---

## 🚀 Running the App

```bash
source venv/bin/activate
python app.py
```

Then open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

---

## 🖥️ Usage

1. Click **Load video…** to select and upload a video.
2. Edit shader code in the **Monaco Editor** (left panel).
3. Adjust parameters in the **lil-gui** panel.
4. Preview changes in real time in the **WebGL2 canvas**.
5. Click **Process to file** to render the video with your shader.
6. Download the processed MP4.

---

## 🛠️ Tech Stack

* **Frontend:** WebGL2, Monaco Editor, lil-gui
* **Backend:** Python Flask
* **Processing:** FFmpeg, Node.js (`glfilter.js`)
* **Transport:** Server-Sent Events for progress updates

---

## 📄 License

MIT License — see `LICENSE` for details.


