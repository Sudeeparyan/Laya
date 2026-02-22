// RegisterPage — Beautiful animated registration with role selection

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles,
  Stethoscope, Code2, AlertCircle, CheckCircle, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'customer',
    member_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password) return;
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12">
      {/* Background effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-laya-teal/8 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/6 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to login
        </Link>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl gradient-teal flex items-center justify-center shadow-lg shadow-laya-teal/30">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Account</h2>
              <p className="text-sm text-gray-400">Join Laya Healthcare AI Platform</p>
            </div>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => updateField('role', 'customer')}
              className={`relative flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                form.role === 'customer'
                  ? 'bg-laya-teal/10 border-laya-teal/40 shadow-lg shadow-laya-teal/10'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
              }`}
            >
              {form.role === 'customer' && (
                <motion.div
                  layoutId="roleCheck"
                  className="absolute top-2 right-2"
                >
                  <CheckCircle size={14} className="text-laya-teal" />
                </motion.div>
              )}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                form.role === 'customer' ? 'bg-laya-teal/20' : 'bg-white/5'
              }`}>
                <Stethoscope size={20} className={form.role === 'customer' ? 'text-laya-teal' : 'text-gray-500'} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${form.role === 'customer' ? 'text-white' : 'text-gray-300'}`}>Customer</p>
                <p className="text-[11px] text-gray-500">View my claims</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => updateField('role', 'developer')}
              className={`relative flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                form.role === 'developer'
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
              }`}
            >
              {form.role === 'developer' && (
                <motion.div
                  layoutId="roleCheck"
                  className="absolute top-2 right-2"
                >
                  <CheckCircle size={14} className="text-purple-400" />
                </motion.div>
              )}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                form.role === 'developer' ? 'bg-purple-500/20' : 'bg-white/5'
              }`}>
                <Code2 size={20} className={form.role === 'developer' ? 'text-purple-400' : 'text-gray-500'} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${form.role === 'developer' ? 'text-white' : 'text-gray-300'}`}>Developer</p>
                <p className="text-[11px] text-gray-500">Operator access</p>
              </div>
            </motion.button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  placeholder="First name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-laya-teal/50 focus:ring-2 focus:ring-laya-teal/20 transition-all text-sm"
                  required
                />
              </div>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  placeholder="Last name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-laya-teal/50 focus:ring-2 focus:ring-laya-teal/20 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Email address"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-laya-teal/50 focus:ring-2 focus:ring-laya-teal/20 transition-all text-sm"
                required
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-laya-teal/50 focus:ring-2 focus:ring-laya-teal/20 transition-all text-sm"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Member ID for customers */}
            <AnimatePresence>
              {form.role === 'customer' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={form.member_id}
                      onChange={(e) => updateField('member_id', e.target.value)}
                      placeholder="Member ID (e.g., MEM-1002) — optional"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-laya-teal/50 focus:ring-2 focus:ring-laya-teal/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 pl-1">
                    Link your health insurance member ID to view your claims
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl gradient-teal text-white font-semibold text-sm shadow-lg shadow-laya-teal/25 hover:shadow-xl hover:shadow-laya-teal/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-laya-teal hover:text-laya-teal-light font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
