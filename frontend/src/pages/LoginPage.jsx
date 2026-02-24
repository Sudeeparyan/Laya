// LoginPage — Beautiful animated login with role selection

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles,
  Stethoscope, Code2, AlertCircle, Activity, FlaskConical
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 20 + 10,
  delay: Math.random() * 5,
}));

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(role) {
    if (role === 'developer') {
      setEmail('admin@laya.ie');
      setPassword('admin123');
    } else if (role === 'test') {
      setEmail('test@laya.ie');
      setPassword('test123');
    } else {
      setEmail('customer@laya.ie');
      setPassword('customer123');
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-pink-50/30">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: p.id % 3 === 0 ? 'rgba(230,0,126,0.15)' : 'rgba(0,114,206,0.15)',
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Gradient orbs — blue & pink */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-200/30 blur-[120px]" />
      <div className="absolute top-[50%] right-[20%] w-[300px] h-[300px] rounded-full bg-blue-100/40 blur-[100px]" />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center relative px-16">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-lg"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-14 h-14 rounded-2xl gradient-laya-hero flex items-center justify-center shadow-xl shadow-blue-300/30">
              <Shield size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-laya-navy tracking-tight">Laya Healthcare</h1>
              <p className="text-sm text-laya-pink flex items-center gap-1.5">
                <Sparkles size={12} /> AI Claims Intelligence
              </p>
            </div>
          </motion.div>

          {/* Hero text */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-4xl font-extrabold text-laya-navy leading-tight mb-6"
          >
            Intelligent Claims
            <br />
            <span className="text-gradient-laya">
              Processing Platform
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg text-laya-navy/60 leading-relaxed mb-10"
          >
            Multi-agent AI system for automated medical claims adjudication.
            Built for speed, accuracy, and transparency.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap gap-3"
          >
            {['6-Agent Pipeline', 'Real-time Tracing', 'GraphRAG', 'Fraud Detection'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="px-4 py-2 rounded-full text-sm font-medium bg-white/80 text-laya-blue border border-blue-100 backdrop-blur-sm shadow-sm"
              >
                {f}
              </motion.span>
            ))}
          </motion.div>

          {/* Animated activity indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-12 flex items-center gap-3 text-laya-navy/40"
          >
            <Activity size={16} className="text-laya-pink animate-pulse" />
            <span className="text-sm">System operational • v2.0</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-11 h-11 rounded-xl gradient-laya-hero flex items-center justify-center shadow-lg shadow-blue-300/30">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-laya-navy">Laya Healthcare</h1>
              <p className="text-xs text-laya-pink">AI Claims Assistant</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-8 shadow-2xl shadow-blue-100/40">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-laya-navy mb-2">Welcome back</h2>
              <p className="text-laya-navy/50 text-sm">Sign in to access your claims dashboard</p>
            </div>

            {/* Quick login buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => quickLogin('developer')}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-50 to-pink-100/50 border border-pink-200 text-laya-pink hover:border-pink-300 transition-all group"
              >
                <Code2 size={16} className="group-hover:text-laya-pink" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Developer</p>
                  <p className="text-[10px] text-laya-navy/40">Full access</p>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => quickLogin('customer')}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 text-laya-blue hover:border-blue-300 transition-all group"
              >
                <Stethoscope size={16} className="group-hover:text-laya-blue" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Customer</p>
                  <p className="text-[10px] text-laya-navy/40">My claims</p>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => quickLogin('test')}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-amber-600 hover:border-amber-300 transition-all group"
              >
                <FlaskConical size={16} className="group-hover:text-amber-600" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Test (Liam)</p>
                  <p className="text-[10px] text-laya-navy/40">Demo flow</p>
                </div>
              </motion.button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-blue-100" />
              <span className="text-xs text-laya-navy/40">or sign in manually</span>
              <div className="flex-1 h-px bg-blue-100" />
            </div>

            {/* Error alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200"
                >
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-laya-navy placeholder:text-blue-300 focus:outline-none focus:border-laya-blue-mid/50 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required
                />
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-laya-navy placeholder:text-blue-300 focus:outline-none focus:border-laya-blue-mid/50 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-laya-blue transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl gradient-laya-hero text-white font-semibold text-sm shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            <p className="text-center text-sm text-laya-navy/40 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-laya-pink hover:text-laya-pink-light font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-laya-navy/30 mt-6">
            © 2026 Laya Healthcare • Powered by Multi-Agent AI
          </p>
        </motion.div>
      </div>
    </div>
  );
}
