import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [format, setFormat] = useState("mp4");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [meta, setMeta] = useState({ title: null, format: null, mimeType: null, thumbnailUrl: null });
  const [taskId, setTaskId] = useState(null);
  const [running, setRunning] = useState(false);

  const formats = ["mp4", "mkv", "webm", "mp3", "ts"];

  const detectType = (value) => {
    if (!value) return "Unknown";
    const v = value.toLowerCase();
    if (v.endsWith(".json")) return "JSON List";
    if (v.includes(".m3u8") || v.includes(".m3u")) return "M3U8/Playlist";
    if (v.startsWith("http")) return "Single Media or Playlist";
    return "Local File or Unknown";
  };

  // Debounce info fetch
  const infoTimer = useRef(null);
  useEffect(() => {
    if (infoTimer.current) clearTimeout(infoTimer.current);
    if (!url) {
      setMeta({ title: null, format: null, mimeType: null, thumbnailUrl: null });
      return;
    }
    infoTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.post('/api/info', { url });
        setMeta({
          title: data.title || null,
          format: data.format || null,
          mimeType: data.mimeType || null,
          thumbnailUrl: data.thumbnailUrl || null
        });
      } catch (err) {
        // ignore metadata errors
        console.debug('info fetch error', err);
        setMeta({ title: null, format: null, mimeType: null, thumbnailUrl: null });
      }
    }, 600);
    return () => clearTimeout(infoTimer.current);
  }, [url]);

  const startDownload = async () => {
    if (!url) {
      setMessage("Por favor, insira uma URL.");
      return;
    }
    try {
      const { data } = await axios.post("/api/download", {
        url,
        name: name || null,
        format: format || null
      });
      setTaskId(data.taskId);
      setRunning(true);
      setProgress(0);
      setMessage("Download iniciado...");
    } catch (e) {
      setMessage("Erro ao iniciar: " + e.message);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    const timer = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/progress/${taskId}`);
        setProgress(data.progress);
        setMessage(data.message);
        if (["done", "error", "cancelled"].includes(data.status)) {
          clearInterval(timer);
          setRunning(false);
        }
      } catch  {
        clearInterval(timer);
        setRunning(false);
        setMessage("Erro ao acompanhar progresso.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [taskId]);

  const cancelDownload = async () => {
    if (!taskId) return;
    try {
      await axios.post("/api/cancel", { taskId });
      setMessage("Cancelado pelo usuário.");
      setRunning(false);
    } catch {
      setMessage("Erro ao cancelar.");
    }
  };

  return (
    <div className="downloader">
      <label>URL (.m3u8 / .m3u / json / arquivo):</label>
      <input value={url} onChange={(e) => setUrl(e.target.value)} />

      <label>Nome do arquivo (opcional):</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label>Formato de saída:</label>
      <select value={format} onChange={(e) => setFormat(e.target.value)}>
        {formats.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button onClick={startDownload} disabled={running}>⬇️ Download</button>
        <button onClick={cancelDownload} disabled={!running}>🛑 Cancelar</button>
      </div>

      <p>Tipo detectado: <b>{detectType(url)}</b></p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
        <div>
          <p style={{ margin: 0 }}><b>Formato:</b> {meta.format || format}</p>
          <p style={{ margin: 0 }}><b>Tipo (MIME):</b> {meta.mimeType || 'desconhecido'}</p>
          {meta.title && <p style={{ margin: 0 }}><b>Título:</b> {meta.title}</p>}
        </div>
        <div>
          {meta.thumbnailUrl ? (
            // size 70x50
            <img src={meta.thumbnailUrl} alt="thumbnail" width={70} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <div style={{ width: 70, height: 50, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <small>sem thumb</small>
            </div>
          )}
        </div>
      </div>
      <p>Progresso: {progress}%</p>
      <progress value={progress} max="100"></progress>
      <p>{message}</p>
    </div>
  );
}
