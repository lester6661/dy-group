import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setSuccessMessage('');

    if (forgotMode) {
      const { error } = await authService.resetPasswordForEmail(email);

      setSubmitting(false);

      if (error) {
        setMessage(`发送重置邮件失败：${error.message}`);
        return;
      }

      setSuccessMessage('密码重置邮件已发送，请到邮箱查看重置链接。');
      return;
    }

    const { data, error } = await authService.signIn(email, password);

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user) {
      navigate(from, { replace: true });
    }
  }

  function switchMode(nextForgotMode: boolean) {
    setForgotMode(nextForgotMode);
    setMessage('');
    setSuccessMessage('');
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-heading">
        <span>{forgotMode ? '账号安全' : '欢迎回来'}</span>
        <h2>{forgotMode ? '忘记密码' : '登录'}</h2>
      </div>

      {!isSupabaseConfigured ? <p className="form-alert">请先在 .env 填写 Supabase 连接信息。</p> : null}

      <label className="form-field">
        <span>邮箱</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

      {forgotMode ? (
        <p className="auth-helper-text">请输入注册邮箱，我们会发送密码重置链接给你。</p>
      ) : (
        <label className="form-field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
      )}

      {message ? <p className="form-alert">{message}</p> : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <button className="primary-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
        {!forgotMode ? <LogIn size={18} /> : null}
        <span>{submitting ? (forgotMode ? '发送中' : '登录中') : forgotMode ? '发送重置邮件' : '登录'}</span>
      </button>

      <p className="auth-switch">
        {forgotMode ? (
          <button className="text-button" type="button" onClick={() => switchMode(false)}>
            返回登录
          </button>
        ) : (
          <>
            <button className="text-button" type="button" onClick={() => switchMode(true)}>
              忘记密码？
            </button>
            <span className="auth-divider">|</span>
            <Link to="/register">注册账号</Link>
          </>
        )}
      </p>
    </form>
  );
}
