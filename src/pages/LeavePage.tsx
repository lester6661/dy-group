import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, FileClock, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  LeaveFormValues,
  LeaveRequestItem,
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
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [formValues, setFormValues] = useState<LeaveFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const stats = useMemo(() => getLeaveStats(requests), [requests]);

  useEffect(() => {
    if (profile?.id) {
      loadLeaveRequests(profile.id);
    }
  }, [profile?.id]);

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

  return (
    <section className="leave-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>员工端</span>
          <h2>请假</h2>
          <p>提交请假申请并查看审核状态。</p>
        </div>

        <button className="secondary-action" type="button" onClick={() => loadLeaveRequests()} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

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
