import AdminShell from '../_components/AdminShell'

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminShell>{children}</AdminShell>
}
