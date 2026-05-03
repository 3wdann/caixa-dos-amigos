import { AuthGuard } from "@/components/auth/auth-guard";
import { CaixaDetailClient } from "@/components/dashboard/caixa-detail-client";

export default function CaixaDetailPage({
  params,
}: {
  params: {
    caixaId: string;
  };
}) {
  return (
    <AuthGuard>
      <CaixaDetailClient caixaId={params.caixaId} />
    </AuthGuard>
  );
}
