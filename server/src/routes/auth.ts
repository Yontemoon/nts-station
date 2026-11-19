import { Hono } from 'hono'
import { AUTH_URL, AUTH_KEY } from '../lib/index.js'

import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

const auth = new Hono()

type SuccessAccountTokenData = {
  kind: 'identitytoolkit#VerifyPasswordResponse'
  localId: string
  email: string
  displayName: string
  idToken: string
  registered: boolean
  refreshToken: string
  expiresIn: '3600'
}

type ErrorAccountTokenData = {
  error: {
    code: number
    message: string
    errors: { message: string; domain: string; reason: string }
  }
}

auth.post('/signin', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body['email']
    const password = body['password']

    if (!email) {
      console.warn('No email present')
      return c.json(
        {
          success: false,
        },
        400,
      )
    }

    if (!password) {
      console.warn('No password present')
      return c.json(
        {
          success: false,
        },
        400,
      )
    }

    const signinNtsRes = await fetch(
      `${AUTH_URL}/v1/accounts:signInWithPassword?key=${AUTH_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          password: password,
          clientType: 'CLIENT_TYPE_WEB',
          returnSecureToken: true,
        }),
      },
    )
    const signinNts = (await signinNtsRes.json()) as
      | ErrorAccountTokenData
      | SuccessAccountTokenData

    if ('error' in signinNts) {
      throw new Error(signinNts.error.message)
    }

    setCookie(c, 'refreshToken', signinNts.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return c.json(
      {
        success: true,
        data: signinNts,
      },
      200,
    )
  } catch (error) {
    console.error('Something went wrong')
    return c.json(
      {
        message: error ?? 'Error logging in',
        success: false,
      },
      400,
    )
  }
})

auth.post('/refresh', async (c) => {
  try {
    const refreshToken = getCookie(c, 'refreshToken')
    if (!refreshToken) {
      return c.json({ success: false, message: 'No refresh token found' }, 401)
    }

    const tokenRes = await fetch(`${AUTH_URL}/token?key=${AUTH_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    const tokenData = (await tokenRes.json()) as any

    if (tokenData.error) {
      throw new Error(tokenData.error.message)
    }

    return c.json(
      {
        success: true,
        idToken: tokenData.id_token,
      },
      200,
    )
  } catch (error: any) {
    return c.json({ success: false, message: 'Token refresh failed' }, 401)
  }
})

auth.post('/signout', (c) => {
  deleteCookie(c, 'refreshToken', { path: '/' })
  return c.json({ success: true, message: 'Signed out successfully' })
})

export { auth }
