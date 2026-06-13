import dashboardHeroUrl from '../assets/dashboard-hero.png';

export function DashboardPage() {
  return (
    <section className="home-page" aria-label="DY Group 首页">
      <img className="home-hero-image" src={dashboardHeroUrl} alt="DY Group" />
    </section>
  );
}
