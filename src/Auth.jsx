import { useState } from 'react'
import { supabase } from './supabase'
import styles from './Auth.module.css'

export default function Auth({ onClose }) {
  const [mode, setMode]       = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Account created! Check your email to confirm, then log in.')
        setMode('login')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setMessage('Password reset email sent — check your inbox.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const titles = { login: 'Log in', signup: 'Create account', forgot: 'Reset password' }
  const submitLabels = { login: 'Log in', signup: 'Create account', forgot: 'Send reset email' }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{titles[mode]}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {message && <div className={styles.successBox}>{message}</div>}
        {error   && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          {mode !== 'forgot' && (
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Please wait...' : submitLabels[mode]}
          </button>
        </form>

        <div className={styles.switchRow}>
          {mode === 'login' && (
            <>
              <button className={styles.switchBtn} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>
                Create an account
              </button>
              <span className={styles.dot}>·</span>
              <button className={styles.switchBtn} onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button className={styles.switchBtn} onClick={() => { setMode('login'); setError(''); setMessage('') }}>
              Already have an account? Log in
            </button>
          )}
          {mode === 'forgot' && (
            <button className={styles.switchBtn} onClick={() => { setMode('login'); setError(''); setMessage('') }}>
              Back to log in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
