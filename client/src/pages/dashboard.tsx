import MissionHomePage from "./mission-home";
import AdvancedDashboard from "./dashboard-legacy";

export default function Dashboard() {
  return (
    <div className="space-y-10">
      <MissionHomePage />
      <section className="border-t pt-8" data-testid="advanced-dashboard-section">
        <div className="mx-auto mb-4 max-w-7xl px-4 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Advanced dashboard
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Existing operational analytics remain available below the mission-first entry experience.
          </p>
        </div>
        <AdvancedDashboard />
      </section>
    </div>
  );
}
