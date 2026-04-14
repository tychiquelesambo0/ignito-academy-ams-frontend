import { redirect } from 'next/navigation'

/**
 * Root page — server-side permanent redirect to /apply.
 * The marketing landing page lives at https://ignitoacademy.com (separate project).
 */
export default function Home() {
  redirect('/apply')
}
