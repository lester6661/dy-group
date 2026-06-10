import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, UserCheck, XCircle } from 'lucide-react';
import {
  PendingRegistration,
  registrationReviewService,
} from '../services/registrationReview.service';

export function RegistrationReviewPage() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
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

    return registrations.filter((registration) => {
      return [registration.full_name, registration.email, registration.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword));
    });
  }, [registrations, searchTerm]);

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    setLoading(true);
    setError('');

    try {
      const pendingRegistrations = await registrationReviewService.listPendingRegistrations();
      setRegistrations(pendingRegistrations);
      setSelectedRegistration((current) => {
        if (!current) {
          return pendingRegistrations[0] ?? null;
        }

        return pendingRegistrations.find((registration) => registration.id === current.id) ?? pendingRegistrations[0] ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取注册审核列表失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedRegistration) {
      return;
    }

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      await registrationReviewService.approveRegistration(selectedRegistration.id);
      setMessage(`${selectedRegistration.full_name} 已通过审核。`);
      setReviewNote('');
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
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>工作工具 / 人事部</span>
          <h2>注册审核</h2>
          <p>审核新注册账号，决定是否允许进入 DY Group 系统。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadRegistrations} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="review-grid">
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
                <button
                  key={registration.id}
                  className={
                    selectedRegistration?.id === registration.id
                      ? 'registration-item active'
                      : 'registration-item'
                  }
                  type="button"
                  onClick={() => setSelectedRegistration(registration)}
                >
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

        <aside className="review-detail-panel">
          <div className="panel-title-row">
            <div>
              <span>审核详情</span>
              <h3>{selectedRegistration?.full_name ?? '未选择申请'}</h3>
            </div>
            <div className="review-badge">
              <UserCheck size={16} />
              <span>待审核</span>
            </div>
          </div>

          {selectedRegistration ? (
            <>
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

              {error ? <p className="form-alert">{error}</p> : null}
              {message ? <p className="form-success">{message}</p> : null}

              <div className="review-actions">
                <button className="primary-button" type="button" onClick={handleApprove} disabled={submitting}>
                  <CheckCircle2 size={18} />
                  <span>{submitting ? '处理中' : '审核通过'}</span>
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
                  <span>{submitting ? '处理中' : '审核拒绝'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="table-state compact">请选择一条注册申请。</div>
          )}
        </aside>
      </div>
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
