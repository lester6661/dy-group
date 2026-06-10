import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, Plus, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  ScheduleEmployee,
  ScheduleEntryItem,
  ShiftFormValues,
  getMonthRange,
  scheduleService,
} from '../services/schedule.service';
import type { Region, Shift } from '../types/database';

const emptyShiftForm: ShiftFormValues = {
  name: '',
  start_time: '09:00',
  end_time: '18:30',
  break_minutes: 60,
  is_active: true,
};

export function SchedulePage() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth());
  const [regionId, setRegionId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<ScheduleEmployee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [entries, setEntries] = useState<ScheduleEntryItem[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [shiftForm, setShiftForm] = useState<ShiftFormValues>(emptyShiftForm);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [isDayOff, setIsDayOff] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManageSchedule = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'hr';
  const canViewAllRegions = profile?.role === 'super_admin' || Boolean(profile?.can_view_all_regions);
  const activeShifts = shifts.filter((shift) => shift.is_active);
  const visibleEmployees = useMemo(() => {
    if (!employeeId) {
      return employees;
    }

    return employees.filter((employee) => employee.id === employeeId);
  }, [employeeId, employees]);
  const dates = useMemo(() => getDatesForMonth(month), [month]);
  const entryMap = useMemo(() => {
    const map = new Map<string, ScheduleEntryItem>();
    entries.forEach((entry) => map.set(`${entry.employee_id}:${entry.work_date}`, entry));
    return map;
  }, [entries]);
  const monthRange = useMemo(() => getMonthRange(month), [month]);

  useEffect(() => {
    loadSchedule();
  }, [month, regionId]);

  async function loadSchedule() {
    setLoading(true);
    setError('');

    try {
      const data = await scheduleService.getMonthData(month, regionId);
      setEmployees(data.employees);
      setShifts(data.shifts);
      setEntries(data.entries);
      setRegions(data.regions);
      setEmployeeId((current) => (current && data.employees.some((employee) => employee.id === current) ? current : ''));
    } catch (loadError) {
      setError(`读取班表失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleShiftSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (editingShift) {
        await scheduleService.updateShift(editingShift.id, shiftForm);
        setMessage('班次已更新。');
      } else {
        await scheduleService.createShift(shiftForm);
        setMessage('班次已新增。');
      }

      setEditingShift(null);
      setShiftForm(emptyShiftForm);
      await loadSchedule();
    } catch (saveError) {
      setError(`保存班次失败：${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile?.id) {
      setError('无法确认当前用户。');
      return;
    }

    if (!employeeId) {
      setError('请选择员工。');
      return;
    }

    if (!selectedDate) {
      setError('请选择日期。');
      return;
    }

    if (!isDayOff && !selectedShiftId) {
      setError('请选择班次，或设置为休假日。');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await scheduleService.saveScheduleEntry({
        employee_id: employeeId,
        work_date: selectedDate,
        shift_id: selectedShiftId,
        is_day_off: isDayOff,
        note,
        profile_id: profile.id,
      });
      setMessage('排班已保存。');
      await loadSchedule();
    } catch (saveError) {
      setError(`保存排班失败：${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  function handleEditShift(shift: Shift) {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      break_minutes: shift.break_minutes,
      is_active: shift.is_active,
    });
  }

  function handlePickCell(employee: ScheduleEmployee, date: string, entry: ScheduleEntryItem | undefined) {
    if (!canManageSchedule) {
      return;
    }

    setEmployeeId(employee.id);
    setSelectedDate(date);
    setSelectedShiftId(entry?.shift_id ?? '');
    setIsDayOff(Boolean(entry?.is_day_off));
    setNote(entry?.note ?? '');
  }

  return (
    <section className="schedule-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>员工班表</span>
          <h2>班表</h2>
          <p>{monthRange.startDate} 至 {monthRange.endDate}，用于安排员工班次，并作为考勤判断的优先依据。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadSchedule} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="schedule-grid">
        <div className="staff-form-panel">
          <div className="panel-title-row">
            <div>
              <span>班次管理</span>
              <h3>{editingShift ? editingShift.name : '新增班次'}</h3>
            </div>
            <CalendarDays size={22} />
          </div>

          {canManageSchedule ? (
            <form onSubmit={handleShiftSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>班次名称</span>
                  <input
                    value={shiftForm.name}
                    onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>上班时间</span>
                  <input
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(event) => setShiftForm({ ...shiftForm, start_time: event.target.value })}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>下班时间</span>
                  <input
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(event) => setShiftForm({ ...shiftForm, end_time: event.target.value })}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>休息时长</span>
                  <input
                    type="number"
                    min="0"
                    value={shiftForm.break_minutes}
                    onChange={(event) => setShiftForm({ ...shiftForm, break_minutes: Number(event.target.value) })}
                  />
                </label>
                <label className="form-field checkbox-field">
                  <span>是否启用</span>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={shiftForm.is_active}
                      onChange={(event) => setShiftForm({ ...shiftForm, is_active: event.target.checked })}
                    />
                    <strong>{shiftForm.is_active ? '启用' : '停用'}</strong>
                  </label>
                </label>
              </div>

              <button className="primary-button" type="submit" disabled={saving}>
                <Plus size={18} />
                <span>{saving ? '保存中' : editingShift ? '保存班次' : '新增班次'}</span>
              </button>
            </form>
          ) : (
            <p className="form-helper">你可以查看自己的班表，班次和排班由人事部维护。</p>
          )}

          <div className="shift-list">
            {shifts.map((shift) => (
              <button className="shift-item" type="button" key={shift.id} onClick={() => handleEditShift(shift)}>
                <span>
                  <strong>{shift.name}</strong>
                  <small>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)} · 休息 {shift.break_minutes} 分钟</small>
                </span>
                <em>{shift.is_active ? '启用' : '停用'}</em>
                {canManageSchedule ? <Edit3 size={16} /> : null}
              </button>
            ))}
          </div>
        </div>

        <form className="staff-form-panel" onSubmit={handleEntrySubmit}>
          <div className="panel-title-row">
            <div>
              <span>员工排班</span>
              <h3>{selectedDate || '选择日期'}</h3>
            </div>
            <Save size={22} />
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>月份</span>
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
                  <option key={region.id} value={region.id}>{region.code}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>员工</span>
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">全部员工</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}{employee.region ? ` · ${employee.region.code}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>日期</span>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <label className="form-field">
              <span>班次</span>
              <select
                value={selectedShiftId}
                disabled={isDayOff}
                onChange={(event) => setSelectedShiftId(event.target.value)}
              >
                <option value="">请选择班次</option>
                {activeShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} {shift.start_time.slice(0, 5)}-{shift.end_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field checkbox-field">
              <span>休假日</span>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={isDayOff}
                  onChange={(event) => setIsDayOff(event.target.checked)}
                />
                <strong>{isDayOff ? '休假日' : '上班日'}</strong>
              </label>
            </label>
            <label className="form-field full-field">
              <span>备注</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          </div>

          {canManageSchedule ? (
            <button className="primary-button" type="submit" disabled={saving}>
              <Save size={18} />
              <span>{saving ? '保存中' : '保存排班'}</span>
            </button>
          ) : null}
        </form>
      </div>

      <div className="staff-list-panel schedule-calendar-panel">
        <div className="list-header">
          <div>
            <span>月历模式</span>
            <h3>{visibleEmployees.length} 位员工</h3>
          </div>
        </div>

        {loading ? (
          <div className="table-state">正在读取班表...</div>
        ) : visibleEmployees.length === 0 ? (
          <div className="table-state">暂无员工班表。</div>
        ) : (
          <div className="schedule-calendar-wrap">
            <table className="schedule-calendar-table">
              <thead>
                <tr>
                  <th>员工</th>
                  {dates.map((date) => (
                    <th key={date}>
                      <span>{date.slice(8)}</span>
                      <small>{weekdayLabel(date)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.full_name}</strong>
                      <span>{employee.region?.code ?? '-'}</span>
                    </td>
                    {dates.map((date) => {
                      const entry = entryMap.get(`${employee.id}:${date}`);

                      return (
                        <td key={date}>
                          <button
                            className={entry?.is_day_off ? 'schedule-cell day-off' : 'schedule-cell'}
                            type="button"
                            onClick={() => handlePickCell(employee, date, entry)}
                          >
                            {entry?.is_day_off ? '休' : entry?.shift?.name ?? '-'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function getDatesForMonth(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(year, monthIndex, 1);
  const dates: string[] = [];

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
