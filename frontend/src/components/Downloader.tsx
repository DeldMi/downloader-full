import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ServerConfig, FileMeta, DownloadResponse, DownloadProgress } from "@/types";

export default function Downloader() {
  const [url, setUrl] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [format, setFormat] = useState<string>();
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [meta, setMeta] = useState<FileMeta>({ 
    title: null, 
    format: null, 
    mimeType: null, 
    thumbnailUrl: null 
  });
  const [taskId, setTaskId] = useState<string | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]); 
  const infoTimer = useRef<NodeJS.Timeout | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  // Atualizar formato automaticamente quando metadata mudar
  useEffect(() => {
    if (meta?.format && availableFormats.includes(meta.format)) {
      setFormat(meta.format);
    } else if (serverConfig?.defaultFormat && availableFormats.includes(serverConfig.defaultFormat)) {
      setFormat(serverConfig.defaultFormat);
    }
  }, [meta, serverConfig, availableFormats]);

  useEffect(() => {
    // carregar configurações do servidor
    (async () => {
      try {
        const { data } = await axios.get<{ config: ServerConfig }>('/api/config');
        setServerConfig(data.config || null);
        if (data.config && Array.isArray(data.config.formats)) {
          setAvailableFormats(data.config.formats);
        }
        if (data.config && data.config.defaultFormat) {
          setFormat(data.config.defaultFormat);
        }
      } catch {
        // ignore
      }
    })();

    if (infoTimer.current) clearTimeout(infoTimer.current);
    if (!url) {
      setMeta({ title: null, format: null, mimeType: null, thumbnailUrl: null });
      return;
    }
    infoTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.post<FileMeta>('/api/info', { url });
        setMeta({
          title: data.title || null,
          format: data.format || null,
          mimeType: data.mimeType || null,
          thumbnailUrl: data.thumbnailUrl || null,
          type: data.type || null
        });
      } catch {
        setMeta({ title: null, format: null, mimeType: null, thumbnailUrl: null });
      }
    }, 600);
    return () => {
      if (infoTimer.current) clearTimeout(infoTimer.current);
    };
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
      const { data } = await axios.post<DownloadResponse>("/api/download", {
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
    } catch (e: any) {
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
        const { data } = await axios.get<DownloadProgress>(`/api/progress/${taskId}`);
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
            const v = e.target.value;
            setUrl(v);
            setProgress(0);
            setMessage("");
            setTaskId(null);
            setDownloadUrl(null);
            setName("");
            // reset format to server default if provided
            if (serverConfig?.defaultFormat) setFormat(serverConfig.defaultFormat);
          }}
          placeholder="Cole a URL do vídeo aqui"
        />

        <label>Nome do arquivo (opcional):</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do arquivo" />

        <label>Formato de saída:</label>
        <select value={format} onChange={e => setFormat(e.target.value)}>
          {availableFormats.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={startDownload} disabled={running}>
            {serverConfig?.ui?.downloadButtonText || '⬇️ Download'}
          </button>
          <button onClick={cancelDownload} disabled={!running} className="cancel">
            🛑 {serverConfig?.ui?.cancelText || 'Cancelar'}
          </button>
        </div>

        {downloadUrl && (
          <div style={{ marginTop: 10 }}>
            <button onClick={handleManualDownload} className="download-ready">
              {serverConfig?.ui?.manualDownloadText || '📥 Baixar Arquivo'}
            </button>
            <button onClick={() => {
              setDownloadUrl(null);
              setTaskId(null);
              setProgress(0);
              setMessage("");
              setUrl("");
              setName("");
            }} style={{ marginLeft: 10 }}>
              {serverConfig?.ui?.anotherDownloadText || '⚡ Fazer outro download'}
            </button>
          </div>
        )}

        <div className="meta-info">
          <p>Tipo detectado: <b>{meta.type ? (meta.type === 'playlist' ? 'M3U8/Playlist' : 'Arquivo') : '-'}</b></p>
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