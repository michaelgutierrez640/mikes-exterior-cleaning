import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'
import {
  fetchReportAdminStatus,
  fetchReportPreview,
  postReportAction,
} from '../services/adminApi'

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${
        ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
      }`}
    >
      {label}
    </span>
  )
}

function ReportsBody({ signOut }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [diagnostics, setDiagnostics] = useState(null)
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [monthlyEnabled, setMonthlyEnabled] = useState(true)

  const load = useCallback(async () => {
    setError('')
    try {
      const status = await fetchReportAdminStatus()
      if (status.unauthorized) {
        setError('Unauthorized')
        return
      }
      setData(status)
      setWeeklyEnabled(status.settings?.weeklyEnabled !== false)
      setMonthlyEnabled(status.settings?.monthlyEnabled !== false)
    } catch (err) {
      setError(err.message || 'Failed to load report settings')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function saveSettings() {
    setBusy('save')
    setMessage('')
    try {
      await postReportAction({
        action: 'update-settings',
        weeklyEnabled,
        monthlyEnabled,
      })
      setMessage('Settings saved.')
      await load()
    } catch (err) {
      setMessage(err.message || 'Save failed')
    } finally {
      setBusy('')
    }
  }

  async function runAction(action, type) {
    setBusy(`${action}-${type}`)
    setMessage('')
    setPreviewHtml('')
    setDiagnostics(null)
    try {
      const result = await postReportAction({ action, type })
      if (result.diagnostics) setDiagnostics(result.diagnostics)

      if (action === 'generate-preview') {
        setPreviewTitle(result.subject || 'Preview')
        setPreviewHtml(result.html || '')
        const htmlChars = result.diagnostics?.htmlChars ?? (result.html || '').length
        const textChars = result.diagnostics?.textChars ?? (result.text || '').length
        setMessage(`Preview generated (not emailed). HTML ${htmlChars} chars · text ${textChars} chars.`)
      } else if (result.sent) {
        const htmlChars = result.diagnostics?.htmlChars
        const textChars = result.diagnostics?.textChars
        const sizeNote =
          htmlChars != null && textChars != null ? ` HTML ${htmlChars} chars · text ${textChars} chars.` : ''
        setMessage(
          `Email sent${result.providerMessageId ? ` (id: ${result.providerMessageId})` : ''}.${sizeNote} Confirm both counts are > 0 before relying on Production.`,
        )
      } else if (result.skipped) {
        setMessage(`Skipped: ${result.reason}`)
      } else {
        setMessage(result.error || 'Done')
      }
      await load()
    } catch (err) {
      if (err.diagnostics) setDiagnostics(err.diagnostics)
      setMessage(err.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  async function resend(row) {
    if (!row?.periodKey) return
    if (!window.confirm(`Resend ${row.type} report for ${row.label || row.periodKey}?`)) return
    setBusy(`resend-${row.periodKey}`)
    setMessage('')
    try {
      const result = await postReportAction({
        action: 'resend',
        type: row.type,
        periodKey: row.periodKey,
      })
      if (!result.ok) throw new Error(result.error || 'Resend failed')
      setMessage(`Resent ${row.periodKey}`)
      await load()
    } catch (err) {
      setMessage(err.message || 'Resend failed')
    } finally {
      setBusy('')
    }
  }

  async function openHistoryPreview(row) {
    setBusy(`preview-${row.periodKey}`)
    setMessage('')
    try {
      const preview = await fetchReportPreview(row.periodKey)
      if (preview.unauthorized) throw new Error('Unauthorized')
      setPreviewTitle(preview.subject || row.label || 'Report preview')
      setPreviewHtml(preview.htmlPreview || `<pre>${preview.textPreview || 'No preview stored'}</pre>`)
    } catch (err) {
      setMessage(err.message || 'Preview failed')
    } finally {
      setBusy('')
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-7">
        <p className="text-[0.875rem] text-red-700">{error}</p>
        <button type="button" className="btn-secondary btn-sm mt-4 !rounded-xl" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return <div className="rounded-2xl border border-black/[0.06] bg-white p-7 text-center text-gray-500">Loading reports…</div>
  }

  const env = data.envConfigured || {}

  return (
    <div className="space-y-6">
      <AdminNav activeArea="reports" onSignOut={signOut} />

      {message && (
        <p className="rounded-xl bg-royal-50 px-4 py-3 text-[0.875rem] text-royal-900" role="status">
          {message}
        </p>
      )}

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-navy-900">Email report settings</h2>
            <p className="mt-2 text-[0.875rem] text-gray-600">
              Private weekly and monthly analytics emails. Secrets stay in Vercel environment variables.
            </p>
          </div>
          <Link to="/admin/dashboard" className="text-[0.8125rem] font-semibold text-royal-600 hover:text-royal-700">
            ← Analytics dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Recipient</p>
            <p className="mt-2 text-[0.9375rem] font-semibold text-navy-900">{data.recipientDisplay || 'Not configured'}</p>
            <p className="mt-1 text-[0.75rem] text-gray-500">From ANALYTICS_REPORT_TO_EMAIL</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Next weekly send</p>
            <p className="mt-2 text-[0.9375rem] font-semibold text-navy-900">{data.nextWeeklySendDate}</p>
            <p className="mt-1 text-[0.75rem] text-gray-500">Pacific · Mondays</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Next monthly send</p>
            <p className="mt-2 text-[0.9375rem] font-semibold text-navy-900">{data.nextMonthlySendDate}</p>
            <p className="mt-1 text-[0.75rem] text-gray-500">Pacific · 1st of month</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatusPill ok={env.redis} label={env.redis ? 'Redis ready' : 'Redis missing'} />
          <StatusPill ok={env.resendApiKey} label={env.resendApiKey ? 'Resend key set' : 'Resend key missing'} />
          <StatusPill ok={env.toEmail} label={env.toEmail ? 'To email set' : 'To email missing'} />
          <StatusPill ok={env.fromEmail} label={env.fromEmail ? 'From email set' : 'From email missing'} />
          <StatusPill ok={env.cronSecret} label={env.cronSecret ? 'Cron secret set' : 'Cron secret missing'} />
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-navy-900">
            <input type="checkbox" checked={weeklyEnabled} onChange={(e) => setWeeklyEnabled(e.target.checked)} />
            Weekly reports enabled
          </label>
          <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-navy-900">
            <input type="checkbox" checked={monthlyEnabled} onChange={(e) => setMonthlyEnabled(e.target.checked)} />
            Monthly reports enabled
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary btn-sm !rounded-xl" disabled={Boolean(busy)} onClick={saveSettings}>
            {busy === 'save' ? 'Saving…' : 'Save settings'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => runAction('generate-preview', 'weekly')}
          >
            {busy === 'generate-preview-weekly' ? 'Working…' : 'Generate weekly preview'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => runAction('generate-preview', 'monthly')}
          >
            {busy === 'generate-preview-monthly' ? 'Working…' : 'Generate monthly preview'}
          </button>
          <button
            type="button"
            className="btn-royal btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => runAction('send-test', 'weekly')}
          >
            {busy === 'send-test-weekly' ? 'Sending…' : 'Send test weekly email'}
          </button>
          <button
            type="button"
            className="btn-royal btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => runAction('send-test', 'monthly')}
          >
            {busy === 'send-test-monthly' ? 'Sending…' : 'Send test monthly email'}
          </button>
        </div>

        {diagnostics && (
          <div className="mt-8 rounded-xl border border-black/[0.06] bg-gray-50 p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Last generation diagnostics</p>
            <p className="mt-2 text-[0.8125rem] text-gray-600">
              Private checks only — no secrets, no customer data, no email body content.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[0.75rem] text-gray-500">Report period</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900">{diagnostics.periodLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] text-gray-500">Bodies ready to send</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900">{diagnostics.bodiesReady ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] text-gray-500">Generated HTML characters</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900">{diagnostics.htmlChars ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] text-gray-500">Generated text characters</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900">{diagnostics.textChars ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] text-gray-500">Report data loaded</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900">
                  analytics {diagnostics.reportDataLoaded?.analytics ? 'yes' : 'no'} · leads{' '}
                  {diagnostics.reportDataLoaded?.leads ? 'yes' : 'no'} · projects{' '}
                  {diagnostics.reportDataLoaded?.projects ? 'yes' : 'no'}
                </dd>
              </div>
              <div>
                <dt className="text-[0.75rem] text-gray-500">From address</dt>
                <dd className="text-[0.875rem] font-semibold text-navy-900 break-all">
                  {diagnostics.fromAddress || 'Not shown until send'}
                  {diagnostics.fromAddress
                    ? diagnostics.fromMatchesExpected
                      ? ' · matches expected'
                      : ' · does not match reports@reports.mikesexteriorcleaning.com'
                    : null}
                </dd>
              </div>
            </dl>
            {(diagnostics.htmlChars === 0 || diagnostics.textChars === 0) && (
              <p className="mt-3 text-[0.8125rem] font-semibold text-red-700">
                Do not send Production or scheduled email until both character counts are greater than zero.
              </p>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Last weekly sent</p>
            <p className="mt-2 text-[0.875rem] text-navy-900">
              {data.lastWeeklyReport
                ? `${data.lastWeeklyReport.label || data.lastWeeklyReport.periodKey} · ${data.lastWeeklyReport.status}${
                    data.lastWeeklyReport.sentAt ? ` · ${new Date(data.lastWeeklyReport.sentAt).toLocaleString()}` : ''
                  }`
                : 'None yet'}
            </p>
          </div>
          <div className="rounded-xl border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">Last monthly sent</p>
            <p className="mt-2 text-[0.875rem] text-navy-900">
              {data.lastMonthlyReport
                ? `${data.lastMonthlyReport.label || data.lastMonthlyReport.periodKey} · ${data.lastMonthlyReport.status}${
                    data.lastMonthlyReport.sentAt ? ` · ${new Date(data.lastMonthlyReport.sentAt).toLocaleString()}` : ''
                  }`
                : 'None yet'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        <h2 className="font-display text-xl font-semibold text-navy-900">Report history</h2>
        <p className="mt-2 text-[0.875rem] text-gray-600">Aggregate delivery records only — no customer personal information.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Type', 'Period', 'Status', 'Body size', 'Sent', 'Recipient', 'Actions'].map((h) => (
                  <th key={h} className="py-2 pr-3 text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.history || []).map((row) => (
                <tr key={row.periodKey} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-3 pr-3 text-[0.8125rem] text-navy-900">{row.type}</td>
                  <td className="py-3 pr-3 text-[0.8125rem] text-gray-600">
                    <div>{row.label || row.periodKey}</div>
                    {row.failureReason ? <div className="mt-1 text-red-600">{row.failureReason}</div> : null}
                  </td>
                  <td className="py-3 pr-3 text-[0.8125rem] text-gray-600">{row.status}</td>
                  <td className="py-3 pr-3 text-[0.8125rem] text-gray-600">
                    {row.htmlChars != null || row.textChars != null
                      ? `H ${row.htmlChars ?? '—'} · T ${row.textChars ?? '—'}`
                      : '—'}
                  </td>
                  <td className="py-3 pr-3 text-[0.8125rem] text-gray-600">
                    {row.sentAt ? new Date(row.sentAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 pr-3 text-[0.8125rem] text-gray-600">{row.recipient || '—'}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-[0.8125rem] font-semibold text-royal-600 hover:text-royal-700"
                        disabled={Boolean(busy)}
                        onClick={() => openHistoryPreview(row)}
                      >
                        Preview
                      </button>
                      {(row.status === 'sent' || row.status === 'failed') && !String(row.periodKey).includes(':test:') && !String(row.periodKey).includes(':preview:') && (
                        <button
                          type="button"
                          className="text-[0.8125rem] font-semibold text-navy-900 hover:text-royal-700"
                          disabled={Boolean(busy)}
                          onClick={() => resend(row)}
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!(data.history || []).length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[0.875rem] text-gray-500">
                    No reports sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewHtml && (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-navy-900">{previewTitle}</h2>
            <button type="button" className="text-[0.8125rem] font-semibold text-gray-500" onClick={() => setPreviewHtml('')}>
              Close preview
            </button>
          </div>
          <iframe title="Report preview" className="h-[70vh] w-full rounded-xl border border-black/[0.08] bg-white" srcDoc={previewHtml} />
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  return (
    <>
      <SeoHead
        title="Admin Reports | Mike's Exterior"
        description="Private analytics email report settings."
        canonical={absoluteUrl('/admin/reports')}
        noindex
      />
      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin · Email reports</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Weekly and monthly website performance emails for Mike. Aggregate data only.
          </p>
        </div>
      </section>
      <section className="section-container -mt-6 pb-20">
        <AdminAuthGate>
          {({ signOut }) => <ReportsBody signOut={signOut} />}
        </AdminAuthGate>
      </section>
    </>
  )
}
