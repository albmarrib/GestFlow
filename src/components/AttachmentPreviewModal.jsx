import React, { useEffect, useState } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  downloadAttachment,
  fetchAttachmentBlob,
  getAttachmentKind,
  withTimeout
} from '../utils/attachmentUtils';

const MAX_EXCEL_ROWS = 500;
const MAX_EXCEL_COLS = 40;
const MAX_TEXT_CHARS = 300000;

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildWordSrcDoc(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px;
    background: #f1f5f9;
    color: #1e293b;
    font-family: Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  .doc-sheet {
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    padding: 36px 42px;
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
    overflow-wrap: anywhere;
  }
  h1, h2, h3, h4 { color: #0f172a; margin: 1.2em 0 0.5em; line-height: 1.3; }
  h1 { font-size: 1.55em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h2 { font-size: 1.28em; }
  h3 { font-size: 1.1em; }
  p { margin: 0 0 0.8em; }
  ul, ol { margin: 0.4em 0 0.9em; padding-left: 1.6em; }
  li { margin-bottom: 0.25em; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.92em;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f8fafc; font-weight: 700; }
  img { max-width: 100%; height: auto; }
  @media (max-width: 640px) {
    body { padding: 10px; font-size: 14px; }
    .doc-sheet { padding: 18px 16px; }
  }
</style>
</head>
<body>
  <div class="doc-sheet">${bodyHtml}</div>
</body>
</html>`;
}

export default function AttachmentPreviewModal({ attachment, onClose, lang = 'ca' }) {
  const isCa = lang === 'ca';
  const kind = attachment ? getAttachmentKind(attachment) : 'other';
  const fileName = attachment?.name || (isCa ? 'Document adjunt' : 'Documento adjunto');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [wordHtml, setWordHtml] = useState('');
  const [textContent, setTextContent] = useState('');
  const [sheets, setSheets] = useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!attachment) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachment, onClose]);

  useEffect(() => {
    if (!attachment) return undefined;
    let cancelled = false;

    setErrorMsg('');
    setWordHtml('');
    setTextContent('');
    setSheets([]);
    setActiveSheetIdx(0);

    if (kind === 'image' || kind === 'pdf' || kind === 'doc-legacy' || kind === 'other') {
      setLoading(false);
      return undefined;
    }

    const loadPreview = async () => {
      setLoading(true);
      try {
        const blob = await fetchAttachmentBlob(attachment);
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;

        if (kind === 'docx') {
          const convertToHtml = mammoth?.convertToHtml || mammoth?.default?.convertToHtml;
          if (typeof convertToHtml !== 'function') {
            throw new Error('Conversor Word no disponible en el navegador.');
          }
          const result = await withTimeout(
            Promise.resolve(convertToHtml({ arrayBuffer: buffer })),
            15000,
            'Tiempo de espera agotado al procesar el documento Word.'
          );
          if (!cancelled) {
            setWordHtml(
              result?.value ||
                `<p style="color:#64748b">${isCa ? 'Document sense contingut visible.' : 'Documento sin contenido visible.'}</p>`
            );
          }
        } else if (kind === 'spreadsheet') {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const parsedSheets = workbook.SheetNames.map((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const totalRows = rows.length;
            const slicedRows = rows
              .slice(0, MAX_EXCEL_ROWS)
              .map((row) => (Array.isArray(row) ? row.slice(0, MAX_EXCEL_COLS) : []));
            return {
              name: sheetName,
              rows: slicedRows,
              truncated: totalRows > MAX_EXCEL_ROWS
            };
          });
          if (!cancelled) {
            setSheets(parsedSheets);
          }
        } else if (kind === 'text') {
          const rawText = new TextDecoder('utf-8').decode(buffer);
          if (!cancelled) {
            setTextContent(
              rawText.length > MAX_TEXT_CHARS
                ? `${rawText.slice(0, MAX_TEXT_CHARS)}\n\n... (${isCa ? 'Contingut truncat per a vista prèvia' : 'Contenido truncado para vista previa'})`
                : rawText
            );
          }
        }
      } catch (err) {
        console.error('Error previsualizando adjunto:', err);
        if (!cancelled) {
          const errDetail = err?.message || '';
          const isCorsOrNet =
            Boolean(err?.isCors) ||
            errDetail.includes('Failed to fetch') ||
            err?.code === 'storage/unknown' ||
            err?.name === 'AbortError' ||
            err?.name === 'TypeError';
          setErrorMsg(
            isCorsOrNet
              ? isCa
                ? 'No s\'ha pogut llegir el document en línia (xarxa o CORS de Storage). Pots baixar-lo amb el botó Descarregar.'
                : 'No se pudo leer el documento en línea (red o CORS de Storage). Puedes bajarlo con el botón Descargar.'
              : `${
                  isCa
                    ? 'No s\'ha pogut generar la vista prèvia d\'aquest fitxer.'
                    : 'No se pudo generar la vista previa de este archivo.'
                }${errDetail ? ` (${errDetail})` : ''}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [attachment, kind, isCa]);

  if (!attachment) return null;

  const handleDownloadClick = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(attachment);
    } finally {
      setDownloading(false);
    }
  };

  const currentSheet = sheets[activeSheetIdx];

  const renderIcon = () => {
    if (kind === 'spreadsheet') return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (kind === 'image') return <ImageIcon className="w-4 h-4 text-indigo-600" />;
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del visor */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={fileName}>
                {fileName}
              </h4>
              <p className="text-[10px] text-slate-500">
                {isCa ? 'Vista prèvia privada al navegador' : 'Vista previa privada en el navegador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(kind === 'pdf' || kind === 'image') && attachment.url && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                title={isCa ? 'Obrir en pestanya nova' : 'Abrir en pestaña nueva'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isCa ? 'Pestanya' : 'Pestaña'}</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isCa ? 'Descarregar' : 'Descargar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title={isCa ? 'Tancar' : 'Cerrar'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del visor */}
        <div className="flex-1 overflow-auto bg-slate-100/80 p-3 sm:p-4">
          {loading && (
            <div className="h-[55vh] flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">
                {isCa ? 'Carregant vista prèvia del document...' : 'Cargando vista previa del documento...'}
              </p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="max-w-lg mx-auto my-12 bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-slate-800">{errorMsg}</p>
              <button
                type="button"
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isCa ? 'Descarregar arxiu' : 'Descargar archivo'}</span>
              </button>
            </div>
          )}

          {!loading && !errorMsg && kind === 'image' && (
            <div className="min-h-[55vh] flex items-center justify-center">
              <img
                src={attachment.url}
                alt={fileName}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md bg-white"
              />
            </div>
          )}

          {!loading && !errorMsg && kind === 'pdf' && (
            <iframe
              src={attachment.url}
              title={fileName}
              className="w-full h-[74vh] rounded-xl border border-slate-200 bg-white"
            />
          )}

          {!loading && !errorMsg && kind === 'docx' && wordHtml && (
            <iframe
              title={fileName}
              sandbox=""
              srcDoc={buildWordSrcDoc(wordHtml, fileName)}
              className="w-full h-[74vh] rounded-xl border border-slate-200 bg-white"
            />
          )}

          {!loading && !errorMsg && kind === 'spreadsheet' && sheets.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[74vh]">
              {sheets.length > 1 && (
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
                  {sheets.map((sh, idx) => (
                    <button
                      key={sh.name}
                      type="button"
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        activeSheetIdx === idx
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sh.name}
                    </button>
                  ))}
                </div>
              )}

              {currentSheet?.truncated && (
                <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] font-medium text-amber-800 shrink-0">
                  {isCa
                    ? `Mostrant les primeres ${MAX_EXCEL_ROWS} files. Descarrega el fitxer per veure-ho sencer.`
                    : `Mostrando las primeras ${MAX_EXCEL_ROWS} filas. Descarga el archivo para verlo completo.`}
                </div>
              )}

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    {(currentSheet?.rows || []).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? 'bg-slate-100 font-bold text-slate-800 sticky top-0' : rIdx % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}
                      >
                        <td className="px-2 py-1.5 border border-slate-200 text-[10px] text-slate-400 font-mono select-none w-10 text-center">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-700 whitespace-pre-wrap max-w-[260px]"
                          >
                            {cell === null || cell === undefined ? '' : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !errorMsg && kind === 'text' && (
            <pre className="bg-white rounded-xl border border-slate-200 p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-auto h-[74vh]">
              {textContent}
            </pre>
          )}

          {!loading && !errorMsg && (kind === 'doc-legacy' || kind === 'other') && (
            <div className="max-w-lg mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h5 className="text-sm font-bold text-slate-800">
                {kind === 'doc-legacy'
                  ? isCa
                    ? 'Format Word antic (.doc)'
                    : 'Formato Word antiguo (.doc)'
                  : isCa
                    ? 'Vista prèvia no disponible per a aquest tipus de fitxer'
                    : 'Vista previa no disponible para este tipo de archivo'}
              </h5>
              <p className="text-xs text-slate-500">
                {kind === 'doc-legacy'
                  ? isCa
                    ? 'Els documents .doc antics (anteriors a Word 2007) no es poden previsualitzar al navegador. Els .docx moderns sí que es mostren aquí.'
                    : 'Los documentos .doc antiguos (anteriores a Word 2007) no se pueden previsualizar en el navegador. Los .docx modernos sí se muestran aquí.'
                  : isCa
                    ? 'Pots descarregar l\'arxiu al teu dispositiu per obrir-lo amb el programa corresponent.'
                    : 'Puedes descargar el archivo a tu dispositivo para abrirlo con su aplicación correspondiente.'}
              </p>
              <button
                type="button"
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isCa ? 'Descarregar arxiu' : 'Descargar archivo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
