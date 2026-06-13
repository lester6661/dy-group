import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase';

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regionCode, setRegionCode] = useState('KCH');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    if (password !== confirmPassword) {
      setSubmitting(false);
      setMessage('两次输入的密码不一致。');
      return;
    }

    const { data, error } = await authService.signUp({
      fullName,
      nickname,
      gender,
      birthday,
      identityNumber,
      phone,
      email,
      password,
      regionCode,
    });

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      navigate('/register-review', { replace: true });
      return;
    }

    navigate('/register-review', { replace: true });
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-heading">
        <span>新账号申请</span>
        <h2>注册</h2>
      </div>

      {!isSupabaseConfigured ? <p className="form-alert">请先在 .env 填写 Supabase 连接信息。</p> : null}

      <label className="form-field">
        <span>姓名（身份证姓名）</span>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </label>

      <label className="form-field">
        <span>昵称</span>
        <input value={nickname} onChange={(event) => setNickname(event.target.value)} required />
      </label>

      <label className="form-field">
        <span>性别</span>
        <select value={gender} onChange={(event) => setGender(event.target.value)} required>
          <option value="">请选择</option>
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </label>

      <label className="form-field">
        <span>生日</span>
        <input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} required />
      </label>

      <label className="form-field">
        <span>身份证号码</span>
        <input value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} required />
      </label>

      <label className="form-field">
        <span>手机号码</span>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
      </label>

      <label className="form-field">
        <span>邮箱</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

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

      <label className="form-field">
        <span>确认密码</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
        />
      </label>

      <label className="form-field">
        <span>区域</span>
        <select value={regionCode} onChange={(event) => setRegionCode(event.target.value)} required>
          <option value="KCH">KCH</option>
          <option value="KL">KL</option>
        </select>
      </label>

      {message ? <p className="form-alert">{message}</p> : null}

      <button className="primary-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
        <UserPlus size={18} />
        <span>{submitting ? '提交中' : '提交注册'}</span>
      </button>

      <p className="auth-switch">
        已有账号？ <Link to="/login">返回登录</Link>
      </p>
    </form>
  );
}
