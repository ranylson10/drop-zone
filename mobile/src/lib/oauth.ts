import * as Linking from 'expo-linking'
import { supabase } from './supabase'

export const oauthProviders = [
  { provider: 'google', label: 'Google' },
  { provider: 'discord', label: 'Discord' },
] as const

type OAuthProvider = (typeof oauthProviders)[number]['provider']

const redirectTo = Linking.createURL('/auth/callback')

export async function signInWithSocialProvider(provider: OAuthProvider) {
  if (!supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    throw error
  }

  if (!data.url) {
    throw new Error('URL de autenticacao nao retornada.')
  }

  await Linking.openURL(data.url)
}

export async function completeOAuthFromUrl(url?: string | null) {
  if (!supabase || !url) {
    return false
  }

  const parsed = Linking.parse(url)
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      throw error
    }
    return true
  }

  const accessToken = getFragmentValue(url, 'access_token')
  const refreshToken = getFragmentValue(url, 'refresh_token')

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      throw error
    }
    return true
  }

  return false
}

function getFragmentValue(url: string, key: string) {
  const hash = url.split('#')[1]
  if (!hash) {
    return null
  }

  return new URLSearchParams(hash).get(key)
}
