import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, FileClock, Plus, RefreshCw, Wand2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  LeaveFormValues,
  LeaveRequestItem,
  RestDayCalendarItem,
  getLeaveStats,
  leaveService,
} from '../services/leave.service';
import type { LeaveRequestStatus, LeaveType } from '../types/database';

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: '年假',
  medical: '病假',
  unpaid: '无薪假',
  replacement: '换休假',
};

const statusLabels: Record<LeaveRequestStatus, string> = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已拒绝',
};

const emptyForm: LeaveFormValues = {
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  reason: '',
  medical_attachment_url: '',
};

export function LeavePage() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<'leave' | 'rest'>('leave');
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [restDays, setRestDays] = useState<RestDayCalendarItem[]>([]);
  const [restCycle, setRestCycle] = useState(getCurrentRestCycle());
  const [selectedRestDates, setSelectedRestDates] = useState<string[]>([]);
  const [formValues, setFormValues] = useState<LeaveFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const stats = useMemo(() => getLeaveStats(requests), [requests]);
  const restCycleRange = useMemo(() => getRestCycleRange(restCycle), [restCycle]);
  const restDates = useMemo(() => getDateRange(restCycleRange.startDate, restCycleRange.endDate), [restCycleRange]);
  const restDaysByDate = useMemo(() => {
    const map = new Map<string, RestDayCalendarItem[]>();
    restDays.forEach((restDay) => {
      const current = map.get(restDay.rest_date) ?? [];
      current.push(restDay);
      current.sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'zh-CN'));
      map.set(restDay.rest_date, current);
    });
    return map;
  }, [restDays]);
  const myRestDays = useMemo(
    () => restDays.filter((restDay) => restDay.profile_id === profile?.id).map((restDay) => restDay.rest_date),
    [profile?.id, restDays],
  );
  const isCurrentRestCycle = restCycle === getCurrentRestCycle();
  const restLocked =
    !isCurrentRestCycle ||
    new Date(`${restCycleRange.startDate}T00:00:00`).getTime() <= new Date().setHours(0, 0, 0, 0);

  useEffect(() => {
    if (profile?.id) {
      loadLeaveRequests(profile.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadRestDays();
  }, [profile?.id, restCycle]);

  async function loadLeaveRequests(profileId = profile?.id) {
    if (!profileId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const leaveRequests = await leaveService.listMyLeaveRequests(profileId);
      setRequests(leaveRequests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取请假记录失败。');
    } finally {
      setLoading(false);
    }
  }

  async function loadRestDays() {
    setLoading(true);
    setError('');

    try {
      const [yearText, monthText] = restCycle.split('-');
      const restDayList = await leaveService.listRestDays(Number(yearText), Number(monthText));
      setRestDays(restDayList);
      setSelectedRestDates(
        restDayList.filter((restDay) => restDay.profile_id === profile?.id).map((restDay) => restDay.rest_date),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取排休日历失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile?.id) {
      setError('无法确认当前用户。');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await leaveService.createLeaveRequest(profile.id, formValues);
      setMessage('请假申请已提交。');
      setFormValues(emptyForm);
      await loadLeaveRequests(profile.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '提交请假申请失败。');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRestDays() {
    const [yearText, monthText] = restCycle.split('-');

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await leaveService.saveMyRestDays(Number(yearText), Number(monthText), selectedRestDates);
      setMessage('排休已提交。');
      await loadRestDays();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '提交排休失败。');
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoFillRestDays() {
    const [yearText, monthText] = restCycle.split('-');

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const count = await leaveService.autoFillRestDays(Number(yearText), Number(monthText));
      setMessage(`已自动补足 ${count} 天排休。`);
      await loadRestDays();
    } catch (autoError) {
      setError(autoError instanceof Error ? autoError.message : '自动排休失败。');
    } finally {
      setSaving(false);
    }
  }

  function toggleRestDate(date: string) {
    if (restLocked) {
      setError('已过排休截止日期，不能修改本周期排休。');
      return;
    }

    setError('');
    setSelectedRestDates((current) => {
      if (current.includes(date)) {
        return current.filter((item) => item !== date);
      }

      if (current.length >= 8) {
        setError('每个周期最多只能选择 8 天排休。');
        return current;
      }

      return [...current, date].sort();
    });
  }

  return (
    <section className="leave-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>员工端</span>
          <h2>请假&休假</h2>
          <p>提交请假申请、查看审核状态，并安排每月排休。</p>
        </div>

        <button
          className="secondary-action"
          type="button"
          onClick={() => (activeView === 'leave' ? loadLeaveRequests() : loadRestDays())}
          disabled={loading}
        >
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="view-tabs">
        <button className={activeView === 'leave' ? 'active' : ''} type="button" onClick={() => setActiveView('leave')}>
          请假申请
        </button>
        <button className={activeView === 'rest' ? 'active' : ''} type="button" onClick={() => setActiveView('rest')}>
          排休
        </button>
      </div>

      {activeView === 'rest' ? (
        <RestDayPlanner
          cycle={restCycle}
          setCycle={setRestCycle}
          cycleRange={restCycleRange}
          dates={restDates}
          restDaysByDate={restDaysByDate}
          selectedRestDates={selectedRestDates}
          myRestDays={myRestDays}
          locked={restLocked}
          loading={loading}
          saving={saving}
          error={error}
          message={message}
          onToggleDate={toggleRestDate}
          onSave={handleSaveRestDays}
          onAutoFill={handleAutoFillRestDays}
        />
      ) : (
        <>

      <div className="leave-stats-grid">
        <StatCard label="全部申请" value={stats.total} />
        <StatCard label="审核中" value={stats.pending} />
        <StatCard label="已通过" value={stats.approved} />
        <StatCard label="已拒绝" value={stats.rejected} />
      </div>

      <div className="staff-grid">
        <form className="staff-form-panel" onSubmit={handleSubmit}>
          <div className="panel-title-row">
            <div>
              <span>提交申请</span>
              <h3>请假资料</h3>
            </div>
            <FileClock size={22} />
          </div>

          <div className="form-grid single">
            <label className="form-field">
              <span>假期类型</span>
              <select
                value={formValues.leave_type}
                onChange={(event) => setFormValues({ ...formValues, leave_type: event.target.value as LeaveType })}
              >
                <option value="annual">年假</option>
                <option value="medical">病假</option>
                <option value="unpaid">无薪假</option>
                <option value="replacement">换休假</option>
              </select>
            </label>

            <label className="form-field">
              <span>开始日期</span>
              <input
                type="date"
                value={formValues.start_date}
                onChange={(event) => setFormValues({ ...formValues, start_date: event.target.value })}
                required
              />
            </label>

            <label className="form-field">
              <span>结束日期</span>
              <input
                type="date"
                value={formValues.end_date}
                onChange={(event) => setFormValues({ ...formValues, end_date: event.target.value })}
                required
              />
            </label>

            <label className="form-field">
              <span>原因</span>
              <textarea
                value={formValues.reason}
                onChange={(event) => setFormValues({ ...formValues, reason: event.target.value })}
                required
              />
            </label>

            <label className="form-field">
              <span>病假附件（预留）</span>
              <input
                value={formValues.medical_attachment_url}
                onChange={(event) => setFormValues({ ...formValues, medical_attachment_url: event.target.value })}
                placeholder="后续接入 Supabase Storage"
              />
            </label>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '提交中' : '提交申请'}</span>
          </button>
        </form>

        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>申请记录</span>
              <h3>{requests.length} 条记录</h3>
            </div>
          </div>

          {loading ? (
            <div className="table-state">正在读取请假记录...</div>
          ) : requests.length === 0 ? (
            <div className="table-state">暂无请假申请。</div>
          ) : (
            <LeaveRequestTable requests={requests} />
          )}
        </div>
      </div>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="leave-stat-card">
      <CalendarCheck2 size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LeaveRequestTable({ requests }: { requests: LeaveRequestItem[] }) {
  return (
    <div className="staff-table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th>假期类型</th>
            <th>日期</th>
            <th>原因</th>
            <th>状态</th>
            <th>审核备注</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>{leaveTypeLabels[request.leave_type]}</td>
              <td>{request.start_date} 至 {request.end_date}</td>
              <td>{request.reason}</td>
              <td>
                <span className={`status-pill leave-status-${request.status}`}>
                  {statusLabels[request.status]}
                </span>
              </td>
              <td>{request.review_note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { leaveTypeLabels, statusLabels as leaveStatusLabels };

type RestDayPlannerProps = {
  cycle: string;
  setCycle: (cycle: string) => void;
  cycleRange: { startDate: string; endDate: string };
  dates: string[];
  restDaysByDate: Map<string, RestDayCalendarItem[]>;
  selectedRestDates: string[];
  myRestDays: string[];
  locked: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  onToggleDate: (date: string) => void;
  onSave: () => void;
  onAutoFill: () => void;
};

function RestDayPlanner({
  cycle,
  setCycle,
  cycleRange,
  dates,
  restDaysByDate,
  selectedRestDates,
  myRestDays,
  locked,
  loading,
  saving,
  error,
  message,
  onToggleDate,
  onSave,
  onAutoFill,
}: RestDayPlannerProps) {
  return (
    <div className="rest-planner">
      <div className="staff-list-panel schedule-filter-panel">
        <div className="attendance-filters">
          <label className="form-field">
            <span>排休月份</span>
            <input type="month" value={cycle} onChange={(event) => setCycle(event.target.value)} />
          </label>
          <div className="rest-cycle-summary">
            <span>排休周期</span>
            <strong>{cycleRange.startDate} 至 {cycleRange.endDate}</strong>
            <small>{locked ? '当前周期不可修改' : '截止日前可选择最多 8 天'}</small>
          </div>
        </div>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="leave-stats-grid">
        <StatCard label="已选排休" value={selectedRestDates.length} />
        <StatCard label="每月上限" value={8} />
        <StatCard label="已保存" value={myRestDays.length} />
        <StatCard label="剩余可选" value={Math.max(0, 8 - selectedRestDates.length)} />
      </div>

      <div className="staff-list-panel schedule-calendar-panel">
        <div className="list-header">
          <div>
            <span>排休日历</span>
            <h3>选择自己的休假日</h3>
          </div>
          <button className="secondary-action" type="button" onClick={onAutoFill} disabled={saving}>
            <Wand2 size={17} />
            <span>自动补足</span>
          </button>
        </div>

        {loading ? (
          <div className="table-state">正在读取排休日历...</div>
        ) : (
          <div className="leave-calendar-grid">
            {dates.map((date) => {
              const dayRestDays = restDaysByDate.get(date) ?? [];
              const selected = selectedRestDates.includes(date);

              return (
                <article className={selected ? 'leave-calendar-day rest-selected' : 'leave-calendar-day'} key={date}>
                  <header>
                    <strong>{date.slice(8)}</strong>
                    <span>{weekdayLabel(date)}</span>
                  </header>

                  <button
                    className={selected ? 'rest-date-toggle selected' : 'rest-date-toggle'}
                    type="button"
                    onClick={() => onToggleDate(date)}
                    disabled={locked}
                  >
                    {selected ? '已选排休' : '选择排休'}
                  </button>

                  {dayRestDays.length === 0 ? (
                    <p>暂无排休</p>
                  ) : (
                    <div className="leave-calendar-list">
                      {dayRestDays.map((restDay) => (
                        <span className="leave-chip leave-type-rest" key={restDay.rest_day_id}>
                          {restDay.employee_name}：排休{restDay.source === 'auto' ? '（自动）' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <button className="primary-button rest-save-button" type="button" onClick={onSave} disabled={saving || locked}>
          <Plus size={18} />
          <span>{saving ? '提交中' : '提交排休'}</span>
        </button>
      </div>
    </div>
  );
}

function getCurrentRestCycle() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const target = today.getDate() < 26 ? new Date(year, month, 1) : new Date(year, month + 1, 1);
  return `${target.getFullYear()}-${`${target.getMonth() + 1}`.padStart(2, '0')}`;
}

function getRestCycleRange(cycle: string) {
  const [yearText, monthText] = cycle.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex - 1, 26);
  const end = new Date(year, monthIndex, 25);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function getDateRange(startDate: string, endDate: string) {
  const date = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];

  while (date <= end) {
    dates.push(toDateKey(date));
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${date}T00:00:00`));
}
