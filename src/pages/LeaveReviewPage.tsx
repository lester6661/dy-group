import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { type LeaveRequestItem, leaveService } from '../services/leave.service';
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
    void loadPendingRequests();
  }, []);

  async function loadPendingRequests() {
    setLoading(true);
    setError('');

    try {
      const pendingRequests = await leaveService.listPendingLeaveRequests();
      setRequests(pendingRequests);
      setSelectedRequest((current) =>
        current && pendingRequests.some((request) => request.id === current.id) ? current : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取请假审核列表失败。');
    } finally {
      setLoading(false);
    }
  }

  function openReview(request: LeaveRequestItem) {
    setSelectedRequest(request);
    setReviewNote('');
    setError('');
    setMessage('');
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
      setSelectedRequest(null);
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
      setSelectedRequest(null);
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
      {error && !selectedRequest ? <p className="form-alert">{error}</p> : null}
      {message && !selectedRequest ? <p className="form-success">{message}</p> : null}

      <div className="staff-list-panel">
        <div className="list-header">
          <div>
            <span>待审核列表</span>
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
              <button key={request.id} className="registration-item" type="button" onClick={() => openReview(request)}>
                <span>
                  <strong>{request.employee?.full_name ?? '未关联员工'}</strong>
                  <small>
                    {leaveTypeLabels[request.leave_type]} · {formatLeaveDate(request)}
                  </small>
                </span>
                <em>{leaveStatusLabels[request.status]}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRequest ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel wide" role="dialog" aria-modal="true" aria-label="请假审核详情">
            <div className="modal-header">
              <div>
                <span>审核详情</span>
                <h3>{selectedRequest.employee?.full_name ?? '未关联员工'}</h3>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedRequest(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

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
                <span>{selectedRequest.leave_type === 'replacement' ? '换休日期' : '日期'}</span>
                <strong>{formatLeaveDate(selectedRequest)}</strong>
              </div>
              <div>
                <span>原因</span>
                <strong>{selectedRequest.reason}</strong>
              </div>
              {selectedRequest.leave_type === 'medical' ? (
                <div>
                  <span>病假证明</span>
                  {selectedRequest.medical_attachment_url ? (
                    <a className="medical-proof-link" href={selectedRequest.medical_attachment_url} target="_blank" rel="noreferrer">
                      <img src={selectedRequest.medical_attachment_url} alt="病假证明" />
                      <strong>打开原图</strong>
                    </a>
                  ) : (
                    <strong>未上传</strong>
                  )}
                </div>
              ) : null}
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

function formatLeaveDate(request: LeaveRequestItem) {
  if (request.leave_type === 'replacement') {
    return `原本休假日 ${request.start_date}，换去日期 ${request.end_date}`;
  }

  return `${request.start_date} 至 ${request.end_date}`;
}
