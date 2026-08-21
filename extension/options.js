const urlInput = document.querySelector('#bridgeUrl')
const tokenInput = document.querySelector('#bridgeToken')
const status = document.querySelector('#status')

chrome.storage.local.get({ bridgeUrl: 'http://127.0.0.1:47832', bridgeToken: '' }).then((settings) => {
  urlInput.value = settings.bridgeUrl
  tokenInput.value = settings.bridgeToken
})

document.querySelector('#save').addEventListener('click', async () => {
  status.textContent = 'Testing...'
  const bridgeUrl = new URL(urlInput.value).origin
  const bridgeToken = tokenInput.value.trim()
  try {
    const response = await fetch(`${bridgeUrl}/v1/health`, { headers: { Authorization: `Bearer ${bridgeToken}` } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await chrome.storage.local.set({ bridgeUrl, bridgeToken })
    status.textContent = 'Connected.'
  } catch (error) {
    status.textContent = `Connection failed: ${error.message}`
  }
})
