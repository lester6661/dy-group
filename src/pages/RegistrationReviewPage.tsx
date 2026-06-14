import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Search, UserCheck, XCircle } from 'lucide-react';
import { SystemModal } from '../components/SystemModal';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  type PendingRegistration,
  type RegistrationApprovalValues,
  registrationReviewService,
} from '../services/registrationReview.service';
import { type StaffOptions, staffService } from '../services/staff.service';

const defaultApprovalValues: RegistrationApprovalValues = {
  employment_type_id: '',
  job_title_id: '',
  employee_status: 'probation',
  hire_date: '',
  start_work_time: '09:00',
  end_work_time: '18:00',
  require_attendance: true,
  base_salary: '',
};

export function RegistrationReviewPage() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [options, setOptions] = useState<StaffOptions>({
    regions: [],
    employmentTypes: [],
    jobTitles: [],
  });
  const [approvalValues, setApprovalValues] = useState<RegistrationApprovalValues>(defaultApprovalValues);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredRegistrations = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return registrations;
    }

    return registrations.filter((registration) =>
      [registration.full_name, registration.email, registration.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [registrations, searchTerm]);

  useEffect(() => {
    void loadRegistrations();
  }, []);

  usePullToRefresh(loadRegistrations);

  async function loadRegistrations() {
    setLoading(true);
    setError('');

    try {
      const [pendingRegistrations, staffOptions] = await Promise.all([
        registrationReviewService.listPendingRegistrations(),
        staffService.getOptions(),
      ]);
      setRegistrations(pendingRegistrations);
      setOptions(staffOptions);
      setSelectedRegistration((current) =>
        current && pendingRegistrations.some((registration) => registration.id === current.id) ? current : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取注册审核列表失败。');
    } finally {
      setLoading(false);
    }
  }

  function openReview(registration: PendingRegistration) {
    setSelectedRegistration(registration);
    setApprovalValues(defaultApprovalValues);
    setReviewNote('');
    setError('');
    setMessage('');
  }

  async function handleApprove() {
    if (!selectedRegistration) {
      return;
    }

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      if (
        !approvalValues.employment_type_id ||
        !approvalValues.job_title_id ||
        !approvalValues.employee_status ||
        !approvalValues.hire_date ||
        !approvalValues.start_work_time ||
        !approvalValues.end_work_time
      ) {
        throw new Error('请完整填写职称、雇佣类型、状态、入职日期、上班时间与下班时间。');
      }

      await registrationReviewService.approveRegistration(selectedRegistration.id, approvalValues);
      setMessage(`${selectedRegistration.full_name} 已通过审核。`);
      setSelectedRegistration(null);
      setReviewNote('');
      setApprovalValues(defaultApprovalValues);
      await loadRegistrations();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : '审核通过失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRegistration) {
      return;
    }

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      await registrationReviewService.rejectRegistration(selectedRegistration.id, reviewNote);
      setMessage(`${selectedRegistration.full_name} 已拒绝。`);
      setSelectedRegistration(null);
      setReviewNote('');
      await loadRegistrations();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : '审核拒绝失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="review-page">
      {error && !selectedRegistration ? <p className="form-alert">{error}</p> : null}
      {message && !selectedRegistration ? <p className="form-success">{message}</p> : null}

      <div className="staff-list-panel">
        <div className="list-header">
          <div>
            <span>待审核列表</span>
            <h3>{filteredRegistrations.length} 个申请</h3>
          </div>

          <label className="table-search">
            <Search size={16} />
            <input
              placeholder="搜索姓名、邮箱、电话"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="table-state">正在读取注册申请...</div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="table-state">暂无待审核注册申请。</div>
        ) : (
          <div className="registration-list">
            {filteredRegistrations.map((registration) => (
              <button key={registration.id} className="registration-item" type="button" onClick={() => openReview(registration)}>
                <span>
                  <strong>{registration.full_name}</strong>
                  <small>{registration.email}</small>
                </span>
                <em>{formatDateTime(registration.created_at)}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRegistration ? (
        <SystemModal
          title={selectedRegistration.full_name}
          subtitle="审核详情"
          ariaLabel="注册审核详情"
          onClose={() => setSelectedRegistration(null)}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={() => setSelectedRegistration(null)}>
                关闭
              </button>
              <button className="primary-button compact-button" type="button" onClick={handleApprove} disabled={submitting}>
                <CheckCircle2 size={18} />
                <span>{submitting ? '处理中...' : '审核通过'}</span>
              </button>
              <button className="secondary-button compact-button danger-text-button" type="submit" form="registration-reject-form" disabled={submitting}>
                <XCircle size={18} />
                <span>{submitting ? '处理中...' : '审核拒绝'}</span>
              </button>
            </>
          }
        >
            <div className="review-badge">
              <UserCheck size={16} />
              <span>待审核</span>
            </div>

            <section className="employee-detail-section">
              <h4>基础资料</h4>
              <div className="detail-list">
                <div>
                  <span>姓名</span>
                  <strong>{selectedRegistration.full_name}</strong>
                </div>
                <div>
                  <span>昵称</span>
                  <strong>{selectedRegistration.nickname || '-'}</strong>
                </div>
                <div>
                  <span>性别</span>
                  <strong>{formatGender(selectedRegistration.gender)}</strong>
                </div>
                <div>
                  <span>生日</span>
                  <strong>{selectedRegistration.birthday || '-'}</strong>
                </div>
                <div>
                  <span>身份证号码</span>
                  <strong>{selectedRegistration.identity_number || '-'}</strong>
                </div>
                <div>
                  <span>手机号码</span>
                  <strong>{selectedRegistration.phone || '-'}</strong>
                </div>
                <div>
                  <span>邮箱</span>
                  <strong>{selectedRegistration.email}</strong>
                </div>
                <div>
                  <span>申请区域</span>
                  <strong>{selectedRegistration.region?.code ?? '-'}</strong>
                </div>
                <div>
                  <span>注册时间</span>
                  <strong>{formatDateTime(selectedRegistration.created_at)}</strong>
                </div>
              </div>
            </section>

            <section className="employee-detail-section">
              <h4>工作资料</h4>
              <div className="approval-form-grid single">
                <label className="form-field">
                  <span>职称</span>
                  <select
                    value={approvalValues.job_title_id}
                    onChange={(event) => setApprovalValues({ ...approvalValues, job_title_id: event.target.value })}
                    required
                  >
                    <option value="">请选择</option>
                    {options.jobTitles.map((title) => (
                      <option key={title.id} value={title.id}>
                        {title.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>雇佣类型</span>
                  <select
                    value={approvalValues.employment_type_id}
                    onChange={(event) => setApprovalValues({ ...approvalValues, employment_type_id: event.target.value })}
                    required
                  >
                    <option value="">请选择</option>
                    {options.employmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>状态</span>
                  <select
                    value={approvalValues.employee_status}
                    onChange={(event) => setApprovalValues({ ...approvalValues, employee_status: event.target.value as RegistrationApprovalValues['employee_status'] })}
                    required
                  >
                    <option value="probation">试用期</option>
                    <option value="active">在职</option>
                    <option value="inactive">停职</option>
                    <option value="left">离职</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>入职日期</span>
                  <input
                    type="date"
                    value={approvalValues.hire_date}
                    onChange={(event) => setApprovalValues({ ...approvalValues, hire_date: event.target.value })}
                    required
                  />
                </label>

                <div className="detail-list full-field">
                  <div>
                    <span>员工编号</span>
                    <strong>审核通过后系统自动生成</strong>
                  </div>
                  <div>
                    <span>正式日期</span>
                    <strong>{approvalValues.hire_date ? calculateConfirmDate(approvalValues.hire_date) : '选择入职日期后自动计算'}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="employee-detail-section">
              <h4>薪资资料</h4>
              <div className="approval-form-grid single">
                <label className="form-field">
                  <span>基本薪资</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvalValues.base_salary}
                    onChange={(event) => setApprovalValues({ ...approvalValues, base_salary: event.target.value })}
                  />
                </label>
              </div>
            </section>

            <section className="employee-detail-section">
              <h4>班次资料</h4>
              <div className="approval-form-grid single">
                <label className="form-field">
                  <span>上班时间</span>
                  <input
                    type="time"
                    value={approvalValues.start_work_time}
                    onChange={(event) => setApprovalValues({ ...approvalValues, start_work_time: event.target.value })}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>下班时间</span>
                  <input
                    type="time"
                    value={approvalValues.end_work_time}
                    onChange={(event) => setApprovalValues({ ...approvalValues, end_work_time: event.target.value })}
                    required
                  />
                </label>

                <label className="toggle-field full-field">
                  <input
                    type="checkbox"
                    checked={approvalValues.require_attendance}
                    onChange={(event) => setApprovalValues({ ...approvalValues, require_attendance: event.target.checked })}
                  />
                  <span>需要考勤</span>
                </label>
              </div>
            </section>

            {error ? <p className="form-alert">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}

            <form id="registration-reject-form" className="reject-form" onSubmit={handleReject}>
              <label className="form-field">
                <span>拒绝原因</span>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="请输入拒绝原因"
                  required
                />
              </label>
            </form>
        </SystemModal>
      ) : null}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatGender(value: string | null | undefined) {
  if (value === 'male') return '男';
  if (value === 'female') return '女';
  return value || '-';
}

function calculateConfirmDate(hireDate: string) {
  const date = new Date(`${hireDate}T00:00:00`);
  date.setMonth(date.getMonth() + 3);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
