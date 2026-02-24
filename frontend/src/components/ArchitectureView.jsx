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
    x: 50, y: 6,
    type: 'endpoint',
    keywords: [],
  },
  {
    id: 'setup',
    label: 'Setup Node',
    icon: Database,
    desc: 'Load member data, parse message, enrich document',
    x: 50, y: 18,
    type: 'process',
    keywords: ['setup'],
  },
  {
    id: 'intake',
    label: 'Intake Agent',
    icon: FileSearch,
    desc: 'Form classification, data extraction, compliance check',
    x: 30, y: 34,
    type: 'validation',
    keywords: ['intake', 'form classifier', 'compliance'],
    children: ['Form Classifier', 'Data Extractor', 'Compliance Checker'],
  },
  {
    id: 'eligibility',
    label: 'Eligibility Agent',
    icon: Search,
    desc: '12-week waiting, submission deadline, quarterly threshold, duplicates',
    x: 70, y: 34,
    type: 'validation',
    keywords: ['eligibility', 'waiting period', 'threshold', 'duplicate'],
    children: ['Waiting Period', 'Submission Deadline', 'Quarterly Threshold', 'Duplicate Check'],
  },
  {
    id: 'principal',
    label: 'Principal Agent',
    icon: Brain,
    desc: 'GPT-4o powered routing: outpatient, hospital, or exceptions',
    x: 50, y: 49,
    type: 'router',
    keywords: ['principal'],
  },
  {
    id: 'outpatient',
    label: 'Outpatient Agent',
    icon: Stethoscope,
    desc: 'GP, Consultant, Prescription, Dental, Optical, Scans',
    x: 25, y: 64,
    type: 'specialist',
    keywords: ['outpatient', 'gp', 'consultant', 'pharmacy', 'therapy', 'dental', 'optical', 'scan'],
    children: ['GP & A&E', 'Consultant Fee', 'Prescription', 'Dental & Optical', 'Day-to-Day Therapy', 'Scan Cover'],
  },
  {
    id: 'hospital',
    label: 'Hospital Agent',
    icon: Building2,
    desc: 'Inpatient stays, procedure validation, €20/day payout',
    x: 50, y: 64,
    type: 'specialist',
    keywords: ['hospital', 'inpatient'],
    children: ['Invoice Check', 'Procedure Validator', 'Payout Calculator'],
  },
  {
    id: 'exceptions',
    label: 'Exceptions Agent',
    icon: AlertTriangle,
    desc: 'Maternity, third-party/solicitor, duplicate/fraud',
    x: 75, y: 64,
    type: 'specialist',
    keywords: ['exceptions', 'maternity'],
    children: ['Maternity Handler', 'Legal Review', 'Fraud Detector'],
  },
  {
    id: 'decision',
    label: 'Decision Agent',
    icon: CheckCircle,
    desc: 'Aggregate results, update database, personalize response',
    x: 50, y: 79,
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

// ── Stronger, more visible node styles ──
const nodeStyles = {
  pending: {
    outerBg: 'bg-white',
    outerBorder: 'border-gray-200',
    outerShadow: 'shadow-sm',
    iconColor: 'text-gray-400',
    labelColor: 'text-gray-500',
    dotColor: 'bg-gray-300 border-white',
    connectorColor: '#CBD5E1',
  },
  active: {
    outerBg: 'bg-blue-50',
    outerBorder: 'border-laya-blue-mid',
    outerShadow: 'shadow-lg shadow-blue-200/60',
    iconColor: 'text-white',
    labelColor: 'text-laya-blue-mid font-bold',
    dotColor: 'bg-laya-blue-mid border-white animate-pulse',
    connectorColor: '#0072CE',
  },
  completed: {
    outerBg: 'bg-green-50',
    outerBorder: 'border-green-400',
    outerShadow: 'shadow-md shadow-green-200/50',
    iconColor: 'text-white',
    labelColor: 'text-green-700 font-semibold',
    dotColor: 'bg-green-500 border-white',
    connectorColor: '#22C55E',
  },
  failed: {
    outerBg: 'bg-red-50',
    outerBorder: 'border-red-400',
    outerShadow: 'shadow-md shadow-red-200/50',
    iconColor: 'text-white',
    labelColor: 'text-red-600 font-semibold',
    dotColor: 'bg-red-500 border-white',
    connectorColor: '#EF4444',
  },
  skipped: {
    outerBg: 'bg-gray-50',
    outerBorder: 'border-gray-200 border-dashed',
    outerShadow: '',
    iconColor: 'text-gray-300',
    labelColor: 'text-gray-400',
    dotColor: 'bg-gray-200 border-white',
    connectorColor: '#E2E8F0',
  },
};

// Distinct accent colors per node type
const typeAccents = {
  endpoint:   { iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200',   iconColor: 'text-blue-500',   activeBg: 'bg-gradient-to-br from-laya-blue to-laya-blue-mid' },
  process:    { iconBg: 'bg-gradient-to-br from-indigo-100 to-indigo-200', iconColor: 'text-indigo-500', activeBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
  validation: { iconBg: 'bg-gradient-to-br from-amber-100 to-amber-200', iconColor: 'text-amber-600',  activeBg: 'bg-gradient-to-br from-amber-500 to-orange-500' },
  router:     { iconBg: 'bg-gradient-to-br from-pink-100 to-pink-200',   iconColor: 'text-pink-600',   activeBg: 'bg-gradient-to-br from-pink-500 to-pink-600' },
  specialist: { iconBg: 'bg-gradient-to-br from-sky-100 to-blue-200',    iconColor: 'text-blue-600',   activeBg: 'bg-gradient-to-br from-laya-blue-mid to-blue-600' },
  decision:   { iconBg: 'bg-gradient-to-br from-purple-100 to-purple-200', iconColor: 'text-purple-600', activeBg: 'bg-gradient-to-br from-purple-500 to-purple-600' },
};

// ── Vertical flow layout: rows of nodes ──
// Each row is an array of node IDs displayed side by side
const FLOW_ROWS = [
  { nodes: ['user'], label: null },
  { nodes: ['setup'], label: null },
  { nodes: ['intake', 'eligibility'], label: '⚡ PARALLEL' },
  { nodes: ['principal'], label: null },
  { nodes: ['outpatient', 'hospital', 'exceptions'], label: 'ROUTE' },
  { nodes: ['decision'], label: null },
  { nodes: ['result'], label: null },
];

// ── Vertical connector between rows ──
function VerticalConnector({ status, isFork, isMerge }) {
  const style = nodeStyles[status] || nodeStyles.pending;
  const color = style.connectorColor;
  const isDashed = status === 'pending' || status === 'skipped';

  return (
    <div className="flex justify-center py-1 relative">
      <div className="flex flex-col items-center">
        {isFork && (
          <svg width="120" height="16" viewBox="0 0 120 16" className="overflow-visible">
            <line x1="60" y1="0" x2="60" y2="16" stroke={color} strokeWidth="2" strokeDasharray={isDashed ? '4,3' : 'none'} />
          </svg>
        )}
        {isMerge && (
          <svg width="120" height="16" viewBox="0 0 120 16" className="overflow-visible">
            <line x1="60" y1="0" x2="60" y2="16" stroke={color} strokeWidth="2" strokeDasharray={isDashed ? '4,3' : 'none'} />
          </svg>
        )}
        {!isFork && !isMerge && (
          <div
            className="w-0.5 h-5 rounded-full"
            style={{
              backgroundColor: color,
              ...(isDashed ? { backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0, ${color} 4px, transparent 4px, transparent 7px)`, backgroundColor: 'transparent' } : {})
            }}
          />
        )}
        {status === 'active' && (
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-laya-blue-mid shadow-md shadow-blue-300"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  );
}

// ── Single flow node card ──
function FlowNodeCard({ node, status, onClick, isSelected, compact }) {
  const style = nodeStyles[status] || nodeStyles.pending;
  const accent = typeAccents[node.type] || typeAccents.process;
  const Icon = node.icon;

  const iconBg = (status === 'pending' || status === 'skipped')
    ? accent.iconBg
    : (status === 'active' ? accent.activeBg
    : (status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-600'
    : (status === 'failed' ? 'bg-gradient-to-br from-red-500 to-rose-600'
    : accent.activeBg)));
  const iconCol = (status === 'pending' || status === 'skipped') ? accent.iconColor : style.iconColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: NODES.indexOf(node) * 0.04 }}
      className={`cursor-pointer group ${compact ? 'flex-1 min-w-0' : ''}`}
      onClick={() => onClick(node)}
    >
      <motion.div
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="flex flex-col items-center"
      >
        {/* Node icon box */}
        <div
          className={`relative ${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl border-2 flex items-center justify-center transition-all duration-300
            ${style.outerBg} ${style.outerBorder} ${style.outerShadow}
            ${isSelected ? 'ring-2 ring-offset-1 ring-offset-white ring-laya-blue-mid' : ''}
            group-hover:shadow-lg group-hover:border-laya-blue-mid/40`}
        >
          {status === 'active' && (
            <motion.div
              className="absolute inset-[-3px] rounded-xl border-2 border-laya-blue-mid/30"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg ${iconBg} flex items-center justify-center shadow-sm`}>
            {status === 'active' ? (
              <Loader size={compact ? 13 : 15} className={`${iconCol} animate-spin`} />
            ) : status === 'failed' ? (
              <XCircle size={compact ? 13 : 15} className={iconCol} />
            ) : (
              <Icon size={compact ? 13 : 15} className={iconCol} />
            )}
          </div>
          {/* Status dot */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${style.dotColor}`} />
        </div>
        {/* Label */}
        <span className={`mt-1 text-[9px] leading-tight text-center block ${compact ? 'max-w-[72px]' : 'max-w-[90px]'} ${style.labelColor}`}>
          {node.label}
        </span>
      </motion.div>
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

  // Get connector status between rows
  const getConnectorStatus = (rowIdx) => {
    if (rowIdx >= FLOW_ROWS.length - 1) return 'pending';
    const currentRow = FLOW_ROWS[rowIdx];
    const nextRow = FLOW_ROWS[rowIdx + 1];
    const currentStatuses = currentRow.nodes.map(id => nodeStatuses[id]);
    const nextStatuses = nextRow.nodes.map(id => nodeStatuses[id]);

    if (nextStatuses.some(s => s === 'active')) return 'active';
    if (currentStatuses.every(s => s === 'completed') && nextStatuses.some(s => s === 'completed' || s === 'active')) return 'completed';
    if (nextStatuses.some(s => s === 'failed')) return 'failed';
    return 'pending';
  };

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
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-blue-50/40 border border-blue-100 rounded-2xl overflow-hidden shadow-lg shadow-blue-100/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-blue-100 bg-white/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-md shadow-blue-300/30">
            <Network size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-laya-navy tracking-tight">Agent Architecture</h3>
            <p className="text-[10px] text-gray-500">
              {isProcessing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-laya-blue-mid animate-pulse" />
                  Processing...
                </span>
              ) : agentTrace.length > 0 ? (
                `${completedCount}/${totalProcessNodes} completed`
              ) : (
                'Waiting for input'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-laya-blue-mid px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
              <Activity size={10} className="animate-pulse" />
              Live
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-laya-navy transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Architecture Diagram */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Subtle background dot grid */}
        <div className="relative px-4 py-5">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #003DA5 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Vertical flow */}
          <div className="relative flex flex-col items-center gap-0">
            {FLOW_ROWS.map((row, rowIdx) => {
              const isParallel = row.nodes.length > 1;
              const isLastRow = rowIdx === FLOW_ROWS.length - 1;

              return (
                <div key={rowIdx} className="flex flex-col items-center w-full">
                  {/* Row label */}
                  {row.label && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-1.5 text-[8px] font-bold tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
                    >
                      {row.label}
                    </motion.div>
                  )}

                  {/* Node(s) in this row */}
                  <div className={`flex items-start justify-center ${isParallel ? 'gap-3' : ''} w-full`}>
                    {row.nodes.map(nodeId => {
                      const node = NODES.find(n => n.id === nodeId);
                      if (!node) return null;
                      return (
                        <FlowNodeCard
                          key={node.id}
                          node={node}
                          status={nodeStatuses[node.id]}
                          onClick={setSelectedNode}
                          isSelected={selectedNode?.id === node.id}
                          compact={row.nodes.length >= 3}
                        />
                      );
                    })}
                  </div>

                  {/* Connector to next row */}
                  {!isLastRow && (
                    <VerticalConnector
                      status={getConnectorStatus(rowIdx)}
                      isFork={FLOW_ROWS[rowIdx + 1]?.nodes.length > 1}
                      isMerge={row.nodes.length > 1 && FLOW_ROWS[rowIdx + 1]?.nodes.length === 1}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-blue-100 overflow-hidden shrink-0"
          >
            <div className="p-4 bg-white max-h-[220px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    nodeStatuses[selectedNode.id] === 'completed' ? 'bg-green-100' :
                    nodeStatuses[selectedNode.id] === 'active' ? 'bg-blue-100' :
                    nodeStatuses[selectedNode.id] === 'failed' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <selectedNode.icon size={14} className={
                      nodeStatuses[selectedNode.id] === 'completed' ? 'text-green-600' :
                      nodeStatuses[selectedNode.id] === 'active' ? 'text-laya-blue-mid' :
                      nodeStatuses[selectedNode.id] === 'failed' ? 'text-red-500' :
                      'text-gray-400'
                    } />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-laya-navy block">{selectedNode.label}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      nodeStatuses[selectedNode.id] === 'completed' ? 'text-green-600' :
                      nodeStatuses[selectedNode.id] === 'active' ? 'text-laya-blue-mid' :
                      nodeStatuses[selectedNode.id] === 'failed' ? 'text-red-500' :
                      'text-gray-400'
                    }`}>
                      {nodeStatuses[selectedNode.id]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-laya-navy transition-all">
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{selectedNode.desc}</p>

              {/* Child agents */}
              {selectedNode.children && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Child Agents</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.children.map(child => (
                      <span key={child} className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-laya-navy font-medium">
                        {child}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trace entries */}
              {selectedTraces.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Trace Log</span>
                  <div className="space-y-1.5 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    {selectedTraces.map((trace, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px]">
                        <ChevronRight size={10} className="text-laya-blue-mid mt-0.5 shrink-0" />
                        <span className="text-gray-600 leading-relaxed">{trace}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTraces.length === 0 && nodeStatuses[selectedNode.id] === 'pending' && (
                <div className="flex items-center gap-2 text-[11px] text-gray-400 italic bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <Circle size={10} />
                  This stage has not been reached yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-blue-100 bg-white/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {[
            { color: 'bg-gray-300', label: 'Pending' },
            { color: 'bg-laya-blue-mid', label: 'Active' },
            { color: 'bg-green-500', label: 'Done' },
            { color: 'bg-red-500', label: 'Failed' },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1 text-[9px] text-gray-500 font-medium">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
        <span className="text-[9px] text-gray-400">Tap for details</span>
      </div>
    </div>
  );
}
