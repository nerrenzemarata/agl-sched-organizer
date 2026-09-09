export default function DashboardPage() {
  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Christ Youth in Action Monitoring System</h1>
          <p className="sub">Choose a portal to continue.</p>
        </div>
      </header>

      <div className="portal-grid">
        <a href="/agl" className="portal-card">
          <div className="portal-card-icon">A</div>
          <h2>Action Group</h2>
          <p>Weekly class schedules for every action group, color-coded by name.</p>
        </a>
        <a href="/itinerary" className="portal-card">
          <div className="portal-card-icon">S</div>
          <h2>Staffer</h2>
          <p>Google-Calendar-style boards for staff shifts, trips, and appointments.</p>
        </a>
      </div>
    </div>
  );
}
