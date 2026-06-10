import { Link } from 'react-router-dom';
import { Clock3, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import type { ProfileStatus } from '../types/database';

const statusText: Record<ProfileStatus, string> = {
  pending_review: '注册审核中',
  approved: '已通过审核',
  rejected: '审核未通过',
  suspended: '账号已停用',
};

export function RegisterReviewPage() {
  const { user, profile, loading } = useAuth();

  async function handleSignOut() {
    await authService.signOut();
  }

  if (loading) {
    return <div className="route-loading">正在读取审核状态...</div>;
  }

  if (!user) {
    return (
      <section className="auth-card review-card">
        <div className="review-icon">
          <Clock3 size={28} />
        </div>

        <div className="auth-card-heading">
          <span>等待登录</span>
          <h2>注册审核</h2>
        </div>

        <p className="review-copy">注册申请已提交。请登录账号查看最新审核状态。</p>

        <Link className="primary-button link-button" to="/login">
          <LogIn size={17} />
          <span>前往登录</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card review-card">
      <div className="review-icon">
        <Clock3 size={28} />
      </div>

      <div className="auth-card-heading">
        <span>{profile ? statusText[profile.status] : '等待资料建立'}</span>
        <h2>注册审核</h2>
      </div>

      <p className="review-copy">
        {getReviewMessage(profile?.status)}
      </p>

      <div className="review-meta">
        <span>当前账号</span>
        <strong>{profile?.email ?? user?.email ?? '未登录'}</strong>
      </div>

      {profile?.review_note ? <p className="form-alert">{profile.review_note}</p> : null}

      {profile?.status === 'approved' ? (
        <Link className="primary-button link-button" to="/dashboard">
          进入系统
        </Link>
      ) : null}

      <button className="secondary-button" type="button" onClick={handleSignOut}>
        <LogOut size={17} />
        <span>退出账号</span>
      </button>
    </section>
  );
}

function getReviewMessage(status?: ProfileStatus) {
  if (status === 'approved') {
    return '账号已通过审核，可以进入系统。';
  }

  if (status === 'rejected') {
    return '你的账号申请未通过审核，请联系管理员确认原因。';
  }

  if (status === 'suspended') {
    return '该账号已停用，请联系管理员处理。';
  }

  return '你的账号申请已提交，请等待管理员完成审核。审核通过后即可进入系统。';
}
