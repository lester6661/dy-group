import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, RefreshCw } from 'lucide-react';
import {
  AttendanceEmployee,
  attendanceManagementService,
} from '../services/attendanceManagement.service';
import type { AttendanceRecord, LeaveRequest, LeaveRequestStatus, Region } from '../types/database';

type AttendanceRow = {
  key: string;
  employee: AttendanceEmployee;
  date: string;
  clockIn: AttendanceRecord | null;
  clockOut: AttendanceRecord | null;
  leaveStatus: string;
  attendanceStatus: 'present' | 'leave' | 'absent' | 'partial' | 'future';
};

type AttendanceStats = {
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  punchCount: number;
};

const attendanceStatusLabels = {
  present: '出勤',
  leave: '请假',
  absent: '缺勤',
  partial: '打卡不完整',
  future: '未到日期',
};

const leaveStatusLabels: Record<LeaveRequestStatus, string> = {
  pending: '审核中',
  approved: '已请假',
  rejected: '已拒绝',
};

export function AttendanceManagementPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    presentDays: 0,
    leaveDays: 0,
    absentDays: 0,
    punchCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedRegionName = useMemo(() => {
    if (!regionId) {
      return '全部区域';
    }

    return regions.find((region) => region.id === regionId)?.code ?? '指定区域';
  }, [regionId, regions]);

  useEffect(() => {
    loadAttendanceData();
  }, [month, regionId]);

  async function loadAttendanceData() {
    setLoading(true);
    setError('');

    try {
      const data = await attendanceManagementService.getMonthData(month, regionId);
      const builtRows = buildAttendanceRows(data.employees, data.attendanceRecords, data.leaveRequests, month);
      setRegions(data.regions);
      setRows(builtRows);
      setStats(calculateStats(builtRows));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取考勤数据失败。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="attendance-management-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>工作工具 / 人事部</span>
          <h2>考勤</h2>
          <p>按月份与区域查看员工出勤、请假、缺勤和打卡次数。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadAttendanceData} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="attendance-filters">
        <label className="form-field">
          <span>月份</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>

        <label className="form-field">
          <span>区域</span>
          <select value={regionId} onChange={(event) => setRegionId(event.target.value)}>
            <option value="">全部区域</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="leave-stats-grid">
        <StatCard label="出勤天数" value={stats.presentDays} />
        <StatCard label="请假天数" value={stats.leaveDays} />
        <StatCard label="缺勤天数" value={stats.absentDays} />
        <StatCard label="打卡次数" value={stats.punchCount} />
      </div>

      <div className="staff-list-panel">
        <div className="list-header">
          <div>
            <span>{selectedRegionName}</span>
            <h3>{month} 考勤列表</h3>
          </div>
        </div>

        {error ? <p className="form-alert table-alert">{error}</p> : null}

        {loading ? (
          <div className="table-state">正在读取考勤数据...</div>
        ) : rows.length === 0 ? (
          <div className="table-state">暂无考勤数据。</div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>员工姓名</th>
                  <th>区域</th>
                  <th>日期</th>
                  <th>上班时间</th>
                  <th>下班时间</th>
                  <th>请假状态</th>
                  <th>考勤状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.employee.full_name}</strong>
                      {row.employee.employee_code ? <span>{row.employee.employee_code}</span> : null}
                    </td>
                    <td>{row.employee.region?.code ?? '-'}</td>
                    <td>{row.date}</td>
                    <td>{row.clockIn ? formatTime(row.clockIn.punched_at) : '-'}</td>
                    <td>{row.clockOut ? formatTime(row.clockOut.punched_at) : '-'}</td>
                    <td>{row.leaveStatus}</td>
                    <td>
                      <span className={`status-pill attendance-status-${row.attendanceStatus}`}>
                        {attendanceStatusLabels[row.attendanceStatus]}
                      </span>
                    </td>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="leave-stat-card">
      <BarChart3 size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildAttendanceRows(
  employees: AttendanceEmployee[],
  attendanceRecords: AttendanceRecord[],
  leaveRequests: LeaveRequest[],
  month: string,
) {
  const dates = getDatesForMonth(month);
  const today = toDateKey(new Date());
  const recordsByEmployeeDate = groupAttendanceRecords(attendanceRecords);
  const leaveByEmployeeDate = groupLeaveRequests(leaveRequests, dates);

  return employees.flatMap((employee) => {
    return dates.map((date) => {
      const records = recordsByEmployeeDate.get(`${employee.id}:${date}`) ?? [];
      const clockIn = records.find((record) => record.punch_type === 'clock_in') ?? null;
      const clockOut = records.find((record) => record.punch_type === 'clock_out') ?? null;
      const leave = leaveByEmployeeDate.get(`${employee.id}:${date}`) ?? null;
      const isFuture = date > today;
      const attendanceStatus = getAttendanceStatus(clockIn, clockOut, leave, isFuture);

      return {
        key: `${employee.id}:${date}`,
        employee,
        date,
        clockIn,
        clockOut,
        leaveStatus: leave ? leaveStatusLabels[leave.status] : '-',
        attendanceStatus,
      };
    });
  });
}

function calculateStats(rows: AttendanceRow[]): AttendanceStats {
  return rows.reduce<AttendanceStats>(
    (stats, row) => {
      if (row.attendanceStatus === 'present' || row.attendanceStatus === 'partial') {
        stats.presentDays += 1;
      }

      if (row.attendanceStatus === 'leave') {
        stats.leaveDays += 1;
      }

      if (row.attendanceStatus === 'absent') {
        stats.absentDays += 1;
      }

      stats.punchCount += Number(Boolean(row.clockIn)) + Number(Boolean(row.clockOut));

      return stats;
    },
    {
      presentDays: 0,
      leaveDays: 0,
      absentDays: 0,
      punchCount: 0,
    },
  );
}

function getAttendanceStatus(
  clockIn: AttendanceRecord | null,
  clockOut: AttendanceRecord | null,
  leave: LeaveRequest | null,
  isFuture: boolean,
): AttendanceRow['attendanceStatus'] {
  if (isFuture) {
    return 'future';
  }

  if (leave?.status === 'approved') {
    return 'leave';
  }

  if (clockIn && clockOut) {
    return 'present';
  }

  if (clockIn || clockOut) {
    return 'partial';
  }

  return 'absent';
}

function groupAttendanceRecords(records: AttendanceRecord[]) {
  const map = new Map<string, AttendanceRecord[]>();

  records.forEach((record) => {
    if (!record.employee_id) {
      return;
    }

    const key = `${record.employee_id}:${toDateKey(new Date(record.punched_at))}`;
    const current = map.get(key) ?? [];
    current.push(record);
    current.sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());
    map.set(key, current);
  });

  return map;
}

function groupLeaveRequests(requests: LeaveRequest[], dates: string[]) {
  const map = new Map<string, LeaveRequest>();
  const dateSet = new Set(dates);

  requests.forEach((request) => {
    if (!request.employee_id) {
      return;
    }

    getDateRange(request.start_date, request.end_date).forEach((date) => {
      if (dateSet.has(date)) {
        map.set(`${request.employee_id}:${date}`, request);
      }
    });
  });

  return map;
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

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
