import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand auth-brand">
          <div className="brand-mark">DY</div>
          <div>
            <strong>DY Group</strong>
            <span>Production</span>
          </div>
        </div>
        <div>
          <span className="auth-kicker">正式版系统</span>
          <h1>统一登录与注册审核</h1>
          <p>账号注册后将进入审核流程，审核通过后才能进入系统菜单。</p>
        </div>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  );
}
