import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Search, UserCheck, X, XCircle } from 'lucide-react';
import {
  type PendingRegistration,
  type RegistrationApprovalValues,
  registrationReviewService,
} from '../services/registrationReview.service';
import { type StaffOptions, staffService } from '../services/staff.service';

const defaultApprovalValues: RegistrationApprovalValues = {
  region_id: '',
  employment_type_id: '',
  job_title_id: '',
  hire_date: '',
  start_work_time: '09:00',
  end_work_time: '18:00',
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
        !approvalValues.region_id ||
        !approvalValues.employment_type_id ||
        !approvalValues.job_title_id ||
        !approvalValues.hire_date ||
        !approvalValues.start_work_time ||
        !approvalValues.end_work_time
      ) {
        throw new Error('请完整填写区域、职称、雇佣类型、入职日期、上班时间与下班时间。');
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
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel wide" role="dialog" aria-modal="true" aria-label="注册审核详情">
            <div className="modal-header">
              <div>
                <span>审核详情</span>
                <h3>{selectedRegistration.full_name}</h3>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedRegistration(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            <div className="review-badge">
              <UserCheck size={16} />
              <span>待审核</span>
            </div>

            <div className="detail-list">
              <div>
                <span>姓名</span>
                <strong>{selectedRegistration.full_name}</strong>
              </div>
              <div>
                <span>邮箱</span>
                <strong>{selectedRegistration.email}</strong>
              </div>
              <div>
                <span>电话</span>
                <strong>{selectedRegistration.phone || '-'}</strong>
              </div>
              <div>
                <span>注册时间</span>
                <strong>{formatDateTime(selectedRegistration.created_at)}</strong>
              </div>
            </div>

            <div className="approval-form-grid single">
              <label className="form-field">
                <span>区域</span>
                <select
                  value={approvalValues.region_id}
                  onChange={(event) => setApprovalValues({ ...approvalValues, region_id: event.target.value })}
                  required
                >
                  <option value="">请选择</option>
                  {options.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.code}
                    </option>
                  ))}
                </select>
              </label>

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
                <span>入职日期</span>
                <input
                  type="date"
                  value={approvalValues.hire_date}
                  onChange={(event) => setApprovalValues({ ...approvalValues, hire_date: event.target.value })}
                  required
                />
              </label>

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
            </div>

            {error ? <p className="form-alert">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}

            <div className="review-actions">
              <button className="primary-button" type="button" onClick={handleApprove} disabled={submitting}>
                <CheckCircle2 size={18} />
                <span>{submitting ? '处理中...' : '审核通过'}</span>
              </button>
            </div>

            <form className="reject-form" onSubmit={handleReject}>
              <label className="form-field">
                <span>拒绝原因</span>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="请输入拒绝原因"
                  required
                />
              </label>

              <button className="secondary-button danger-text-button" type="submit" disabled={submitting}>
                <XCircle size={18} />
                <span>{submitting ? '处理中...' : '审核拒绝'}</span>
              </button>
            </form>
          </div>
        </div>
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
