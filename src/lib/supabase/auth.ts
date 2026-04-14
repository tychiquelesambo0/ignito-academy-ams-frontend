/**
 * Authentication Utilities - Supabase Auth ONLY
 * 
 * CRITICAL: All authentication via Supabase Auth methods
 * - NO manual password hashing (no bcrypt, argon2, scrypt)
 * - NO custom JWT generation
 * - NO custom session management
 * - Use supabase.auth.getUser() for server-side validation (NOT getSession())
 */

import { createClient } from './client'
import type { AuthError, User } from '@supabase/supabase-js'

export interface SignUpData {
  email: string
  password: string
  prenom: string
  nom: string
  phone_number: string
  date_naissance: string
}

export interface AuthResponse {
  user: User | null
  error: AuthError | null
}

/**
 * Sign up a new applicant
 * Uses Supabase Auth signUp() - NO manual password hashing
 */
export async function signUpApplicant(data: SignUpData): Promise<AuthResponse> {
  const supabase = createClient()

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        prenom: data.prenom,
        nom: data.nom,
        phone_number: data.phone_number,
        date_naissance: data.date_naissance,
      },
    },
  })

  if (authError) {
    console.error('Supabase Auth signup error:', authError)
    return { user: null, error: authError }
  }

  if (!authData.user) {
    return {
      user: null,
      error: {
        message: 'Aucun utilisateur créé',
        name: 'NoUserError',
        status: 500,
      } as AuthError,
    }
  }

  // Note: Applicant profile is automatically created by database trigger
  // See migration: 20260410000005_auto_create_applicant_profile.sql
  // The trigger reads user metadata and creates the applicants table record

  return { user: authData.user, error: null }
}

/**
 * Sign in with email and password
 * Uses Supabase Auth signInWithPassword() - NO manual verification
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { user: data.user, error }
}

/**
 * Sign out current user
 * Uses Supabase Auth signOut()
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Send password reset email
 * Uses Supabase Auth resetPasswordForEmail()
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  return { error }
}

/**
 * Get current user session
 * Uses Supabase Auth getSession()
 * NOTE: For server-side, use getUser() instead (more secure)
 */
export async function getSession() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

/**
 * Get current user
 * Uses Supabase Auth getUser() - validates JWT with Supabase server
 * CRITICAL: Use this for server-side validation, NOT getSession()
 */
export async function getUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

/**
 * Update user password
 * Uses Supabase Auth updateUser()
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { error }
}

/**
 * Check if user is admin (admissions officer)
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data, error } = await supabase
    .from('admissions_officers')
    .select('id, is_active')
    .eq('id', user.id)
    .single()

  return !error && data?.is_active === true
}

/**
 * Get user role (applicant or admin)
 */
export async function getUserRole(): Promise<'applicant' | 'admin' | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check if admin
  const { data: adminData } = await supabase
    .from('admissions_officers')
    .select('id')
    .eq('id', user.id)
    .single()

  if (adminData) return 'admin'

  // Check if applicant
  const { data: applicantData } = await supabase
    .from('applicants')
    .select('id')
    .eq('id', user.id)
    .single()

  if (applicantData) return 'applicant'

  return null
}
