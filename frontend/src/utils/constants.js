// API URL and app-wide constants

export const API_BASE_URL = '/api';
export const WS_BASE_URL = `ws://${window.location.hostname}:8000/ws`;

// Laya brand colors
export const COLORS = {
  teal: '#00A99D',
  tealLight: '#33BBAF',
  tealDark: '#008B81',
  navy: '#1A2B4A',
  navyLight: '#2A3D5E',
  light: '#F0F9F8',
  coral: '#E85D4A',
  amber: '#F5A623',
  green: '#27AE60',
  blue: '#3498DB',
};

// Decision badge styling
export const DECISION_STYLES = {
  APPROVED: { bg: 'bg-laya-green', text: 'text-white', label: 'APPROVED' },
  REJECTED: { bg: 'bg-laya-coral', text: 'text-white', label: 'REJECTED' },
  'PARTIALLY APPROVED': { bg: 'bg-laya-amber', text: 'text-white', label: 'PARTIALLY APPROVED' },
  PENDING: { bg: 'bg-laya-blue', text: 'text-white', label: 'PENDING' },
  'ACTION REQUIRED': { bg: 'bg-orange-500', text: 'text-white', label: 'ACTION REQUIRED' },
};

// Demo test cases (from docs/input_output.md)
export const DEMO_SCENARIOS = [
  {
    id: 'waiting-period',
    name: 'Waiting Period Test',
    member: 'Liam O\'Connor',
    memberId: 'MEM-1001',
    expected: 'REJECTED',
    message: 'Hi, I would like to submit my claim for a GP visit I had yesterday.',
    document: {
      member_id: 'MEM-1001',
      patient_name: "Liam O'Connor",
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'GP & A&E',
      treatment_date: '2026-02-20',
      practitioner_name: 'Dr. Hibbert',
      total_cost: 60.0,
      signature_present: true,
    },
  },
  {
    id: 'threshold',
    name: 'Threshold Test',
    member: 'Siobhan Kelly',
    memberId: 'MEM-1002',
    expected: 'APPROVED',
    message: 'Please process my latest consultant receipt.',
    document: {
      member_id: 'MEM-1002',
      patient_name: 'Siobhan Kelly',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Consultant Fee',
      treatment_date: '2026-02-15',
      practitioner_name: 'Dr. Nick Riviera',
      total_cost: 60.0,
      signature_present: true,
    },
  },
  {
    id: 'annual-limit',
    name: 'Annual Limit Test',
    member: 'Declan Murphy',
    memberId: 'MEM-1003',
    expected: 'REJECTED',
    message: "I'm submitting my receipt for an MRI scan I had at the Beacon Hospital.",
    document: {
      member_id: 'MEM-1003',
      patient_name: 'Declan Murphy',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Scan Cover',
      treatment_date: '2026-02-10',
      practitioner_name: 'Beacon Hospital',
      total_cost: 200.0,
      signature_present: true,
    },
  },
  {
    id: 'duplicate',
    name: 'Duplicate Test',
    member: 'Conor Walsh',
    memberId: 'MEM-1005',
    expected: 'REJECTED',
    message: 'Hi, I need to claim for my consultant visit from January.',
    document: {
      member_id: 'MEM-1005',
      patient_name: 'Conor Walsh',
      form_type: 'Money Smart Out-patient Claim Form',
      treatment_type: 'Consultant Fee',
      treatment_date: '2026-01-15',
      practitioner_name: 'Dr. Sarah Smith',
      total_cost: 150.0,
      signature_present: true,
    },
  },
];
