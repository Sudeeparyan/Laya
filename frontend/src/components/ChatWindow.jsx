import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader, Paperclip, ArrowDown, X, FileText,
  Upload, PanelRight, ShieldCheck, Network, Mic, MicOff, Keyboard, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import SmartSuggestions from './SmartSuggestions';
import PdfPreview from './PdfPreview';
import CallbackRequestModal from './CallbackRequestModal';
import { uploadDocument } from '../services/api';

export default function ChatWindow({
  messages,
  isLoading,
  activeAgent,
  selectedMember,
  onSendMessage,
  isPanelVisible,
  onTogglePanel,
  user,
  isDeveloper,
  decision,
  flags,
  fileInputRef: externalFileRef,
  onToggleArchitecture,
  showArchitecture,
}) {
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploadedDocId, setUploadedDocId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sync file ref for keyboard shortcut
  useEffect(() => {
    if (externalFileRef) externalFileRef.current = fileRef.current;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleSend() {
    if (!input.trim()) return;
    if (!selectedMember) return;
    const fileInfo = uploadedDocId ? {
      docId: uploadedDocId,
      fileName: uploadedFile,
      fileUrl: uploadedFileUrl,
    } : null;
    onSendMessage(input, selectedMember.member_id, documentData, fileInfo);
    setInput('');
    setDocumentData(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setUploadedDocId(null);
    setShowPdfPreview(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSelectPrompt(prompt, docData = null) {
    setInput(prompt);
    if (docData) {
      setDocumentData(docData);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
    setUploading(true);
    setShowPdfPreview(false);
    toast.loading('Processing document...', { id: 'file-upload' });
    try {
      const extractedData = await uploadDocument(file);
      if (extractedData?.extracted_data) {
        setDocumentData(extractedData.extracted_data);
        toast.success('Document processed successfully', { id: 'file-upload' });
      }
      // Store file URL and doc ID for preview
      if (extractedData?.file_url) {
        setUploadedFileUrl(extractedData.file_url);
        setUploadedDocId(extractedData.doc_id);
        setShowPdfPreview(true);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to process document', { id: 'file-upload' });
    } finally {
      setUploading(false);
    }
  }

  function clearFile() {
    setDocumentData(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setUploadedDocId(null);
    setShowPdfPreview(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  // Voice input via Web Speech API
  function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IE';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'aborted') {
        toast.error('Voice recognition error: ' + event.error);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.info('Listening... Speak your claim');
  }

  // Handle smart suggestion click
  function handleSuggestionSelect(text) {
    if (!selectedMember) return;
    onSendMessage(text, selectedMember.member_id, null);
  }

  return (
    <div className="panel-center">
      {/* Top bar - enhanced */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-blue-100 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          {selectedMember ? (
            <>
              <div className="w-2 h-2 rounded-full bg-laya-green shadow-sm" />
              <span className="text-sm font-semibold text-laya-navy">
                {selectedMember.first_name} {selectedMember.last_name}
              </span>
              <span className="text-xs text-gray-400 mx-0.5">/</span>
              <span className="text-xs text-laya-blue-mid font-mono bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{selectedMember.member_id}</span>
              {isDeveloper && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200 ml-1">
                  DEV MODE
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-md shadow-blue-200">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-laya-navy">Laya AI Claims Assistant</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDeveloper && onToggleArchitecture && (
            <button
              onClick={onToggleArchitecture}
              className={`p-2 rounded-lg transition-colors ${
                showArchitecture
                  ? 'bg-pink-50 text-pink-600 border border-pink-200 shadow-sm'
                  : 'hover:bg-blue-50 text-gray-400 hover:text-laya-blue'
              }`}
              title="Toggle Architecture View"
            >
              <Network size={18} />
            </button>
          )}
          <button
            onClick={onTogglePanel}
            className={`p-2 rounded-lg transition-colors ${
              isPanelVisible
                ? 'bg-blue-50 text-laya-blue border border-blue-200 shadow-sm'
                : 'hover:bg-blue-50 text-gray-400 hover:text-laya-blue'
            }`}
            title={isPanelVisible ? 'Hide agent panel' : 'Show agent panel'}
          >
            <PanelRight size={18} />
          </button>
          {selectedMember && (
            <button
              onClick={() => setShowCallbackModal(true)}
              className="p-2 rounded-lg transition-colors hover:bg-pink-50 text-gray-400 hover:text-laya-pink border border-transparent hover:border-pink-200"
              title="Contact Customer Care"
            >
              <Headphones size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-scroll relative"
      >
        {messages.length === 0 ? (
          <WelcomeScreen
            onSelectPrompt={handleSelectPrompt}
            selectedMember={selectedMember}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-5 space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto px-6"
            >
              <div className="flex items-start gap-3 ml-1 mt-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                  <ShieldCheck size={14} className="text-white" />
                </div>
                <div className="bg-white/90 backdrop-blur-md rounded-2xl rounded-bl-md px-4 py-3 border border-blue-100 shadow-md shadow-blue-50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <span className="text-xs text-laya-blue-mid agent-pulse font-medium">
                      {activeAgent || 'Processing claim...'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Suggestions */}
        {!isLoading && messages.length > 0 && selectedMember && (
          <SmartSuggestions
            decision={decision}
            flags={flags}
            selectedMember={selectedMember}
            hasMessages={messages.length > 0}
            onSelect={handleSuggestionSelect}
            onRequestCallback={() => setShowCallbackModal(true)}
            isLoading={isLoading}
          />
        )}

        {/* Scroll to bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-lg shadow-blue-100 border border-blue-100 flex items-center justify-center hover:bg-blue-50 transition-colors z-20"
            >
              <ArrowDown size={14} className="text-laya-blue" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-100 bg-white/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {!selectedMember ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-laya-blue-mid animate-pulse" />
              Select a member from the sidebar to start chatting
            </div>
          ) : (
            <div className="space-y-2">
              {/* Attached file indicator with preview */}
              <AnimatePresence>
                {(uploadedFile || uploading) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl w-fit shadow-sm">
                      {uploading ? (
                        <>
                          <Loader size={13} className="text-laya-blue-mid animate-spin" />
                          <span className="text-laya-blue-mid font-medium">Processing document...</span>
                        </>
                      ) : (
                        <>
                          <FileText size={13} className="text-laya-blue-mid" />
                          <span className="text-laya-blue-mid font-medium truncate max-w-[200px]">{uploadedFile}</span>
                          {uploadedDocId && (
                            <button
                              onClick={() => setShowPdfPreview(!showPdfPreview)}
                              className="text-laya-blue hover:text-laya-blue-mid transition-colors p-0.5 rounded"
                              title="Toggle preview"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          )}
                          <button onClick={clearFile} className="text-gray-400 hover:text-laya-coral transition-colors p-0.5">
                            <X size={12} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Inline PDF thumbnail preview */}
                    {showPdfPreview && uploadedDocId && !uploading && (
                      <PdfPreview
                        docId={uploadedDocId}
                        fileName={uploadedFile}
                        compact={true}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="flex items-end gap-2.5">
                {/* File upload button */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 p-2.5 rounded-xl border border-blue-100 hover:border-laya-blue/40 hover:bg-blue-50 text-gray-400 hover:text-laya-blue transition-all"
                  title="Upload document (Ctrl+U)"
                  disabled={uploading}
                >
                  <Upload size={18} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />

                {/* Voice input button */}
                <button
                  onClick={toggleVoiceInput}
                  className={`shrink-0 p-2.5 rounded-xl border transition-all ${
                    isListening
                      ? 'border-laya-coral bg-red-50 text-laya-coral animate-pulse shadow-sm'
                      : 'border-blue-100 hover:border-laya-blue/40 hover:bg-blue-50 text-gray-400 hover:text-laya-blue'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening...' : 'Describe your claim or ask a question...'}
                    rows={1}
                    className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm
                      bg-blue-50/50 text-laya-navy focus:outline-none focus:ring-2 focus:ring-laya-blue/20 focus:border-laya-blue/40
                      placeholder:text-gray-400 transition-all ${
                        isListening ? 'border-laya-coral/40 bg-red-50/50' : 'border-blue-100'
                      }`}
                    disabled={isLoading}
                  />
                  {/* Keyboard shortcut hint */}
                  {!input && !isListening && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      <kbd className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-mono">Enter</kbd>
                    </div>
                  )}
                </div>

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="shrink-0 p-3 rounded-2xl bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white shadow-lg shadow-blue-200
                    hover:shadow-xl hover:shadow-blue-300 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-100 disabled:text-gray-400 disabled:from-gray-200 disabled:to-gray-200"
                >
                  {isLoading ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Callback Request Modal */}
      <CallbackRequestModal
        isOpen={showCallbackModal}
        onClose={() => setShowCallbackModal(false)}
        selectedMember={selectedMember}
        user={user}
      />
    </div>
  );
}
