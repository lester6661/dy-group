import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setMessage('两次输入的密码不一致。');
      return;
    }

    setSubmitting(true);
    const { error } = await authService.updatePassword(password);
    setSubmitting(false);

    if (error) {
      setMessage(`更新密码失败：${error.message}`);
      return;
    }

    setSuccessMessage('密码已更新，请使用新密码登录。');
    setTimeout(() => navigate('/login', { replace: true }), 1200);
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-heading">
        <span>账号安全</span>
        <h2>设置新密码</h2>
      </div>

      {!isSupabaseConfigured ? <p className="form-alert">请先在 .env 填写 Supabase 连接信息。</p> : null}

      <label className="form-field">
        <span>新密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
      </label>

      <label className="form-field">
        <span>确认新密码</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
        />
      </label>

      {message ? <p className="form-alert">{message}</p> : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <button className="primary-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
        <KeyRound size={18} />
        <span>{submitting ? '更新中' : '更新密码'}</span>
      </button>

      <p className="auth-switch">
        <Link to="/login">返回登录</Link>
      </p>
    </form>
  );
}
