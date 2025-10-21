import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [format, setFormat] = useState("mp4");// se for o formato padao ele tem que detequitaca se for vidio o padrao é mp4 se for audio é mp3 e tambem tem que vim do servidor
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [meta, setMeta] = useState({ title: null, format: null, mimeType: null, thumbnailUrl: null });
  const [taskId, setTaskId] = useState(null);
  const [running, setRunning] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const formats = ["mp4", "mkv", "webm", "mp3", "ts"]; // isso aqui tem que vim do servidor
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
      } catch {
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
    setMessage("Iniciando download...");
    setRunning(true);
    setDownloadUrl(null);
    try {
      const { data } = await axios.post("/api/download", {
        url,
        name: name || null,
        format: format || null
      });
      setTaskId(data.taskId);
      if (data.status === 'success' && data.fileUrl) {
        setDownloadUrl(data.fileUrl);
        setRunning(false);
        setProgress(100);
        setMessage("Download concluído! Clique no botão abaixo para baixar o arquivo.");
      } else {
        setProgress(0);
        setMessage("Download iniciado...");
      }
    } catch (e) {
      setRunning(false);
      setDownloadUrl(null);
      if (e.response?.data?.error) {
        setMessage("Erro: " + e.response.data.error);
      } else if (e.code === 'ERR_NETWORK') {
        setMessage("Erro de conexão: Verifique se o servidor backend está rodando.");
      } else {
        setMessage("Erro ao iniciar: " + e.message);
      }
    }
  };

  useEffect(() => {
    if (!taskId) return;
    const timer = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/progress/${taskId}`);
        setProgress(data.progress);
        setMessage(data.message);
        // Se o backend retornar fileUrl no progresso, salva para exibir botão
        if (data.fileUrl && data.progress === 100) {
          setDownloadUrl(data.fileUrl);
        }
        if (["done", "error", "cancelled"].includes(data.status)) {
          clearInterval(timer);
          setRunning(false);
        }
      } catch {
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

  const handleManualDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = name || 'video';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="downloader">
      <h2>Downloader de Vídeo</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>URL (.m3u8 / .m3u / json / arquivo):</label>
        <input
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setProgress(0);
            setMessage("");
            setTaskId(null);
            setDownloadUrl(null);
            setName("");
          }}
          placeholder="Cole a URL do vídeo aqui"
        />

        <label>Nome do arquivo (opcional):</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do arquivo" />

        <label>Formato de saída:</label>
        <select value={format} onChange={e => setFormat(e.target.value)}>
          {formats.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={startDownload} disabled={running}>⬇️ Download</button>
          <button onClick={cancelDownload} disabled={!running} className="cancel">🛑 Cancelar</button>
        </div>

        {downloadUrl && (
          <div style={{ marginTop: 10 }}>
            <button onClick={handleManualDownload} className="download-ready">
              📥 Baixar Arquivo
            </button>
            <button onClick={() => {
              setDownloadUrl(null);
              setTaskId(null);
              setProgress(0);
              setMessage("");
              setUrl("");
              setName("");
            }} style={{ marginLeft: 10 }}>
              ⚡ Fazer outro download
            </button>
          </div>
        )}

        <div className="meta-info">
          <p>Tipo detectado: <b>{url ? (url.toLowerCase().includes('m3u8') ? 'M3U8/Playlist' : 'Arquivo') : '-'}</b></p>
          <p><b>Formato:</b> {meta.format || format}</p>
          <p><b>Tipo (MIME):</b> {meta.mimeType || 'desconhecido'}</p>
          {meta.title && <p><b>Título:</b> {meta.title}</p>}
          {meta.thumbnailUrl ? (
            <img src={meta.thumbnailUrl} alt="thumbnail" width={70} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <div style={{ width: 70, height: 50, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <small>sem thumb</small>
            </div>
          )}
        </div>

        <p>Progresso: {progress}%</p>
        <progress value={progress} max="100"></progress>
        <p>{message}</p>
      </div>
    </div>
  );
}
