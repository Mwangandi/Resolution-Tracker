import React, { useState } from 'react';
import { useAppContext } from '../store';
// @ts-ignore
import taitaTavetaLogo from '../assets/images/taita_taveta_logo_1784192264343.jpg';
import { Shield, KeyRound, Mail, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Login() {
  const { login, sendOtp, customLogo } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await sendOtp(email, password);
      if (response.success) {
        if (response.otpBypassed) {
          const success = await login(email, password, 'BYPASS_OTP');
          setLoading(false);
          if (success) {
            navigate('/dashboard');
          } else {
            setError('Bypass login failed. Please try again.');
          }
        } else {
          setLoading(false);
          setStep('otp');
          setError('');
        }
      } else {
        setLoading(false);
        setError(response.message || 'Verification failed. Please check your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP sent to your email/SMS');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password, otp);
      setLoading(false);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid OTP. Please try again. (Hint: use 123456 in development or check your SMS)');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center p-1.5 shadow-md">
            <img 
              src={customLogo || taitaTavetaLogo} 
              alt="Taita Taveta County Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
          Taita Taveta County
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500 uppercase tracking-widest">
          Resolution Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'email' ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="admin@taitataveta.go.ke"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Verifying Password & Sending OTP...' : 'Send OTP via Email & SMS'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Enter OTP
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border tracking-widest text-lg"
                      placeholder="OTP"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Secure Login'}
                  </button>
                </div>
              </form>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setError('');
                    setOtp('');
                    setPassword('');
                    setStep('email');
                  }}
                  className="text-sm text-orange-600 hover:text-orange-500 font-semibold focus:outline-none"
                >
                  Back to Email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
