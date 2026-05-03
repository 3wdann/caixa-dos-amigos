import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default function PainelPage() {
  return (
    <AuthGuard>
      <DashboardPageClient />
    </AuthGuard>
  );
}
