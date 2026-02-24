import { motion } from 'framer-motion';
import {
  ShieldCheck, Stethoscope, FileText, Building2,
  Upload, HelpCircle, ArrowRight, Activity, Sparkles,
  Mic, Brain, Zap
} from 'lucide-react';
import { DEMO_SCENARIOS } from '../utils/constants';

const CAPABILITIES = [
  {
    icon: Stethoscope,
    title: 'Submit a GP Claim',
    desc: 'Process GP visit reimbursements quickly with AI-powered verification',
    prompt: 'I want to submit a claim for a GP visit I had recently',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'GP & A&E',
      treatment_date: '2026-02-20',
      practitioner_name: 'Dr. Smith',
      total_cost: 60.0,
      signature_present: true,
    },
    color: 'text-laya-blue-mid',
    bg: 'bg-blue-50',
  },
  {
    icon: FileText,
    title: 'Consultant Visit',
    desc: 'Process specialist and consultant fee reimbursements',
    prompt: 'I want to claim for a consultant visit',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Consultant Fee',
      treatment_date: '2026-02-15',
      practitioner_name: 'Dr. Burke',
      total_cost: 75.0,
      signature_present: true,
    },
    color: 'text-laya-blue',
    bg: 'bg-blue-50/70',
  },
  {
    icon: Upload,
    title: 'Prescription Claim',
    desc: 'Submit pharmacy receipts for prescription reimbursement',
    prompt: 'I want to submit a prescription claim',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Prescription',
      treatment_date: '2026-02-18',
      practitioner_name: 'Boots Pharmacy',
      total_cost: 25.0,
      signature_present: true,
    },
    color: 'text-laya-green',
    bg: 'bg-green-50',
  },
  {
    icon: Building2,
    title: 'Hospital Claim',
    desc: 'Submit in-patient hospital stay claims with full coverage check',
    prompt: 'I need to submit a hospital in-patient claim',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Hospital In-patient',
      treatment_date: '2026-02-10',
      practitioner_name: 'St. James Hospital',
      total_cost: 200.0,
      hospital_days: 5,
      signature_present: true,
    },
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    icon: ShieldCheck,
    title: 'Dental & Optical',
    desc: 'Claim for dental check-ups, fillings, or optical visits',
    prompt: 'I want to claim for a dental visit',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Dental & Optical',
      treatment_date: '2026-02-12',
      practitioner_name: 'Smiles Dental',
      total_cost: 50.0,
      signature_present: true,
    },
    color: 'text-laya-amber',
    bg: 'bg-amber-50',
  },
  {
    icon: HelpCircle,
    title: 'Scan Claim',
    desc: 'Submit MRI, CT, or X-ray scan receipts',
    prompt: 'I want to claim for an MRI scan',
    document: {
      member_id: '',
      patient_name: '',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Scan Cover',
      treatment_date: '2026-02-14',
      practitioner_name: 'Beacon Hospital',
      total_cost: 150.0,
      signature_present: true,
    },
    color: 'text-laya-coral',
    bg: 'bg-red-50',
  },
];

export default function WelcomeScreen({ onSelectPrompt, selectedMember }) {
  return (
    <div className="flex items-center justify-center h-full px-8 bg-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Hero */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative w-18 h-18 mx-auto mb-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl border-2 border-laya-blue/30"
            />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-laya-navy tracking-tight mb-2"
          >
            How can I help you today?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 max-w-md mx-auto"
          >
            {selectedMember
              ? `Hi ${selectedMember.first_name}! I can help you with claims, benefits, and more.`
              : 'Select a member from the sidebar to get started with your claims.'}
          </motion.p>
        </div>

        {/* Capability Cards Grid */}
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              // Fill in member-specific data in the document
              const doc = cap.document ? {
                ...cap.document,
                member_id: selectedMember.member_id,
                patient_name: `${selectedMember.first_name} ${selectedMember.last_name}`,
              } : null;
              return (
                <motion.button
                  key={cap.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => onSelectPrompt(cap.prompt, doc)}
                  className="capability-card text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cap.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={cap.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-laya-navy">{cap.title}</h3>
                        <ArrowRight
                          size={12}
                          className="text-gray-400 group-hover:text-laya-blue group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{cap.desc}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* No member selected hint */}
        {!selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/90 border border-blue-200 shadow-lg shadow-blue-50 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-laya-blue-mid animate-pulse" />
              <span className="text-sm text-laya-blue font-medium">
                Select a member from the left sidebar to begin
              </span>
            </div>

            {/* Feature highlights for no-member state */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto"
            >
              {[
                { icon: Brain, label: 'Multi-Agent AI', desc: '10+ specialized agents' },
                { icon: Zap, label: 'Instant Processing', desc: 'Real-time claims analysis' },
                { icon: Mic, label: 'Voice Input', desc: 'Speak your claim naturally' },
              ].map((feat, i) => (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="text-center p-3 rounded-xl bg-white/90 border border-blue-100 shadow-md shadow-blue-50 backdrop-blur-md"
                >
                  <feat.icon size={20} className="mx-auto mb-1.5 text-laya-blue-mid" />
                  <p className="text-[11px] font-semibold text-laya-navy">{feat.label}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{feat.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
