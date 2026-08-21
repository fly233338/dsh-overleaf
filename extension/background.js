const DEFAULTS = {
  bridgeUrl: 'http://127.0.0.1:47832',
  bridgeToken: '',
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const result = await syncProject(tab)
    await chrome.action.setBadgeBackgroundColor({ color: '#16803a', tabId: tab.id })
    await chrome.action.setBadgeText({ text: String(result.fileCount || 'OK'), tabId: tab.id })
  } catch (error) {
    await chrome.action.setBadgeBackgroundColor({ color: '#b42318', tabId: tab.id })
    await chrome.action.setBadgeText({ text: '!', tabId: tab.id })
    console.error('dsh-overleaf sync failed', error)
  }
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'dsh-overleaf-poll' || !sender.tab?.id) return undefined
  return pollCommands(sender.tab).catch((error) => {
    console.error('dsh-overleaf poll failed', error)
    return { ok: false, error: error.message }
  })
})

async function syncProject(tab) {
  const context = projectContext(tab)
  const settings = await getSettings()
  const source = await fetch(`${context.origin}/project/${encodeURIComponent(context.projectId)}/download/zip`, {
    credentials: 'include',
    cache: 'no-store',
    redirect: 'follow',
  })
  if (!source.ok) throw new Error(`Overleaf project download failed (HTTP ${source.status}).`)
  const archive = await source.arrayBuffer()
  if (new Uint8Array(archive)[0] !== 0x50 || new Uint8Array(archive)[1] !== 0x4b) {
    throw new Error('Overleaf did not return a ZIP archive. Check your login and project access.')
  }
  const response = await bridgeFetch(settings, `/v1/projects/${encodeURIComponent(context.projectId)}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip', 'X-Overleaf-Project-Name': encodeURIComponent(context.projectName) },
    body: archive,
  })
  return response
}

async function pollCommands(tab) {
  const context = projectContext(tab)
  const settings = await getSettings()
  if (!settings.bridgeToken) return { ok: false, error: 'Bridge token is not configured.' }
  const response = await bridgeFetch(settings, `/v1/projects/${encodeURIComponent(context.projectId)}/commands`)
  for (const command of response.commands || []) {
    const result = await applyCommand(tab.id, command)
    await bridgeFetch(settings, `/v1/commands/${encodeURIComponent(command.id)}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    })
  }
  return { ok: true, count: response.commands?.length || 0 }
}

async function applyCommand(tabId, command) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: applyCurrentEditorFile,
    args: [command],
  })
  return result || { ok: false, error: 'Overleaf editor did not return a result.' }
}

async function applyCurrentEditorFile(command) {
  const sha256 = async (value) => {
    const bytes = new TextEncoder().encode(value)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  const detectPath = () => {
    const selectors = [
      '[data-testid="editor-tab"][aria-selected="true"]',
      '[data-testid="file-tree"] [aria-selected="true"]',
      '.file-tree [aria-selected="true"]',
      '.file-tree .selected',
      '.file-tree .active',
      '[role="treeitem"][aria-selected="true"]',
      '.editor-tabs .active',
      '.nav-tabs .active',
    ]
    const pattern = /((?:[^/\\\n\r:]+\/)*[^/\\\n\r:]+\.(?:tex|bib|sty|cls|bst|md|txt|csv|json|yaml|yml))/i
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const child = element.querySelector('[data-testid*="file-name"], .entity-name, .file-name, .item-name, .name')
        for (const value of [element.dataset?.path, element.title, element.ariaLabel, child?.textContent, element.textContent]) {
          const match = String(value || '').trim().replaceAll('\\', '/').match(pattern)
          if (match) return match[1].replace(/^\/+/, '')
        }
      }
    }
    return null
  }
  const findView = (root) => {
    const queue = [root?.cmView, root?.querySelector('.cm-content')?.cmView].filter(Boolean)
    const seen = new Set()
    while (queue.length) {
      const item = queue.shift()
      if (!item || seen.has(item)) continue
      seen.add(item)
      if (item.state?.doc && typeof item.dispatch === 'function') return item
      for (const key of ['view', 'rootView', 'parent', 'editorView']) {
        if (item[key] && typeof item[key] === 'object') queue.push(item[key])
      }
    }
    return null
  }
  const editors = [...document.querySelectorAll('.cm-editor')]
  const editor = document.querySelector('.cm-editor.cm-focused') || editors.find((item) => {
    const rect = item.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
  const view = editor && findView(editor)
  if (!view) return { ok: false, error: 'Open the target file in the Overleaf source editor.' }
  const activePath = detectPath()
  const expectedPath = String(command.filePath || '').replaceAll('\\', '/').replace(/^\/+/, '')
  if (!activePath || activePath !== expectedPath) {
    return { ok: false, error: `Open ${expectedPath} in Overleaf before writing. Current file: ${activePath || 'unknown'}.` }
  }
  const current = view.state.doc.sliceString(0, view.state.doc.length)
  if (await sha256(current) !== command.expectedSha256) {
    return { ok: false, error: 'The Overleaf file changed after the last sync. Sync again before writing.' }
  }
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: command.content },
    selection: { anchor: 0 },
  })
  view.focus()
  return { ok: true, filePath: activePath }
}

function projectContext(tab) {
  const url = new URL(tab.url || '')
  if (url.protocol !== 'https:' || !(url.hostname === 'overleaf.com' || url.hostname.endsWith('.overleaf.com'))) {
    throw new Error('Open an overleaf.com project first.')
  }
  const match = url.pathname.match(/^\/project\/([^/]+)/)
  if (!match) throw new Error('The active tab is not an Overleaf project.')
  return {
    origin: url.origin,
    projectId: decodeURIComponent(match[1]),
    projectName: String(tab.title || match[1]).replace(/\s+[-–—|]\s+Overleaf.*$/i, '').trim(),
  }
}

async function getSettings() {
  const settings = await chrome.storage.local.get(DEFAULTS)
  const url = new URL(settings.bridgeUrl)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Bridge URL must use local HTTP.')
  }
  if (!settings.bridgeToken) throw new Error('Open extension options and paste the browser token.')
  return { ...settings, bridgeUrl: url.origin }
}

async function bridgeFetch(settings, pathname, init = {}) {
  const response = await fetch(`${settings.bridgeUrl}${pathname}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${settings.bridgeToken}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Bridge returned HTTP ${response.status}.`)
  return body
}
