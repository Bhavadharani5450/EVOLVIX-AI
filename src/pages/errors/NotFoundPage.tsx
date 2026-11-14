import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleHomePath } from '../../config/navigation';
import { BrandLogo } from '../../components/BrandLogo';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        <BrandLogo size="md" />
      </div>
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-[#4F46E5] flex items-center justify-center mb-4">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#0F172A]">Page Not Found</h1>
        <p className="text-sm text-[#64748B] mt-2">
          The route you requested does not exist in EVOLVIX AI. Use the sidebar or return to your workspace overview.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => navigate(user ? getRoleHomePath(user.role) : '/login', { replace: true })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{user ? 'Go to Workspace Overview' : 'Go to Sign In'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
