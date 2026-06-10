import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { LeaveRequestItem, leaveService } from '../services/leave.service';
import { leaveStatusLabels, leaveTypeLabels } from './LeavePage';

export function LeaveReviewPage() {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingRequests();
  }, []);

  async function loadPendingRequests() {
    setLoading(true);
    setError('');

    try {
      const pendingRequests = await leaveService.listPendingLeaveRequests();
      setRequests(pendingRequests);
      setSelectedRequest((current) => {
        if (!current) {
          return pendingRequests[0] ?? null;
        }

        return pendingRequests.find((request) => request.id === current.id) ?? pendingRequests[0] ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取请假审核列表失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedRequest) {
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await leaveService.approveLeaveRequest(selectedRequest.id);
      setMessage('请假申请已通过。');
      setReviewNote('');
      await loadPendingRequests();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : '审核通过失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await leaveService.rejectLeaveRequest(selectedRequest.id, reviewNote);
      setMessage('请假申请已拒绝。');
      setReviewNote('');
      await loadPendingRequests();
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
          <h2>请假审核</h2>
          <p>查看待审核请假申请，并完成通过或拒绝处理。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadPendingRequests} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="review-grid">
        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>待审核申请</span>
              <h3>{requests.length} 条申请</h3>
            </div>
          </div>

          {loading ? (
            <div className="table-state">正在读取请假申请...</div>
          ) : requests.length === 0 ? (
            <div className="table-state">暂无待审核请假申请。</div>
          ) : (
            <div className="registration-list">
              {requests.map((request) => (
                <button
                  key={request.id}
                  className={selectedRequest?.id === request.id ? 'registration-item active' : 'registration-item'}
                  type="button"
                  onClick={() => setSelectedRequest(request)}
                >
                  <span>
                    <strong>{request.employee?.full_name ?? '未关联员工'}</strong>
                    <small>{leaveTypeLabels[request.leave_type]} · {request.start_date} 至 {request.end_date}</small>
                  </span>
                  <em>{leaveStatusLabels[request.status]}</em>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="review-detail-panel">
          <div className="panel-title-row">
            <div>
              <span>审核详情</span>
              <h3>{selectedRequest?.employee?.full_name ?? '未选择申请'}</h3>
            </div>
          </div>

          {selectedRequest ? (
            <>
              <div className="detail-list">
                <div>
                  <span>员工</span>
                  <strong>{selectedRequest.employee?.full_name ?? '未关联员工'}</strong>
                </div>
                <div>
                  <span>假期类型</span>
                  <strong>{leaveTypeLabels[selectedRequest.leave_type]}</strong>
                </div>
                <div>
                  <span>日期</span>
                  <strong>{selectedRequest.start_date} 至 {selectedRequest.end_date}</strong>
                </div>
                <div>
                  <span>原因</span>
                  <strong>{selectedRequest.reason}</strong>
                </div>
                <div>
                  <span>病假附件</span>
                  <strong>{selectedRequest.medical_attachment_url || '未上传'}</strong>
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
            <div className="table-state compact">请选择一条请假申请。</div>
          )}
        </aside>
      </div>
    </section>
  );
}
