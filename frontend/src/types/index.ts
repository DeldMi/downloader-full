// Tipos para a configuração do servidor
export interface ServerConfig {
  formats: string[];
  defaultFormat: string;
  ui: {
    downloadButtonText: string;
    manualDownloadText: string;
    anotherDownloadText: string;
    cancelText: string;
  };
  autoDownload: boolean;
}

// Tipos para os metadados do arquivo
export interface FileMeta {
  title: string | null;
  format: string | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  type?: 'playlist' | 'file' | null;
}

// Tipos para o progresso do download
export interface DownloadProgress {
  progress: number;
  message: string;
  status: 'pending' | 'done' | 'error' | 'cancelled';
  fileUrl?: string;
}

// Tipos para a resposta do download
export interface DownloadResponse {
  taskId: string;
  status: 'success' | 'error';
  fileUrl?: string;
  error?: string;
}

// Tipos para a resposta da API de informações
export interface InfoResponse extends FileMeta {
  validFormats: string[];
}