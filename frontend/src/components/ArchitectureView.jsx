/**
 * ArchitectureView — Live interactive architecture visualization
 * Shows the full agent pipeline as an animated flow diagram.
 * Nodes light up in real-time as each agent processes.
 * Developer-only feature for monitoring the AI pipeline.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Cpu, GitBranch, CheckCircle, XCircle, Loader,
  Circle, Zap, Database, FileSearch, Brain, Stethoscope,
  Building2, AlertTriangle, ChevronDown, ChevronRight,
  Activity, ArrowRight, Layers, Network, Eye, Search,
  X
} from 'lucide-react';

// ── Node definitions matching the backend graph flow ──
const NODES = [
  {
    id: 'user',
    label: 'User Input',
    icon: Shield,
    desc: 'Message + Document data',
    x: 50, y: 8,
    type: 'endpoint',
    keywords: [],
  },
  {
    id: 'setup',
    label: 'Setup Node',
    icon: Database,
    desc: 'Load member data, parse message, enrich document',
    x: 50, y: 20,
    type: 'process',
    keywords: ['setup'],
  },
  {
    id: 'intake',
    label: 'Intake Agent',
    icon: FileSearch,
    desc: 'Form classification, data extraction, compliance check',
    x: 25, y: 35,
    type: 'validation',
    keywords: ['intake', 'form classifier', 'compliance'],
    children: ['Form Classifier', 'Data Extractor', 'Compliance Checker'],
  },
  {
    id: 'eligibility',
    label: 'Eligibility Agent',
    icon: Search,
    desc: '12-week waiting, submission deadline, quarterly threshold, duplicates',
    x: 75, y: 35,
    type: 'validation',
    keywords: ['eligibility', 'waiting period', 'threshold', 'duplicate'],
    children: ['Waiting Period', 'Submission Deadline', 'Quarterly Threshold', 'Duplicate Check'],
  },
  {
    id: 'principal',
    label: 'Principal Agent',
    icon: Brain,
    desc: 'GPT-4o powered routing: outpatient, hospital, or exceptions',
    x: 50, y: 50,
    type: 'router',
    keywords: ['principal'],
  },
  {
    id: 'outpatient',
    label: 'Outpatient Agent',
    icon: Stethoscope,
    desc: 'GP, Consultant, Prescription, Dental, Optical, Scans',
    x: 20, y: 65,
    type: 'specialist',
    keywords: ['outpatient', 'gp', 'consultant', 'pharmacy', 'therapy', 'dental', 'optical', 'scan'],
    children: ['GP & A&E', 'Consultant Fee', 'Prescription', 'Dental & Optical', 'Day-to-Day Therapy', 'Scan Cover'],
  },
  {
    id: 'hospital',
    label: 'Hospital Agent',
    icon: Building2,
    desc: 'Inpatient stays, procedure validation, €20/day payout',
    x: 50, y: 65,
    type: 'specialist',
    keywords: ['hospital', 'inpatient'],
    children: ['Invoice Check', 'Procedure Validator', 'Payout Calculator'],
  },
  {
    id: 'exceptions',
    label: 'Exceptions Agent',
    icon: AlertTriangle,
    desc: 'Maternity, third-party/solicitor, duplicate/fraud',
    x: 80, y: 65,
    type: 'specialist',
    keywords: ['exceptions', 'maternity'],
    children: ['Maternity Handler', 'Legal Review', 'Fraud Detector'],
  },
  {
    id: 'decision',
    label: 'Decision Agent',
    icon: CheckCircle,
    desc: 'Aggregate results, update database, personalize response',
    x: 50, y: 80,
    type: 'decision',
    keywords: ['decision agent'],
  },
  {
    id: 'result',
    label: 'Final Result',
    icon: Zap,
    desc: 'APPROVED / REJECTED / PARTIALLY APPROVED',
    x: 50, y: 92,
    type: 'endpoint',
    keywords: [],
  },
];

// ── Edge definitions ──
const EDGES = [
  { from: 'user', to: 'setup', label: 'Message' },
  { from: 'setup', to: 'intake', label: 'Parallel' },
  { from: 'setup', to: 'eligibility', label: 'Parallel' },
  { from: 'intake', to: 'principal', label: '' },
  { from: 'eligibility', to: 'principal', label: '' },
  { from: 'principal', to: 'outpatient', label: 'Route' },
  { from: 'principal', to: 'hospital', label: 'Route' },
  { from: 'principal', to: 'exceptions', label: 'Route' },
  { from: 'outpatient', to: 'decision', label: '' },
  { from: 'hospital', to: 'decision', label: '' },
  { from: 'exceptions', to: 'decision', label: '' },
  { from: 'decision', to: 'result', label: 'Result' },
];

function getNodeStatus(node, agentTrace, isProcessing, decision) {
  if (!agentTrace || agentTrace.length === 0) {
    if (node.id === 'user') return 'completed';
    if (isProcessing && node.id === 'setup') return 'active';
    return 'pending';
  }

  if (node.id === 'user') return 'completed';
  if (node.id === 'result') {
    if (decision && !isProcessing) return decision === 'REJECTED' ? 'failed' : 'completed';
    return 'pending';
  }

  const traceText = agentTrace.join(' ').toLowerCase();
  const found = node.keywords.some(kw => traceText.includes(kw));

  if (!found) {
    // Check if a later node is active/completed
    const nodeOrder = ['setup', 'intake', 'eligibility', 'principal', 'outpatient', 'hospital', 'exceptions', 'decision'];
    const myIdx = nodeOrder.indexOf(node.id);
    const laterActive = nodeOrder.slice(myIdx + 1).some(nid => {
      const n = NODES.find(n => n.id === nid);
      return n?.keywords.some(kw => traceText.includes(kw));
    });
    if (laterActive) return 'skipped';
    if (isProcessing) {
      const completed = nodeOrder.filter(nid => {
        const n = NODES.find(n => n.id === nid);
        return n?.keywords.some(kw => traceText.includes(kw));
      });
      const lastIdx = nodeOrder.indexOf(completed[completed.length - 1]);
      if (myIdx === lastIdx + 1) return 'active';
    }
    return 'pending';
  }

  // Check for failures
  const nodeTraces = agentTrace.filter(t => node.keywords.some(kw => t.toLowerCase().includes(kw)));
  const hasFail = nodeTraces.some(t => t.toLowerCase().includes('rejected') || t.toLowerCase().includes('error'));
  if (hasFail && decision === 'REJECTED') return 'failed';

  if (isProcessing) {
    const nodeOrder = ['setup', 'intake', 'eligibility', 'principal', 'outpatient', 'hospital', 'exceptions', 'decision'];
    const myIdx = nodeOrder.indexOf(node.id);
    const laterActive = nodeOrder.slice(myIdx + 1).some(nid => {
      const n = NODES.find(n => n.id === nid);
      return n?.keywords.some(kw => traceText.includes(kw));
    });
    if (!laterActive) return 'active';
  }

  return 'completed';
}

const nodeColors = {
  pending: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-400', glow: '' },
  active: { bg: 'bg-laya-teal/10', border: 'border-laya-teal', text: 'text-laya-teal', glow: 'shadow-lg shadow-laya-teal/30' },
  completed: { bg: 'bg-green-50', border: 'border-laya-green', text: 'text-laya-green', glow: '' },
  failed: { bg: 'bg-red-50', border: 'border-laya-coral', text: 'text-laya-coral', glow: '' },
  skipped: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-300', glow: '' },
};

const typeGradients = {
  endpoint: 'from-laya-teal to-cyan-500',
  process: 'from-blue-500 to-indigo-500',
  validation: 'from-amber-500 to-orange-500',
  router: 'from-purple-500 to-violet-500',
  specialist: 'from-laya-teal to-emerald-500',
  decision: 'from-laya-green to-emerald-600',
};

function FlowEdge({ from, to, status }) {
  const fromNode = NODES.find(n => n.id === from);
  const toNode = NODES.find(n => n.id === to);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x;
  const y1 = fromNode.y + 4;
  const x2 = toNode.x;
  const y2 = toNode.y - 1;

  const strokeColor =
    status === 'active' ? '#00A99D' :
    status === 'completed' ? '#27AE60' :
    status === 'failed' ? '#E85D4A' :
    '#E5E7EB';

  const midY = (y1 + y2) / 2;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {status === 'active' && (
          <linearGradient id={`edge-grad-${from}-${to}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27AE60" />
            <stop offset="100%" stopColor="#00A99D" />
          </linearGradient>
        )}
      </defs>
      <path
        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
        fill="none"
        stroke={status === 'active' ? `url(#edge-grad-${from}-${to})` : strokeColor}
        strokeWidth={status === 'active' || status === 'completed' ? 0.4 : 0.2}
        strokeDasharray={status === 'pending' ? '1,1' : 'none'}
        opacity={status === 'pending' ? 0.4 : 0.8}
      />
      {status === 'active' && (
        <circle r="0.6" fill="#00A99D">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
          />
        </circle>
      )}
    </svg>
  );
}

function FlowNode({ node, status, onClick, isSelected }) {
  const colors = nodeColors[status] || nodeColors.pending;
  const Icon = node.icon;
  const gradient = typeGradients[node.type] || typeGradients.process;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: NODES.indexOf(node) * 0.05 }}
      className="absolute cursor-pointer group"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
      onClick={() => onClick(node)}
    >
      <div className={`relative flex flex-col items-center`}>
        {/* Node circle */}
        <div
          className={`relative w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${colors.bg} ${colors.border} ${colors.glow} ${
            isSelected ? 'ring-2 ring-laya-teal ring-offset-2' : ''
          }`}
        >
          {status === 'active' && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-laya-teal"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center ${
            status === 'pending' ? 'opacity-40' : ''
          }`}>
            {status === 'active' ? (
              <Loader size={14} className="text-white animate-spin" />
            ) : status === 'completed' ? (
              <Icon size={14} className="text-white" />
            ) : status === 'failed' ? (
              <XCircle size={14} className="text-white" />
            ) : (
              <Icon size={14} className="text-white/70" />
            )}
          </div>
          {/* Status dot */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            status === 'completed' ? 'bg-laya-green' :
            status === 'active' ? 'bg-laya-teal animate-pulse' :
            status === 'failed' ? 'bg-laya-coral' :
            'bg-gray-300'
          }`} />
        </div>
        {/* Label */}
        <div className="mt-1.5 text-center max-w-[100px]">
          <span className={`text-[10px] font-semibold leading-tight block ${colors.text}`}>
            {node.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ArchitectureView({ agentTrace = [], isProcessing = false, decision = '', onClose }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Compute statuses
  const nodeStatuses = useMemo(() => {
    const statuses = {};
    NODES.forEach(node => {
      statuses[node.id] = getNodeStatus(node, agentTrace, isProcessing, decision);
    });
    return statuses;
  }, [agentTrace, isProcessing, decision]);

  // Edge statuses
  const edgeStatuses = useMemo(() => {
    return EDGES.map(edge => {
      const fromStatus = nodeStatuses[edge.from];
      const toStatus = nodeStatuses[edge.to];
      if (toStatus === 'active') return 'active';
      if (fromStatus === 'completed' && (toStatus === 'completed' || toStatus === 'active')) return 'completed';
      if (toStatus === 'failed') return 'failed';
      return 'pending';
    });
  }, [nodeStatuses]);

  // Get traces for selected node
  const selectedTraces = useMemo(() => {
    if (!selectedNode || !agentTrace.length) return [];
    return agentTrace.filter(t =>
      selectedNode.keywords.some(kw => t.toLowerCase().includes(kw))
    );
  }, [selectedNode, agentTrace]);

  // Stats
  const completedCount = Object.values(nodeStatuses).filter(s => s === 'completed').length;
  const totalProcessNodes = NODES.filter(n => n.type !== 'endpoint').length;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-sm">
            <Network size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-laya-navy">Agent Architecture</h3>
            <p className="text-[10px] text-gray-400">
              {isProcessing ? 'Processing in real-time...' : agentTrace.length > 0 ? `${completedCount}/${totalProcessNodes} stages completed` : 'Waiting for input'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-laya-teal px-2.5 py-1 rounded-full bg-laya-teal/10">
              <Activity size={10} className="animate-pulse" />
              Live
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div className="relative w-full h-full min-h-[500px]">
          {/* Edges */}
          {EDGES.map((edge, i) => (
            <FlowEdge
              key={`${edge.from}-${edge.to}`}
              from={edge.from}
              to={edge.to}
              status={edgeStatuses[i]}
            />
          ))}

          {/* Parallel indicator */}
          <div
            className="absolute text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
            style={{ left: '50%', top: '28%', transform: 'translate(-50%, -50%)', zIndex: 5 }}
          >
            PARALLEL
          </div>

          {/* Nodes */}
          {NODES.map(node => (
            <FlowNode
              key={node.id}
              node={node}
              status={nodeStatuses[node.id]}
              onClick={setSelectedNode}
              isSelected={selectedNode?.id === node.id}
            />
          ))}
        </div>
      </div>

      {/* Selected Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 overflow-hidden"
          >
            <div className="p-4 bg-gray-50/50 max-h-[200px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <selectedNode.icon size={14} className="text-laya-teal" />
                  <span className="text-xs font-bold text-laya-navy">{selectedNode.label}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    nodeStatuses[selectedNode.id] === 'completed' ? 'bg-green-100 text-laya-green' :
                    nodeStatuses[selectedNode.id] === 'active' ? 'bg-laya-teal/10 text-laya-teal' :
                    nodeStatuses[selectedNode.id] === 'failed' ? 'bg-red-100 text-laya-coral' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {nodeStatuses[selectedNode.id].toUpperCase()}
                  </span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={12} />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">{selectedNode.desc}</p>

              {/* Child agents */}
              {selectedNode.children && (
                <div className="mb-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Child Agents:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.children.map(child => (
                      <span key={child} className="text-[9px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-500">
                        {child}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trace entries */}
              {selectedTraces.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Trace Log:</span>
                  <div className="mt-1 space-y-1">
                    {selectedTraces.map((trace, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <ChevronRight size={8} className="text-laya-teal mt-0.5 shrink-0" />
                        <span className="text-gray-600">{trace}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTraces.length === 0 && nodeStatuses[selectedNode.id] === 'pending' && (
                <p className="text-[10px] text-gray-400 italic">This stage has not been reached yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {[
            { color: 'bg-gray-300', label: 'Pending' },
            { color: 'bg-laya-teal', label: 'Active' },
            { color: 'bg-laya-green', label: 'Done' },
            { color: 'bg-laya-coral', label: 'Failed' },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1 text-[9px] text-gray-400">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
        <span className="text-[9px] text-gray-400">Click any node for details</span>
      </div>
    </div>
  );
}
