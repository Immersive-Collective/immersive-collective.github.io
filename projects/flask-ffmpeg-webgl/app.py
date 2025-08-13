from flask import Flask, render_template, request, jsonify, Response, send_from_directory
from subprocess import Popen, PIPE
import os, uuid, json, shlex, threading, tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GLFILTER = os.path.join(BASE_DIR, "glfilter.js")

app = Flask(__name__, template_folder="templates", static_folder="static")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

clients = {}  # job_id -> list of SSE messages

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/uploads/<name>")
def uploads(name):
    return send_from_directory(UPLOAD_DIR, name)

@app.post("/upload")
def upload():
    f = request.files.get("video")
    if not f:
        return jsonify(ok=False), 400
    name = f"{uuid.uuid4().hex}_{f.filename.replace(' ','_')}"
    path = os.path.join(UPLOAD_DIR, name)
    f.save(path)
    return jsonify(ok=True, filename=name, url=f"/uploads/{name}")

@app.get("/logs/<job_id>")
def logs(job_id):
    def stream():
        q = clients.get(job_id)
        last = 0
        while q is not None:
            while q and last < len(q):
                line = q[last]; last += 1
                yield f"data: {json.dumps(line)}\n\n"
            if q and (q[-1].get("done") or q[-1].get("error")):
                break
        yield ""
    return Response(stream(), mimetype="text/event-stream")

def ffprobe_info(path):
    cmd = [
        "ffprobe","-v","error",
        "-select_streams","v:0",
        "-show_entries","stream=width,height,duration",
        "-of","json", path
    ]
    p = Popen(cmd, stdout=PIPE, stderr=PIPE, text=True)
    out,_ = p.communicate()
    try:
        j = json.loads(out); s = j["streams"][0]
        return int(s.get("width",720)), int(s.get("height",1280)), float(s.get("duration",0.0))
    except Exception:
        return 720,1280,0.0

@app.post("/run")
def run():
    data = request.get_json(force=True)
    fname = data.get("filename")
    shader_src = data.get("shader", "")
    params = data.get("params", {}) or {}
    fps = int(data.get("fps", 120))

    if not fname:
        return jsonify(ok=False), 400
    if not os.path.exists(GLFILTER):
        return jsonify(ok=False, error="glfilter.js not found"), 500

    in_path = os.path.join(UPLOAD_DIR, fname)
    W,H,dur = ffprobe_info(in_path)
    job = uuid.uuid4().hex
    out_name = os.path.splitext(fname)[0] + f"_webgl_{fps}.mp4"
    out_path = os.path.join(OUT_DIR, out_name)
    clients[job] = []

    # write temp shader file
    tmp_shader = tempfile.NamedTemporaryFile(prefix="shader_", suffix=".frag", delete=False, dir=BASE_DIR)
    tmp_shader.write(shader_src.encode("utf-8"))
    tmp_shader.flush()
    tmp_shader.close()
    shader_path = tmp_shader.name

    # ffmpeg -> node glfilter (with temp shader + params via env) -> ffmpeg
    pipe = (
        f'ffmpeg -hide_banner -y -i {shlex.quote(in_path)} '
        f'-vf "fps={fps},scale={W}:{H}" -pix_fmt rgba -f rawvideo - | '
        f'node {shlex.quote(GLFILTER)} {W} {H} {fps} {shlex.quote(shader_path)} | '
        f'ffmpeg -hide_banner -y -f rawvideo -pix_fmt rgba -s {W}x{H} -r {fps} -i - '
        f'-i {shlex.quote(in_path)} -map 0:v -map 1:a? '
        f'-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -preset veryfast -crf 20 '
        f'-c:a aac -b:a 160k -movflags +faststart -shortest '
        f'-nostats -loglevel error -progress pipe:2 '
        f'{shlex.quote(out_path)}'
    )

    def worker():
        q = clients[job]
        env = os.environ.copy()
        env["GL_PARAMS_JSON"] = json.dumps(params)
        p = Popen(["bash","-lc", pipe], cwd=BASE_DIR, stdout=PIPE, stderr=PIPE, text=True, env=env)
        try:
            while True:
                line = p.stderr.readline()
                if not line:
                    break
                s = line.strip()
                if s.startswith("out_time_ms="):
                    val = s.split("=",1)[1].strip()
                    if val.isdigit() and dur > 0:
                        ms = int(val)
                        pct = min(100, round((ms/1_000_000.0)/dur*100))
                        q.append({"progress": pct})
                    continue
                if s.startswith("out_time=") and dur > 0:
                    try:
                        t = s.split("=",1)[1].strip()
                        hh, mm, ss = t.split(":")
                        seconds = int(hh)*3600 + int(mm)*60 + float(ss)
                        pct = min(100, round((seconds/dur)*100))
                        q.append({"progress": pct})
                    except Exception:
                        pass
                    continue
                q.append({"log": line})
            code = p.wait()
            if code == 0:
                q.append({"done": True, "url": f"/download/{out_name}"})
            else:
                q.append({"error": True})
        finally:
            try: os.unlink(shader_path)
            except Exception: pass

    threading.Thread(target=worker, daemon=True).start()
    return jsonify(ok=True, job=job)

@app.get("/download/<name>")
def download(name):
    return send_from_directory(OUT_DIR, name, as_attachment=True)

if __name__ == "__main__":
    app.run(port=5000, debug=False)
