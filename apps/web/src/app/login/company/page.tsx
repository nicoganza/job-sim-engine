import { redirect } from 'next/navigation';

export default function LegacyCompanyLogin({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const params = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  );
  const qs = params.toString();
  redirect(`/company/login${qs ? `?${qs}` : ''}`);
}
