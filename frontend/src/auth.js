/** App-scoped keys so we never clash with other apps/extensions using generic "token". */
const AUTH_TOKEN_KEY = 'aicsgts_token'
const REMEMBER_ME_KEY = 'aicsgts_remember_me'

/** Legacy keys (migrate reads; new writes clear these). */
const LEGACY_AUTH_TOKEN_KEY = 'token'
const LEGACY_REMEMBER_ME_KEY = 'remember_me'

function readRememberFlag() {
  return (
    localStorage.getItem(REMEMBER_ME_KEY) === '1' ||
    localStorage.getItem(LEGACY_REMEMBER_ME_KEY) === '1'
  )
}

export function setToken(token, rememberMe = false) {
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_REMEMBER_ME_KEY)
  sessionStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)

  if (rememberMe) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(REMEMBER_ME_KEY, '1')
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    return
  }

  sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
}

/**
 * When "Remember me" is on, the token must come from localStorage (persists across browser restarts).
 * Otherwise prefer sessionStorage. Session is checked second for remembered users only if local is empty
 * (e.g. partial migration).
 */
export function getToken() {
  if (readRememberFlag()) {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
      null
    )
  }
  return (
    sessionStorage.getItem(AUTH_TOKEN_KEY) ||
    sessionStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
    null
  )
}

export function isRememberMeEnabled() {
  return readRememberFlag()
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_REMEMBER_ME_KEY)
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
}
