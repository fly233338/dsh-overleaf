setInterval(() => {
  chrome.runtime.sendMessage({ type: 'dsh-overleaf-poll' }).catch(() => {})
}, 1500)

chrome.runtime.sendMessage({ type: 'dsh-overleaf-poll' }).catch(() => {})
