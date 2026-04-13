'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Label }  from '@/components/ui/label'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email:    z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})
type FormData = z.infer<typeof schema>

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })

    if (error) {
      setServerError('Email ou mot de passe incorrect. Vérifiez vos identifiants.')
      return
    }

    // Middleware will verify the admissions_officers role and redirect to
    // /admin/forbidden if the account isn't authorised.
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Navbar */}
      <header className="bg-[#021463]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <span className="font-serif text-2xl font-bold text-white tracking-tight">
            Admitta
          </span>
        </div>
      </header>

      {/* Centred card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-lg bg-[#021463] flex items-center
                            justify-center mx-auto mb-5">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#021463]">
              Bureau des Admissions
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Accès réservé au personnel administratif autorisé.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5">

            {serverError && (
              <div className="p-3.5 rounded-md border border-[#EF4444]/20
                              bg-[#EF4444]/5 text-[#EF4444] text-sm leading-relaxed">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Adresse email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@ignitoacademy.com"
                  {...register('email')}
                  className="min-h-[48px] focus-visible:ring-[#4EA6F5]"
                />
                {errors.email && (
                  <p className="text-xs text-[#EF4444]">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="min-h-[48px] pr-10 focus-visible:ring-[#4EA6F5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-[#EF4444]">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] bg-[#021463] hover:bg-[#021463]/90
                           text-white font-semibold rounded-md text-sm mt-2 transition-all"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Vérification…</>
                  : 'Accéder au portail'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-300 mt-6">
            © 2026 Ignito Academy. Tous droits réservés.
          </p>
        </div>
      </main>
    </div>
  )
}
