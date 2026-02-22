import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader, Paperclip, ArrowDown, X, FileText,
  Upload, PanelRight, ShieldCheck, Network, Mic, MicOff, Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import SmartSuggestions from './SmartSuggestions';
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
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    onSendMessage(input, selectedMember.member_id, documentData);
    setInput('');
    setDocumentData(null);
    setUploadedFile(null);
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
    toast.loading('Processing document...', { id: 'file-upload' });
    try {
      const extractedData = await uploadDocument(file);
      if (extractedData?.extracted_data) {
        setDocumentData(extractedData.extracted_data);
        toast.success('Document processed successfully', { id: 'file-upload' });
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100/80 bg-white/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          {selectedMember ? (
            <>
              <div className="w-2 h-2 rounded-full bg-laya-green shadow-sm shadow-laya-green/50" />
              <span className="text-sm font-semibold text-laya-navy">
                {selectedMember.first_name} {selectedMember.last_name}
              </span>
              <span className="text-xs text-gray-300 mx-0.5">/</span>
              <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-md">{selectedMember.member_id}</span>
              {isDeveloper && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full badge-developer ml-1">
                  DEV MODE
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center">
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
                  ? 'bg-purple-100 text-purple-600'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
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
                ? 'bg-laya-teal/10 text-laya-teal'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
            title={isPanelVisible ? 'Hide agent panel' : 'Show agent panel'}
          >
            <PanelRight size={18} />
          </button>
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
                <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck size={14} className="text-white" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <span className="text-xs text-gray-400 agent-pulse">
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
              className="sticky bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-20"
            >
              <ArrowDown size={14} className="text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {!selectedMember ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
              Select a member from the sidebar to start chatting
            </div>
          ) : (
            <div className="space-y-2">
              {/* Attached file indicator */}
              <AnimatePresence>
                {(uploadedFile || uploading) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-xs bg-laya-teal/5 border border-laya-teal/15 px-3 py-2 rounded-xl w-fit"
                  >
                    {uploading ? (
                      <>
                        <Loader size={13} className="text-laya-teal animate-spin" />
                        <span className="text-laya-teal font-medium">Processing document...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={13} className="text-laya-teal" />
                        <span className="text-laya-teal font-medium truncate max-w-[200px]">{uploadedFile}</span>
                        <button onClick={clearFile} className="text-gray-400 hover:text-laya-coral transition-colors p-0.5">
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="flex items-end gap-2.5">
                {/* File upload button */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 p-2.5 rounded-xl border border-gray-200 hover:border-laya-teal/40 hover:bg-laya-teal/5 text-gray-400 hover:text-laya-teal transition-all"
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
                      ? 'border-laya-coral bg-laya-coral/10 text-laya-coral animate-pulse'
                      : 'border-gray-200 hover:border-laya-teal/40 hover:bg-laya-teal/5 text-gray-400 hover:text-laya-teal'
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
                      bg-white focus:outline-none focus:ring-2 focus:ring-laya-teal/20 focus:border-laya-teal/40
                      placeholder:text-gray-400 transition-all ${
                        isListening ? 'border-laya-coral/40 bg-red-50/30' : 'border-gray-200'
                      }`}
                    disabled={isLoading}
                  />
                  {/* Keyboard shortcut hint */}
                  {!input && !isListening && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      <kbd className="text-[9px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-mono">Enter</kbd>
                    </div>
                  )}
                </div>

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="shrink-0 p-3 rounded-2xl gradient-teal text-white shadow-md shadow-laya-teal/20
                    hover:shadow-lg hover:shadow-laya-teal/30 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
    </div>
  );
}
