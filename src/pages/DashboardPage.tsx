import logoUrl from '../assets/logo.png';

export function DashboardPage() {
  return (
    <section className="home-page" aria-label="DY Group 首页">
      <div className="home-stars" />
      <div className="home-orbit home-orbit-one" />
      <div className="home-orbit home-orbit-two" />
      <div className="home-planet home-planet-left" />
      <div className="home-planet home-planet-right" />
      <div className="home-galaxy" />
      <div className="home-horizon" />

      <div className="home-welcome">
        <div className="home-logo-shell">
          <img src={logoUrl} alt="DY Group Logo" />
        </div>
        <h2>DY GROUP</h2>
        <p className="home-system-name">Production Management System</p>
        <p className="home-slogan">Together We Build Beyond Limits</p>
      </div>
    </section>
  );
}
