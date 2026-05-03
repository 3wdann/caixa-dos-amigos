import { InviteLandingClient } from "@/components/invite/invite-landing-client";

export default function EntrarPage({
  searchParams,
}: {
  searchParams: {
    convite?: string;
  };
}) {
  return <InviteLandingClient token={searchParams.convite ?? null} />;
}
