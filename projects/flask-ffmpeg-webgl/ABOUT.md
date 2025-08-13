## About

This application is a **real-time WebGL2 video shader editor and processor** with FFmpeg integration.
It lets you:

* Upload a video and preview it live in the browser with custom GLSL fragment shaders.
* Edit shaders directly in a **Monaco Editor** pane.
* Adjust shader parameters in real-time using **lil-gui** controls.
* When satisfied, process the full video through the WebGL shader pipeline via FFmpeg + Node.js (`glfilter.js`) and download the rendered output.
* See live render logs and progress updates through SSE (Server-Sent Events).

The frontend (WebGL2 + Monaco + lil-gui) runs in the browser for interactive preview,
while the backend uses **Flask** (Python) to coordinate uploads, manage shader files,
and run an **FFmpeg → Node.js WebGL filter → FFmpeg** pipeline for final rendering.

---

## Installation

**Requirements**

* Node.js ≥ 18 (with `node-gyp` working)
* Python ≥ 3.10
* FFmpeg + FFprobe (in `PATH`)
* A WebGL2-capable browser

**Setup**

```bash
# Clone repository
git clone https://github.com/yourname/yourrepo.git
cd yourrepo

# Python setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Node.js dependencies for glfilter
cd path/to/glfilter
npm install

# Back to root
cd ..
```

**Run server**

```bash
source venv/bin/activate
python app.py
```

Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in a browser.

**Workflow**

1. Click **Load video…** to upload and preview a video.
2. Edit shader code in the left Monaco editor.
3. Adjust parameters in the lil-gui panel.
4. Click **Process to file** to run the shader pipeline and generate a downloadable MP4.

