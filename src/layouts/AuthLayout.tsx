import { Outlet } from 'react-router-dom';
import logoUrl from '../assets/logo.png';
import authBackgroundUrl from '../assets/auth-space-bg.jpg';

export function AuthLayout() {
  return (
    <main className="auth-shell" style={{ backgroundImage: `linear-gradient(180deg, rgba(4, 7, 24, 0.18), rgba(4, 7, 24, 0.52)), url(${authBackgroundUrl})` }}>
      <section className="auth-panel">
        <div className="auth-product-mark">
          <img src={logoUrl} alt="DY Group" />
          <strong>DY GROUP</strong>
        </div>
        <Outlet />
      </section>
    </main>
  );
}
