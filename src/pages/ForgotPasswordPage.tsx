import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setSuccessMessage('');

    const { error } = await authService.resetPasswordForEmail(email);
    setSubmitting(false);

    if (error) {
      setMessage(`发送重置邮件失败：${error.message}`);
      return;
    }

    setSuccessMessage('密码重置邮件已发送，请到邮箱查看重置链接。');
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-heading">
        <h2>忘记密码</h2>
        <p>请输入注册邮箱，系统将发送密码重置邮件。</p>
      </div>

      {!isSupabaseConfigured ? <p className="form-alert">请先在 .env 填写 Supabase 连接信息。</p> : null}

      <label className="form-field">
        <span>邮箱</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

      {message ? <p className="form-alert">{message}</p> : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <button className="primary-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
        <span>{submitting ? '发送中' : '发送重置邮件'}</span>
      </button>

      <p className="auth-switch">
        <Link to="/login">返回登录</Link>
      </p>
    </form>
  );
}
