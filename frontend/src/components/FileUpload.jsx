// FileUpload — drag & drop / click-to-upload document component with demo document selector

import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_SCENARIOS } from '../utils/constants';
import { uploadDocument } from '../services/api';

export default function FileUpload({ onDocumentReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function processFile(file) {
    setUploaded(file.name);
    setUploading(true);
    try {
      const extractedData = await uploadDocument(file);
      if (extractedData && extractedData.extracted_data) {
        onDocumentReady(extractedData.extracted_data, { name: file.name, member: '' });
      } else {
        onDocumentReady(null, { name: file.name, member: '' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      onDocumentReady(null, { name: file.name, member: '' });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function useDemoDoc(scenario) {
    onDocumentReady(scenario.document, scenario);
    setUploaded(`Demo: ${scenario.name}`);
  }

  function clearUpload() {
    setUploaded(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-laya-blue-mid bg-laya-blue-mid/5 shadow-inner'
            : uploaded
            ? 'border-laya-blue-mid/30 bg-laya-blue-mid/3'
            : 'border-gray-200 hover:border-laya-blue-mid/40 hover:bg-gray-50/50'
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
        />
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-sm text-laya-blue-mid py-1"
            >
              <Loader size={18} className="animate-spin" />
              <span className="font-medium">Processing document...</span>
            </motion.div>
          ) : uploaded ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-sm text-laya-blue-mid py-1"
            >
              <FileText size={18} />
              <span className="font-medium truncate max-w-[160px]">{uploaded}</span>
              <button
                onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                className="text-gray-400 hover:text-laya-coral transition-colors ml-1 p-0.5 rounded-full hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 py-1"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <Upload size={20} className="text-gray-400" />
              </div>
              <p className="text-xs font-medium text-gray-500">Drop a document or click to upload</p>
              <p className="text-[10px] text-gray-400 mt-0.5">PDF, PNG, JPG accepted</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Demo Document Buttons */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap size={10} className="text-laya-amber" />
          Quick Demo Scenarios
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_SCENARIOS.map((scenario, i) => (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => useDemoDoc(scenario)}
              className="text-left px-2.5 py-2 rounded-xl border border-gray-100 
                hover:border-laya-blue-mid/30 hover:bg-laya-blue-mid/3 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-laya-navy text-[11px] block truncate">{scenario.name}</span>
                <ChevronRight size={10} className="text-gray-400 group-hover:text-laya-blue-mid transition-colors shrink-0" />
              </div>
              <span className="text-[10px] text-gray-400 block mt-0.5 truncate">{scenario.member}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
