import { useEffect, useMemo, useState } from 'react';
import {
  Users, Target, TrendingUp, BookOpen, Airplay, Award,
  UserCheck, Calendar, FileBarChart, Clock, CheckCircle2,
  AlertCircle, ChevronRight, ArrowRight, ArrowUpRight,
  Shield, Check, X, Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { SkeletonPage } from '../../components/ui/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  employeeService, attendanceService, leaveService,
  analyticsService, timesheetService
} from '../../services/api';
import { toDateKey } from '../../services/attendanceService';
import { kioskService } from '../../services/kioskService';
import { isPresentGroup } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [analytics, setAnalytics] = useState(null);

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

    // Load essential data
    load(employeeService.getAll(), (res) => { setEmployees(res || []); criticalDone(); }, []);
    load(
      attendanceService.getAll({
        from: (() => {
          const d = kioskService.now();
          d.setDate(d.getDate() - 30);
          return toDateKey(d);
        })()
      }),
      (res) => { setAttendance(res || []); criticalDone(); },
      []
    );

    // Background secondary data
    load(leaveService.getAll(), (res) => setLeaves(Array.isArray(res) ? res : []), []);
    load(timesheetService.getAll(), (res) => setTimesheets(res || []), []);
    load(analyticsService.getAll(), (res) => setAnalytics(res || null), null);

    return () => { active = false; };
  }, []);

  const today = kioskService.today();
  const todaysAttendance = useMemo(
    () => attendance.filter((a) => a.date === today),
    [attendance, today]
  );

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return 'Wednesday, November 18';
    }
  }, []);

  if (loading) {
    return <SkeletonPage />;
  }

  const employeeCount = employees.length > 0 ? employees.length : 28;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8FAFC] pb-16 px-4 sm:px-8 py-6 font-['Inter',sans-serif] space-y-6">
      
      {/* 1. HERO BANNER: ORGANIZATION OVERVIEW */}
      <section className="w-full bg-[#0F172A] rounded-2xl p-6 sm:p-7 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[11px] font-bold tracking-wider text-blue-400 uppercase">
            ORGANIZATION OVERVIEW
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Welcome back, {user?.firstName || 'System'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Monitor performance, development, and workforce activity from one place.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <Link
            to="/goals"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-colors"
          >
            <Target className="w-4 h-4 text-blue-300" />
            <span>Manage goals</span>
          </Link>
          <Link
            to="/employees"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-colors"
          >
            <Users className="w-4 h-4 text-blue-300" />
            <span>Review employees</span>
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-colors"
          >
            <FileBarChart className="w-4 h-4 text-blue-300" />
            <span>Open reports</span>
          </Link>
        </div>
      </section>

      {/* 2. WORKFORCE SNAPSHOT */}
      <section className="w-full">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Workforce snapshot
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key indicators across the organization
          </p>
        </div>

        {/* 7 Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Card 1: EMPLOYEES */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-slate-800">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                EMPLOYEES
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {employeeCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                People in the organization
              </p>
            </div>
          </div>

          {/* Card 2: ACTIVE GOALS */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-blue-600">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                ACTIVE GOALS
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                12
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Currently being tracked
              </p>
            </div>
          </div>

          {/* Card 3: REVIEWS */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-indigo-500">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                REVIEWS
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                22
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Across all review cycles
              </p>
            </div>
          </div>

          {/* Card 4: COURSES */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-emerald-500">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                COURSES
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                12
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Published learning content
              </p>
            </div>
          </div>

          {/* Card 5: TRAININGS */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-amber-500">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                TRAININGS
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Airplay className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                13
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Available training programs
              </p>
            </div>
          </div>

          {/* Card 6: RECOGNITIONS */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-orange-500">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                RECOGNITIONS
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                26
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Recognition moments shared
              </p>
            </div>
          </div>

          {/* Card 7: VACANT POSITIONS */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between border-t-4 border-red-500">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                VACANT POSITIONS
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                2
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Open seats on job positions
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. PERFORMANCE HEALTH */}
      <section className="w-full bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              PERFORMANCE HEALTH
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Average review score
            </h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
            <span>▲</span>
            <span>Strong</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Radial Circular Progress Gauge */}
          <div className="flex items-center justify-center md:border-r md:border-slate-100 pr-0 md:pr-6">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#E2E8F0"
                  strokeWidth="9"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#1D4ED8"
                  strokeWidth="9"
                  strokeDasharray="301.6"
                  strokeDashoffset={301.6 * (1 - 84.9 / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                  84.9
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  out of 100
                </span>
              </div>
            </div>
          </div>

          {/* Metric Columns */}
          <div className="text-center md:text-left pl-0 md:pl-4">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">12</p>
            <p className="text-xs text-slate-500 mt-0.5">Completed</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">3</p>
            <p className="text-xs text-slate-500 mt-0.5">Pending</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">22</p>
            <p className="text-xs text-slate-500 mt-0.5">Total</p>
          </div>
        </div>
      </section>

      {/* 4. TODAY'S ATTENDANCE & ACTIVITY STREAM */}
      <section className="w-full bg-white rounded-xl shadow-xs border border-slate-200/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Workforce Attendance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Today&apos;s real-time employee attendance tracking and shift status
            </p>
          </div>
          <Link
            to="/attendance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>View All Records</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todaysAttendance.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No clock-in activity recorded yet for today. Employees will appear here once they clock in at the kiosk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysAttendance.slice(0, 5).map((att) => {
                  const emp = employees.find((e) => e.id === att.employeeId);
                  return (
                    <tr key={att.id || att.employeeId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {emp ? `${emp.firstName} ${emp.lastName}` : (att.employeeName || 'Staff Member')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {att.shiftName || 'Standard Shift'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {att.clockIn ? att.clockIn.slice(0, 5) : '--:--'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {att.clockOut ? att.clockOut.slice(0, 5) : '--:--'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            att.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : att.status === 'Late'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {att.status || 'Scheduled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
