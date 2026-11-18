import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function ModulePlaceholder({ title, description, icon: Icon, badge = 'Enterprise Module' }) {
  return (
    <div className="flex flex-col w-full min-h-[80vh] items-center justify-center p-6 text-center font-['Inter',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 p-8 flex flex-col items-center">
        {Icon && (
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7" />
          </div>
        )}
        <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full mb-3">
          {badge}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
          {description || 'This module is connected to the enterprise workforce management cluster.'}
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
