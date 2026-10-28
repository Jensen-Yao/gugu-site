// Static, deterministic product demonstration. No remote APIs or credentials.
const tabButtons = [...document.querySelectorAll('[role="tab"]')]
const panels = [...document.querySelectorAll('[role="tabpanel"]')]
function selectView(name, focus = false) {
  for (const button of tabButtons) {
    const active = button.dataset.view === name
    button.setAttribute('aria-selected', String(active))
    button.tabIndex = active ? 0 : -1
    if (active && focus) button.focus()
  }
  for (const panel of panels) panel.hidden = panel.id !== 'preview-' + name
}
for (const button of tabButtons) {
  button.addEventListener('click', () => selectView(button.dataset.view))
  button.addEventListener('keydown', event => {
    const current = tabButtons.indexOf(button)
    let next
    if (event.key === 'ArrowRight') next = (current + 1) % tabButtons.length
    if (event.key === 'ArrowLeft') next = (current + tabButtons.length - 1) % tabButtons.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabButtons.length - 1
    if (next !== undefined) { event.preventDefault(); selectView(tabButtons[next].dataset.view, true) }
  })
}

function chart(period) {
  const svg = document.querySelector('#market-chart')
  const count = 53, factor = { '1d': 1, '1w': 1.7, '1M': 2.4 }[period]
  const candles = []
  let previous = 4014
  for (let index = 0; index < count; index++) {
    const movement = Math.sin(index * .73 * factor) * 5 + Math.cos(index * .27) * 3 + .55
    const open = previous, close = open + movement
    candles.push({ open, close, high: Math.max(open, close) + 2 + Math.abs(Math.sin(index + .3)) * 4, low: Math.min(open, close) - 2 - Math.abs(Math.cos(index + .7)) * 4, volume: 10 + Math.abs(Math.sin(index * 1.9)) * 22 })
    previous = close
  }
  const minimum = Math.min(...candles.map(value => value.low)) - 5, maximum = Math.max(...candles.map(value => value.high)) + 5
  const y = value => 228 - (value - minimum) / (maximum - minimum) * 206
  let markup = ''
  for (let index = 0; index < 5; index++) {
    const height = 22 + index * 51.5
    markup += `<path d="M5 ${height}H797" stroke="#e7ecf8" stroke-opacity=".10" stroke-dasharray="2 5"/><text x="806" y="${height + 3}" fill="#b5bfd0" font-size="7" font-family="monospace">${(maximum - index / 4 * (maximum - minimum)).toFixed(1)}</text>`
  }
  for (let index = 0; index < count; index++) {
    const value = candles[index], x = 10 + index * 14.6, color = value.close >= value.open ? '#ff6577' : '#38d9a9'
    const top = Math.min(y(value.open), y(value.close)), height = Math.max(1.2, Math.abs(y(value.open) - y(value.close)))
    markup += `<path d="M${x} ${y(value.high)}V${y(value.low)}" stroke="${color}" stroke-width="1"/><rect x="${x - 3.4}" y="${top}" width="6.8" height="${height}" fill="${color}"/><rect x="${x - 3.4}" y="${300 - value.volume}" width="6.8" height="${value.volume}" fill="${color}" opacity=".3"/>`
  }
  for (const [window, color] of [[5, '#dfd4a0'], [20, '#b3bacc']]) {
    const points = []
    for (let index = window - 1; index < count; index++) {
      const mean = candles.slice(index - window + 1, index + 1).reduce((sum, value) => sum + value.close, 0) / window
      points.push((10 + index * 14.6).toFixed(2) + ',' + y(mean).toFixed(2))
    }
    markup += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.25" opacity=".85"/>`
  }
  markup += '<path d="M5 251H797" stroke="#e7ecf8" stroke-opacity=".09"/><text x="8" y="264" fill="#b5bfd0" font-size="7" font-family="monospace">VOLUME</text>'
  svg.innerHTML = markup
}
for (const button of document.querySelectorAll('[data-period]')) button.addEventListener('click', () => {
  for (const candidate of document.querySelectorAll('[data-period]')) {
    candidate.classList.toggle('selected', candidate === button)
    candidate.setAttribute('aria-pressed', String(candidate === button))
  }
  document.querySelector('#chart-period-label').textContent = button.textContent
  chart(button.dataset.period)
})
chart('1d')

const copyButton = document.querySelector('#copy-install')
copyButton.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status')
  try {
    await navigator.clipboard.writeText(document.querySelector('#install-code').textContent.trim())
    copyButton.textContent = '已复制 ✓'
    status.textContent = '启动命令已复制到剪贴板。'
    setTimeout(() => { copyButton.textContent = '复制命令 ▢' }, 2200)
  } catch {
    const range = document.createRange()
    range.selectNodeContents(document.querySelector('#install-code'))
    const selection = window.getSelection()
    selection.removeAllRanges(); selection.addRange(range)
    status.textContent = '请复制已选中的命令。'
    copyButton.textContent = '命令已选中'
  }
})
