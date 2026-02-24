/**
 * PdfPreview — Inline PDF/image preview panel for chat.
 * Shows a thumbnail preview of the uploaded document that can expand to full view.
 * Used in both customer chat (side panel) and developer dashboard.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Maximize2, Minimize2, ExternalLink, Eye } from 'lucide-react';
import { getFilePreviewUrl } from '../services/api';

export default function PdfPreview({ fileUrl, fileName, docId, onClose, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  // Build full URL for the file
  const previewUrl = docId ? getFilePreviewUrl(docId) : fileUrl;
  const isPdf = (fileName || '').toLowerCase().endsWith('.pdf');
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName || '');

  if (!previewUrl) return null;

  // Compact mode — small thumbnail in chat input area
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative group"
      >
        <div
          onClick={() => setExpanded(true)}
          className="w-48 h-32 rounded-xl border-2 border-blue-200 overflow-hidden cursor-pointer
            hover:border-laya-blue hover:shadow-lg transition-all bg-white relative"
        >
          {isPdf ? (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              title="PDF Preview"
              className="w-full h-full pointer-events-none"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
            />
          ) : isImage ? (
            <img src={previewUrl} alt={fileName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <FileText size={32} className="text-gray-300" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg px-3 py-1.5 shadow-md flex items-center gap-1.5">
              <Eye size={12} className="text-laya-blue" />
              <span className="text-[10px] font-semibold text-laya-navy">Preview</span>
            </div>
          </div>
        </div>

        {/* File name label */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <FileText size={11} className="text-laya-blue-mid shrink-0" />
          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{fileName}</span>
        </div>

        {/* Full preview modal */}
        <AnimatePresence>
          {expanded && (
            <PdfPreviewModal
              previewUrl={previewUrl}
              fileName={fileName}
              isPdf={isPdf}
              isImage={isImage}
              onClose={() => setExpanded(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Full panel mode — side panel preview
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden flex flex-col"
      style={{ height: expanded ? '90vh' : '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-laya-blue/10 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-laya-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-laya-navy truncate">{fileName || 'Document'}</p>
            <p className="text-[10px] text-gray-400">Uploaded document preview</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-laya-blue transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-laya-blue transition-colors"
            title={expanded ? 'Minimize' : 'Maximize'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-laya-coral transition-colors"
              title="Close preview"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {isPdf ? (
          <iframe
            src={`${previewUrl}#toolbar=1&navpanes=0`}
            title="PDF Preview"
            className="w-full h-full border-0"
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img src={previewUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Preview not available for this file type</p>
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="mt-3 px-4 py-2 rounded-lg bg-laya-blue text-white text-xs font-medium hover:bg-laya-blue-mid transition-colors"
              >
                Download File
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}


/**
 * Full-screen modal preview for PDFs
 */
function PdfPreviewModal({ previewUrl, fileName, isPdf, isImage, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-laya-blue/10 flex items-center justify-center">
              <FileText size={18} className="text-laya-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-laya-navy">{fileName || 'Document Preview'}</p>
              <p className="text-[10px] text-gray-400">Full document view</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-laya-blue hover:bg-blue-50 transition-colors"
            >
              <ExternalLink size={12} />
              Open in tab
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-laya-coral transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {isPdf ? (
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              title="PDF Preview"
              className="w-full h-full border-0"
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <img src={previewUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText size={64} className="text-gray-300" />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export { PdfPreviewModal };
