import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .email('Adresse email invalide')
    .toLowerCase(),
  
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
})

export type LoginFormData = z.infer<typeof loginSchema>
