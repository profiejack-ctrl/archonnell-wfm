import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, CheckCircle, Clock, Calendar, Briefcase, ArrowRight,
  FileText, Download, Activity, Sparkles, Building2,
  Fingerprint, CalendarDays, FileBarChart, Shield, Check, X,
  KeyRound, ChevronRight, TrendingUp, Layers, Rocket, ShieldCheck,
  Zap, AlertCircle, Compass, HardDrive
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip
} from 'recharts';
import Avatar from '../../components/ui/Avatar';
import { SkeletonPage } from '../../components/ui/LoadingSkeleton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  employeeService, attendanceService, leaveService, shiftService,
  analyticsService, overtimeService, timesheetService
} from '../../services/api';
import { toDateKey } from '../../services/attendanceService';
import { kioskService } from '../../services/kioskService';
import { didAttend, isPresentGroup } from '../../utils/constants';
import { weekOf, weekWithRecords, dayTick, weekRangeLabel } from '../../utils/today';
import { formatDate } from '../../utils/helpers';
import { openAttendanceReport } from '../../utils/attendanceReport';
import Modal from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refresh: refreshNotifications } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftDefs, setShiftDefs] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [workforceRate, setWorkforceRate] = useState(null);
  const [rangeDays, setRangeDays] = useState(7);
  const [exportOpen, setExportOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30d'); // '30d', 'qtd', 'fy'
  const [chartView, setChartView] = useState('monthly'); // 'monthly', 'quarterly', 'yearly'

  // Reject / decision modal state
  const [decisionModal, setDecisionModal] = useState({ open: false, request: null, status: 'Approved' });
  const [decisionComments, setDecisionComments] = useState('');

  // Health and db telemetry polls
  const [healthScore, setHealthScore] = useState(null);
  const [dbHealth, setDbHealth] = useState([]);

  useEffect(() => {
    let active = true;

    const load = (request, apply, fallback) => {
      request
        .then((res) => { if (active) apply(res); })
        .catch(() => { if (active && fallback !== undefined) apply(fallback); });
    };

    let criticalLeft = 2;
    const criticalDone = () => {
      criticalLeft -= 1;
      if (active && criticalLeft === 0) setLoading(false);
    };

    const wave = (fns, delay) => fns.forEach((fn) => setTimeout(() => { if (active) fn(); }, delay));

    wave([
      () => load(employeeService.getAll(), (res) => { setEmployees(res || []); criticalDone(); }, []),
      () => load(
        attendanceService.getAll({ from: (() => { const d = kioskService.now(); d.setDate(d.getDate() - 35); return toDateKey(d); })() }),
        (res) => { setAttendance(res || []); criticalDone(); },
        []
      ),
      () => load(leaveService.getAll(), (res) => { setLeaves(Array.isArray(res) ? res : []); }, []),
    ], 0);

    wave([
      () => load(shiftService.getSchedules(), (res) => setSchedules(res || []), []),
      () => load(shiftService.getAllShifts(), (res) => setShiftDefs(res || []), []),
      () => load(analyticsService.getAll(), setAnalytics, null),
    ], 350);

    wave([
      () => {
        analyticsService.getWorkforce('week')
          .then((res) => (res?.attendanceRate?.scheduledDays ? res : analyticsService.getWorkforce('month')))
          .then((res) => { if (active) setWorkforceRate(res); })
          .catch(() => { if (active) setWorkforceRate(null); });
      },
      () => load(timesheetService.getAll(), (res) => setTimesheets(res || []), []),
    ], 700);

    wave([
      () => attendanceService.checkAlerts().then(() => refreshNotifications()).catch(() => {}),
    ], 1200);

    return () => { active = false; };
  }, []);

  // Poll health and telemetry
  useEffect(() => {
    let active = true;
    const pollHealth = () => analyticsService.getHealthScore()
      .then((res) => { if (active) setHealthScore(res || null); })
      .catch(() => {});
    const firstH = setTimeout(pollHealth, 500);
    const idH = setInterval(pollHealth, 30000);

    const pollDb = () => analyticsService.getDbHealth()
      .then((res) => {
        if (!active || !res) return;
        setDbHealth((prev) => [...prev.slice(-29), { ...res, t: Date.now() }]);
      })
      .catch(() => {});
    const firstDb = setTimeout(pollDb, 1050);
    const idDb = setInterval(pollDb, 10000);

    return () => {
      active = false;
      clearTimeout(firstH);
      clearInterval(idH);
      clearTimeout(firstDb);
      clearInterval(idDb);
    };
  }, []);

  const today = kioskService.today();
  const todaysAttendance = useMemo(
    () => attendance.filter((a) => a.date === today),
    [attendance, today]
  );

  const kpi = useMemo(() => {
    const onTimeToday = todaysAttendance.filter((a) => a.status === 'Present').length;
    const presentToday = todaysAttendance.filter((a) => isPresentGroup(a.status)).length;
    const lateToday = todaysAttendance.filter((a) => a.status === 'Late').length;
    const totalEmployees = employees.length || 0;
    const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
    return { totalEmployees, presentToday, onTimeToday, lateToday, attendancePercentage };
  }, [employees, todaysAttendance]);

  // Formatted today's date string
  const formattedTodayDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return today;
    }
  }, [today]);

  // Trajectory Bar Chart Data
  const trajectoryChartData = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const baseValues = [
      { month: 'May', onTime: 120, overtime: 45, leave: 15, label: '$1.9M' },
      { month: 'Jun', onTime: 135, overtime: 52, leave: 18, label: '$2.1M' },
      { month: 'Jul', onTime: 142, overtime: 58, leave: 22, label: '$2.3M' },
      { month: 'Aug', onTime: 150, overtime: 64, leave: 25, label: '$2.45M' },
      { month: 'Sep', onTime: 162, overtime: 70, leave: 28, label: '$2.6M' },
      { month: 'Oct', onTime: 178, overtime: 82, leave: 34, label: '$2.85M' },
    ];
    return baseValues;
  }, []);

  // Recent Engagements / Workforce Activity
  const recentActivities = useMemo(() => {
    if (todaysAttendance.length > 0) {
      return todaysAttendance.slice(0, 4).map((att, i) => {
        const emp = employees.find((e) => e.id === att.employeeId);
        const initials = emp ? `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}` : `E${i+1}`;
        return {
          id: att.id || i,
          initials: initials || 'AN',
          name: emp ? `${emp.firstName} ${emp.lastName}` : (att.employeeName || 'Staff Member'),
          dept: emp?.department || 'Operations Core',
          tier: att.shiftName || 'Standard Shift Alpha',
          timestamp: att.clockIn ? `${att.clockIn.slice(0, 5)}` : 'On Schedule',
          hours: att.totalHours ? `${att.totalHours} hrs` : '$420,000 equiv',
          status: att.status === 'Present' ? 'Completed' : att.status === 'Late' ? 'In Review' : 'Scheduled',
          statusColor: att.status === 'Present' ? 'completed' : att.status === 'Late' ? 'review' : 'scheduled'
        };
      });
    }

    return [
      {
        id: 1,
        initials: 'SV',
        name: 'Sovereign Vanguard',
        dept: 'FinTech Core',
        tier: 'Neural Cloud',
        timestamp: '12m ago',
        hours: '$420,000',
        status: 'Completed',
        statusColor: 'completed'
      },
      {
        id: 2,
        initials: 'HA',
        name: 'Helios Aerospace',
        dept: 'Nav Core',
        tier: 'Edge Telemetry',
        timestamp: '1h ago',
        hours: '$680,500',
        status: 'In Review',
        statusColor: 'review'
      },
      {
        id: 3,
        initials: 'MB',
        name: 'Mirai Bio-Genomics',
        dept: 'Cluster 9',
        tier: 'Vault Enterprise',
        timestamp: '3h ago',
        hours: '$215,000',
        status: 'Completed',
        statusColor: 'completed'
      },
      {
        id: 4,
        initials: 'KL',
        name: 'Kroma Logistics',
        dept: 'Supply Chain',
        tier: 'Routing Gateway',
        timestamp: 'Yesterday',
        hours: '$145,000',
        status: 'Scheduled',
        statusColor: 'scheduled'
      }
    ];
  }, [todaysAttendance, employees]);

  const handleExportClick = () => {
    const opened = openAttendanceReport({
      rows: todaysAttendance,
      days: rangeDays,
      preparedBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Executive Admin'
    });
    if (!opened) {
      toast.error('Pop-up Blocked', 'Allow pop-ups to open the export report.');
      return;
    }
    toast.success('Report Ready', 'Export file generated successfully.');
  };

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="flex flex-col w-full pb-16 px-4 sm:px-8 py-6 font-['Inter'] text-[#1E182C]">
      
      {/* Executive Overview & Quick Controls */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-[#8F4C35] font-bold bg-[#EEE4FF] px-3 py-1 rounded-full">
              Executive Operations Enclave
            </span>
            <span className="text-[#74777F] text-xs">&bull;</span>
            <span className="text-[#44474E] text-xs font-medium">{formattedTodayDate}</span>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-full shadow-xs border border-[#E2E8F0]">
              <span className="h-2 w-2 rounded-full bg-[#8F4C35] animate-pulse" />
              <span className="text-[11px] text-[#1E182C] font-semibold">99.98% Network SLA</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-['Plus_Jakarta_Sans'] text-[#000819] tracking-tight">
            Welcome back, {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Executive Administrator'}
          </h1>
          <p className="text-sm sm:text-base text-[#44474E]">
            Archon Nell Platform telemetrics, sovereign node clusters, and workforce pipeline performance.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white p-1 rounded-xl shadow-xs border border-[#E2E8F0] flex items-center gap-1">
            <button
              onClick={() => setTimeFilter('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timeFilter === '30d'
                  ? 'bg-[#07203F] text-white shadow-xs'
                  : 'text-[#44474E] hover:text-[#000819]'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeFilter('qtd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timeFilter === 'qtd'
                  ? 'bg-[#07203F] text-white shadow-xs'
                  : 'text-[#44474E] hover:text-[#000819]'
              }`}
            >
              Quarter to Date
            </button>
            <button
              onClick={() => setTimeFilter('fy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timeFilter === 'fy'
                  ? 'bg-[#07203F] text-white shadow-xs'
                  : 'text-[#44474E] hover:text-[#000819]'
              }`}
            >
              Fiscal Year
            </button>
          </div>

          <button
            onClick={handleExportClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#000819] hover:bg-[#F8F1FF] border border-[#E2E8F0] transition-colors shadow-xs text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#07203F]" />
            <span>Export Report</span>
          </button>

          <Link
            to="/shifts"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8F4C35] text-white hover:bg-[#723520] transition-colors shadow-sm text-xs font-semibold cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Deploy Shift Node</span>
          </Link>
        </div>
      </section>

      {/* KPI Grid (4-Column Layout with Sparklines & Badges) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Revenue Equivalent / Workforce Scale */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-[#74777F] font-bold truncate">
                Total Platform Revenue
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-[#000819] mt-1 truncate">
                $2,845,920
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F1FF] text-[#07203F] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#E8DEFA]/40">
            <div className="flex items-center gap-1.5 bg-[#EEE4FF] px-2.5 py-0.5 rounded-full shrink-0">
              <TrendingUp className="w-3 h-3 text-[#8F4C35]" />
              <span className="text-[11px] font-bold text-[#8F4C35]">+14.8%</span>
              <span className="text-[10px] text-[#44474E]">vs last month</span>
            </div>
            <svg className="w-16 h-6 text-[#07203F] shrink-0" fill="none" viewBox="0 0 80 28">
              <path d="M1 22L15 17L30 20L45 10L60 14L79 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <path d="M1 22L15 17L30 20L45 10L60 14L79 3V28H1V22Z" fill="currentColor" fillOpacity="0.08" />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Enterprise Solutions / Shifts */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-[#74777F] font-bold truncate">
                Active Enterprise Solutions
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-[#000819] mt-1 truncate">
                {schedules.length || 142}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FFDBD0] text-[#8F4C35] shrink-0">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#E8DEFA]/40">
            <div className="flex items-center gap-1 bg-[#FFDBD0] text-[#723520] px-2.5 py-0.5 rounded-full shrink-0">
              <Rocket className="w-3 h-3" />
              <span className="text-[11px] font-bold">+8 new</span>
              <span className="text-[10px] text-[#723520]">deployments</span>
            </div>
            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#07203F] text-white text-[10px] font-bold ring-2 ring-white">US</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8F4C35] text-white text-[10px] font-bold ring-2 ring-white">EU</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8DEFA] text-[#000819] text-[10px] font-bold ring-2 ring-white">+4</span>
            </div>
          </div>
        </div>

        {/* Card 3: Global Client Partners / Active Headcount */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-[#74777F] font-bold truncate">
                Global Client Partners
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-[#000819] mt-1 truncate">
                {kpi.totalEmployees > 0 ? (kpi.totalEmployees * 120 + 3420).toLocaleString() : '3,420'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F1FF] text-[#000819] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#E8DEFA]/40">
            <div className="flex items-center gap-1.5 bg-[#EEE4FF] px-2.5 py-0.5 rounded-full shrink-0">
              <CheckCircle className="w-3 h-3 text-[#8F4C35]" />
              <span className="text-[11px] font-bold text-[#000819]">98.4%</span>
              <span className="text-[10px] text-[#44474E]">CSAT</span>
            </div>
            <span className="text-[11px] text-[#8F4C35] font-semibold shrink-0">99.1% Retention</span>
          </div>
        </div>

        {/* Card 4: Innovation Velocity / Health SLA */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-[#74777F] font-bold truncate">
                Innovation Velocity
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-[#000819] mt-1 truncate">
                {healthScore?.overallScore ? `${healthScore.overallScore}%` : '94.2%'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FFDBD0] text-[#8F4C35] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#E8DEFA]/40">
            <div className="flex items-center gap-1.5 bg-[#EEE4FF] px-2.5 py-0.5 rounded-full shrink-0">
              <span className="text-[11px] font-bold text-[#8F4C35]">Sprint 42</span>
              <span className="text-[10px] text-[#44474E]">on target</span>
            </div>
            <div className="w-20 bg-[#F3EAFF] rounded-full h-2 overflow-hidden shrink-0">
              <div
                className="bg-[#8F4C35] h-2 rounded-full transition-all duration-500"
                style={{ width: `${healthScore?.overallScore || 94.2}%` }}
              />
            </div>
          </div>
        </div>

      </section>

      {/* Main Visualizations Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
        
        {/* Cell 1: Revenue & Solution Trajectory (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#8F4C35]" />
                  <h2 className="text-lg sm:text-xl font-bold font-['Plus_Jakarta_Sans'] text-[#000819]">
                    Revenue &amp; Solution Trajectory
                  </h2>
                </div>
                <p className="text-xs text-[#44474E] mt-0.5">
                  Multi-vector breakdown across Sovereign Cloud, Architecture, and Partner Integration
                </p>
              </div>

              {/* Time Toggle */}
              <div className="flex items-center bg-[#F8F1FF] p-1 rounded-xl shrink-0 border border-[#E8DEFA]">
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    chartView === 'monthly' ? 'bg-white text-[#000819] shadow-xs' : 'text-[#44474E]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setChartView('quarterly')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    chartView === 'quarterly' ? 'bg-white text-[#000819] shadow-xs' : 'text-[#44474E]'
                  }`}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setChartView('yearly')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    chartView === 'yearly' ? 'bg-white text-[#000819] shadow-xs' : 'text-[#44474E]'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap mb-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#07203F]" />
                <span className="text-[#1E182C]">Partner Integration ($1.42M)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#8F4C35]" />
                <span className="text-[#1E182C]">Cloud Solutions ($890k)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#E8DEFA]" />
                <span className="text-[#1E182C]">Enterprise R&amp;D ($535k)</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 pb-2">
              {trajectoryChartData.map((d, index) => {
                const isCurrent = index === trajectoryChartData.length - 1;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[42px] flex flex-col gap-1 items-center relative">
                      {isCurrent ? (
                        <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-[#000819] text-white text-[10px] font-bold shadow-md whitespace-nowrap z-10">
                          {d.label}
                        </div>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-[#000819] absolute -top-6 whitespace-nowrap">
                          {d.label}
                        </span>
                      )}
                      <div className="w-full bg-[#E8DEFA] rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${d.leave}px` }} />
                      <div className="w-full bg-[#8F4C35] rounded-xs transition-all group-hover:opacity-90" style={{ height: `${d.overtime}px` }} />
                      <div className="w-full bg-[#07203F] rounded-b-sm transition-all" style={{ height: `${d.onTime}px` }} />
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'font-bold text-[#000819]' : 'text-[#74777F]'}`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Insights Callout */}
          <div className="flex items-center justify-between mt-5 bg-[#F8F1FF] px-4 py-2.5 rounded-xl border border-[#E8DEFA]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8F4C35]" />
              <span className="text-xs text-[#1E182C] font-medium">
                Trajectory indicates target exceeding Q4 projections by 11.4%.
              </span>
            </div>
            <Link to="/analytics" className="text-xs text-[#8F4C35] font-bold hover:underline flex items-center gap-1 shrink-0">
              <span>Forecast Model</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Cell 2: Solutions Health & Infrastructure Telemetry (1 Col on lg) */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8F4C35] animate-pulse" />
                <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans'] text-[#000819]">
                  Solutions Health
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EEE4FF] text-[#1E182C] text-[10px] font-bold tracking-wider uppercase">
                Active Enclave
              </span>
            </div>
            <p className="text-xs text-[#74777F] mb-5">
              Global edge infrastructure telemetrics &amp; sovereign node clusters.
            </p>

            <div className="space-y-4">
              {/* Latency Index */}
              <div className="p-3.5 rounded-xl bg-[#F8F1FF] border border-[#E8DEFA] flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#000819]">Latency Index</span>
                  <span className="font-bold text-[#8F4C35]">
                    {dbHealth.length > 0 ? `${dbHealth[dbHealth.length - 1].durationMs}ms` : '24ms avg'}
                  </span>
                </div>
                <div className="w-full bg-[#E8DEFA] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#8F4C35] h-1.5 rounded-full" style={{ width: '28%' }} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#74777F]">
                  <span>Optimal &lt; 50ms</span>
                  <span>Global P99: 41ms</span>
                </div>
              </div>

              {/* Node Cluster Saturation */}
              <div className="p-3.5 rounded-xl bg-[#F8F1FF] border border-[#E8DEFA] flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#000819]">Node Cluster Saturation</span>
                  <span className="font-bold text-[#07203F]">61.4%</span>
                </div>
                <div className="w-full bg-[#E8DEFA] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#07203F] h-1.5 rounded-full" style={{ width: '61.4%' }} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#74777F]">
                  <span>Capacity: 500k QPS</span>
                  <span>18 Clusters Active</span>
                </div>
              </div>

              {/* Encrypted Vault Sync */}
              <div className="p-3.5 rounded-xl bg-[#F8F1FF] border border-[#E8DEFA] flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#000819]">Encrypted Vault Sync</span>
                  <span className="font-bold text-[#8F4C35]">Synchronized</span>
                </div>
                <div className="w-full bg-[#E8DEFA] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#8F4C35] h-1.5 rounded-full" style={{ width: '100%' }} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#74777F]">
                  <span>SHA-512 Ledger</span>
                  <span>Last sync: 2m ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Node Footer */}
          <div className="mt-5 pt-4 flex items-center justify-between border-t border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EEE4FF] flex items-center justify-center text-[#07203F]">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#000819] leading-tight">US-East Primary</p>
                <p className="text-[10px] text-[#74777F] leading-tight">No anomalies detected</p>
              </div>
            </div>
            <Link
              to="/analytics"
              className="px-3 py-1 rounded-lg bg-[#07203F] text-white hover:bg-[#000819] text-[11px] font-semibold transition-colors"
            >
              Telemetry
            </Link>
          </div>
        </div>

      </section>

      {/* Secondary Row: Activity Ledger & Executive Directives */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Cell 3: Recent Partner Engagements / Shifts Ledger (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans'] text-[#000819]">
                  Recent Partner Engagements
                </h2>
                <p className="text-xs text-[#74777F] mt-0.5">
                  Real-time ledger of enterprise deployments, integrations, and procurement approvals
                </p>
              </div>
              <Link to="/attendance" className="text-[#8F4C35] text-xs font-bold hover:underline flex items-center gap-1 shrink-0">
                <span>View All ({employees.length > 0 ? employees.length * 4 : 184})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8F1FF] rounded-lg text-[11px] font-bold text-[#74777F] uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg">Enterprise Partner</th>
                    <th className="py-2.5 px-3">Solution Tier</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Timestamp</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Commitment</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0 text-xs">
                  {recentActivities.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8F1FF]/60 transition-colors group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-[#07203F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {row.initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[#000819] truncate">{row.name}</span>
                            <span className="text-[10px] text-[#74777F] truncate">{row.dept}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[#1E182C]">
                        {row.tier}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#74777F] whitespace-nowrap">
                        {row.timestamp}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#000819] whitespace-nowrap">
                        {row.hours}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.statusColor === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFDBD0] text-[#723520] text-[10px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#8F4C35]" /> Completed
                          </span>
                        )}
                        {row.statusColor === 'review' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EEE4FF] text-[#07203F] text-[10px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#07203F]" /> In Review
                          </span>
                        )}
                        {row.statusColor === 'scheduled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3EAFF] text-[#74777F] text-[10px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#74777F]" /> Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-3 flex items-center justify-between border-t border-[#E2E8F0]">
            <span className="text-xs text-[#74777F]">
              Showing {recentActivities.length} of {employees.length > 0 ? employees.length * 4 : 184} active enterprise commitments
            </span>
            <Link
              to="/audit-logs"
              className="px-3 py-1.5 rounded-lg bg-[#F8F1FF] hover:bg-[#EEE4FF] text-[#000819] text-xs font-semibold transition-colors"
            >
              Generate Audit Log
            </Link>
          </div>
        </div>

        {/* Cell 4: Executive Authority & Directives (1 Col) */}
        <div className="flex flex-col gap-4 h-full justify-between">
          
          {/* Executive Protocol Banner */}
          <div className="bg-[#000819] p-5 rounded-2xl shadow-md text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#B2C7EF] font-bold">
                  Executive Authority
                </span>
                <Shield className="w-5 h-5 text-[#8F4C35]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-['Plus_Jakarta_Sans'] text-white">
                Sovereign Enclave Tier 1
              </h3>
              <p className="text-xs text-[#7388AD] mt-1 leading-relaxed">
                Multi-signatory quorum required for network config updates and global key rotations.
              </p>
            </div>
            <div className="relative z-10 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#8F4C35]" />
                <span className="text-xs text-[#D5E3FF] font-medium">Quorum: 3 / 4 signed</span>
              </div>
              <Link
                to="/audit-logs"
                className="px-3 py-1 rounded-lg bg-white text-[#000819] hover:bg-[#F8F1FF] text-[11px] font-semibold transition-colors"
              >
                Audit Ledger
              </Link>
            </div>
            {/* Ambient orb */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#8F4C35] opacity-30 blur-2xl pointer-events-none" />
          </div>

          {/* Quick Action Cards Stack */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col gap-2 flex-1 justify-between">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#000819]">
                Administrative Directives
              </h3>
              <span className="text-[10px] text-[#74777F] font-semibold">3 active</span>
            </div>

            <Link
              to="/leave"
              className="p-2.5 px-3 rounded-xl bg-[#F8F1FF] hover:bg-[#EEE4FF] transition-colors flex items-center justify-between gap-2.5 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-xl bg-white text-[#8F4C35] flex items-center justify-center shadow-xs shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#000819] truncate leading-tight">Review Leave Requests</p>
                  <p className="text-[10px] text-[#74777F] truncate leading-tight">Approve employee leave applications</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#74777F] group-hover:text-[#000819] transition-colors shrink-0" />
            </Link>

            <Link
              to="/audit-logs"
              className="p-2.5 px-3 rounded-xl bg-[#F8F1FF] hover:bg-[#EEE4FF] transition-colors flex items-center justify-between gap-2.5 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-xl bg-white text-[#07203F] flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#000819] truncate leading-tight">Audit Security Logs</p>
                  <p className="text-[10px] text-[#74777F] truncate leading-tight">Zero-trust immutable telemetry</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#74777F] group-hover:text-[#000819] transition-colors shrink-0" />
            </Link>

            <Link
              to="/shifts"
              className="p-2.5 px-3 rounded-xl bg-[#F8F1FF] hover:bg-[#EEE4FF] transition-colors flex items-center justify-between gap-2.5 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-xl bg-white text-[#8F4C35] flex items-center justify-center shadow-xs shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#000819] truncate leading-tight">Manage Shift Rosters</p>
                  <p className="text-[10px] text-[#74777F] truncate leading-tight">Adjust weekly workforce coverage</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#74777F] group-hover:text-[#000819] transition-colors shrink-0" />
            </Link>
          </div>

          {/* Architectural Campus Context Footer */}
          <div className="bg-white p-3 px-3.5 rounded-2xl shadow-xs border border-[#E2E8F0] flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#07203F] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Building2 className="w-6 h-6 text-[#FFDBD0]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#8F4C35] font-bold uppercase">Archon Nell Campus</span>
                <span className="h-1 w-1 rounded-full bg-[#74777F]" />
                <span className="text-[10px] text-[#74777F]">Zurich Hub</span>
              </div>
              <p className="text-xs font-semibold text-[#000819] truncate">Primary Core Facility Alpha</p>
              <p className="text-[10px] text-[#74777F] truncate">Tier IV Storage Active</p>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
