import { useEffect, useMemo, useState } from 'react'

function App() {
  const baseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [q, setQ] = useState('')
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [newAccount, setNewAccount] = useState({ provider: 'custom', host: '', port: 993, username: '', password: '', use_ssl: true, description: '' })

  const loadAccounts = async () => {
    const res = await fetch(`${baseUrl}/accounts`)
    const data = await res.json()
    setAccounts(data)
    if (data.length && !selectedAccount) {
      setSelectedAccount(data[0].id)
    }
  }

  const loadFolders = async (accountId) => {
    if (!accountId) return
    const res = await fetch(`${baseUrl}/emails/folders?account_id=${accountId}`)
    const data = await res.json()
    setFolders(data)
    if (data.length) setSelectedFolder(data[0].folder)
  }

  const loadEmails = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedAccount) params.append('account_id', selectedAccount)
    if (selectedFolder) params.append('folder', selectedFolder)
    if (q) params.append('q', q)
    const res = await fetch(`${baseUrl}/emails?${params.toString()}`)
    const data = await res.json()
    setEmails(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    loadFolders(selectedAccount)
  }, [selectedAccount])

  useEffect(() => {
    loadEmails()
  }, [selectedAccount, selectedFolder])

  const addAccount = async (e) => {
    e.preventDefault()
    const res = await fetch(`${baseUrl}/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAccount) })
    if (res.ok) {
      setNewAccount({ provider: 'custom', host: '', port: 993, username: '', password: '', use_ssl: true, description: '' })
      await loadAccounts()
    }
  }

  const startSync = async () => {
    if (!selectedAccount) return
    setSyncing(true)
    await fetch(`${baseUrl}/sync/${selectedAccount}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) })
    setTimeout(() => { setSyncing(false); loadEmails(); loadFolders(selectedAccount) }, 2000)
  }

  const markInterested = async (id) => {
    await fetch(`${baseUrl}/emails/${id}/mark/interested`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhook_url: webhookUrl }) })
    loadEmails()
  }

  const suggestReply = async (id) => {
    const res = await fetch(`${baseUrl}/suggest-reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_id: id }) })
    if (res.ok) {
      const data = await res.json()
      alert(data.suggestion)
    }
  }

  const addAgenda = async () => {
    const title = prompt('Agenda title')
    const content = prompt('Agenda content (include cal.com link if applicable)')
    if (!title || !content) return
    await fetch(`${baseUrl}/agenda`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) })
    alert('Agenda saved!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Onebox Email Aggregator</h1>
          <div className="flex gap-2">
            <button onClick={addAgenda} className="px-3 py-2 bg-emerald-600 text-white rounded">Add Agenda</button>
            <a href="/test" className="px-3 py-2 bg-slate-600 text-white rounded">Test</a>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Accounts</h2>
            <form onSubmit={addAccount} className="space-y-2">
              <input className="w-full border p-2 rounded" placeholder="IMAP host" value={newAccount.host} onChange={e=>setNewAccount(a=>({...a, host:e.target.value}))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="border p-2 rounded" placeholder="Port" type="number" value={newAccount.port} onChange={e=>setNewAccount(a=>({...a, port:parseInt(e.target.value||'993')}))} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newAccount.use_ssl} onChange={e=>setNewAccount(a=>({...a, use_ssl:e.target.checked}))} /> SSL</label>
              </div>
              <input className="w-full border p-2 rounded" placeholder="Username" value={newAccount.username} onChange={e=>setNewAccount(a=>({...a, username:e.target.value}))} />
              <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={newAccount.password} onChange={e=>setNewAccount(a=>({...a, password:e.target.value}))} />
              <input className="w-full border p-2 rounded" placeholder="Description" value={newAccount.description} onChange={e=>setNewAccount(a=>({...a, description:e.target.value}))} />
              <button className="w-full bg-blue-600 text-white py-2 rounded">Add Account</button>
            </form>
            <div className="mt-4 space-y-2">
              {accounts.map(a => (
                <button key={a.id} onClick={()=>setSelectedAccount(a.id)} className={`w-full text-left p-2 rounded border ${selectedAccount===a.id? 'bg-blue-50 border-blue-300':'bg-white'}`}>
                  <div className="font-medium">{a.description || a.username}</div>
                  <div className="text-xs text-slate-500">{a.host}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Filters</h2>
            <div className="space-y-2">
              <select className="w-full border p-2 rounded" value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)}>
                <option value="">All Folders</option>
                {folders.map(f => (
                  <option key={f.folder} value={f.folder}>{f.folder} ({f.count})</option>
                ))}
              </select>
              <input className="w-full border p-2 rounded" placeholder="Search subject or body" value={q} onChange={e=>setQ(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={loadEmails} className="px-3 py-2 bg-slate-700 text-white rounded">Search</button>
                <button disabled={syncing} onClick={startSync} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60">{syncing? 'Syncing...':'Sync Last 30 Days'}</button>
              </div>
              <input className="w-full border p-2 rounded" placeholder="Webhook URL (webhook.site)" value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} />
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow md:col-span-1">
            <h2 className="font-semibold mb-2">Stats</h2>
            <p className="text-sm text-slate-600">Emails: {emails.length}</p>
          </div>
        </section>

        <section className="bg-white rounded shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">From</th>
                  <th className="p-2 text-left">Subject</th>
                  <th className="p-2 text-left">Folder</th>
                  <th className="p-2 text-left">AI</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="p-4" colSpan={6}>Loading...</td></tr>
                ) : emails.length === 0 ? (
                  <tr><td className="p-4" colSpan={6}>No emails</td></tr>
                ) : (
                  emails.map(e => (
                    <tr key={e._id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{new Date(e.date).toLocaleString()}</td>
                      <td className="p-2">{e.sender}</td>
                      <td className="p-2">{e.subject}</td>
                      <td className="p-2">{e.folder}</td>
                      <td className="p-2"><span className="px-2 py-1 rounded text-xs bg-slate-100">{e.ai_category || '-'}</span></td>
                      <td className="p-2 flex gap-2">
                        <button onClick={()=>markInterested(e._id)} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded">Mark Interested</button>
                        <button onClick={()=>suggestReply(e._id)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Suggest Reply</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
