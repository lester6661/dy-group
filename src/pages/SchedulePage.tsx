import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  LeaveCalendarItem,
  getMonthRange,
  scheduleService,
} from '../services/schedule.service';
import type { LeaveType, Region } from '../types/database';

const leaveTypeLabels: Record<LeaveType | 'rest', string> = {
  annual: '年假',
  medical: '病假',
  unpaid: '无薪假',
  replacement: '换休假',
  rest: '排休',
};

export function SchedulePage() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(getCurrentRestCycle());
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [leaves, setLeaves] = useState<LeaveCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewAllRegions = profile?.role === 'super_admin' || Boolean(profile?.can_view_all_regions);
  const monthRange = useMemo(() => getMonthRange(month), [month]);
  const calendarCells = useMemo(() => getCalendarCells(month), [month]);
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveCalendarItem[]>();
    leaves.forEach((leave) => {
      const current = map.get(leave.leave_date) ?? [];
      current.push(leave);
      current.sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'zh-CN'));
      map.set(leave.leave_date, current);
    });
    return map;
  }, [leaves]);

  useEffect(() => {
    loadLeaveCalendar();
  }, [month, regionId]);

  async function loadLeaveCalendar() {
    setLoading(true);
    setError('');

    try {
      const data = await scheduleService.getLeaveCalendar(month, regionId);
      setLeaves(data.leaves);
      setRegions(data.regions);
    } catch (loadError) {
      setError(`读取休假班表失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="schedule-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>休假班表</span>
          <h2>休假班表 / 休假日历</h2>
          <p>{monthRange.startDate} 至 {monthRange.endDate}，显示已通过请假与排休情况。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadLeaveCalendar} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      <div className="staff-list-panel schedule-filter-panel">
        <div className="attendance-filters">
          <label className="form-field">
            <span>显示月份</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>

          <label className="form-field">
            <span>区域</span>
            <select
              value={regionId}
              disabled={!canViewAllRegions}
              onChange={(event) => setRegionId(event.target.value)}
            >
              <option value="">全部可查看区域</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.code}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="leave-calendar-legend" aria-label="假期类型颜色">
          {Object.entries(leaveTypeLabels).map(([type, label]) => (
            <span className={`leave-chip leave-type-${type}`} key={type}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="staff-list-panel schedule-calendar-panel">
        <div className="list-header">
          <div>
            <span>月历模式</span>
            <h3>{leaves.length} 条休假 / 排休</h3>
          </div>
          <CalendarDays size={22} />
        </div>

        {loading ? (
          <div className="table-state">正在读取休假日历...</div>
        ) : (
          <div className="leave-calendar-grid">
            {weekdays.map((weekday) => (
              <div className="leave-calendar-weekday" key={weekday}>
                {weekday}
              </div>
            ))}

            {calendarCells.map((date, index) => {
              if (!date) {
                return <div className="leave-calendar-empty" key={`empty-${index}`} />;
              }

              const dayLeaves = leavesByDate.get(date) ?? [];

              return (
                <article className="leave-calendar-day" key={date}>
                  <header>
                    <strong>{date.slice(8)}</strong>
                    <span>{weekdayLabel(date)}</span>
                  </header>

                  {dayLeaves.length === 0 ? (
                    <p>暂无休假</p>
                  ) : (
                    <div className="leave-calendar-list">
                      {dayLeaves.map((leave) => (
                        <span
                          className={`leave-chip leave-type-${leave.leave_type}`}
                          key={`${leave.leave_request_id}:${leave.leave_date}:${leave.employee_id}`}
                        >
                          {leave.employee_name}：{leaveTypeLabels[leave.leave_type]}
                          {leave.leave_type === 'rest' && leave.source === 'auto' ? '（自动）' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getCurrentRestCycle() {
  const now = new Date();
  const target = now.getDate() < 26
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth() + 2, 1);

  return `${target.getFullYear()}-${`${target.getMonth() + 1}`.padStart(2, '0')}`;
}

function getCalendarCells(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(year, monthIndex, 1);
  const dates: Array<string | null> = [];
  const mondayOffset = (date.getDay() + 6) % 7;

  for (let index = 0; index < mondayOffset; index += 1) {
    dates.push(null);
  }

  while (date.getMonth() === monthIndex) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return '未知错误';
}
