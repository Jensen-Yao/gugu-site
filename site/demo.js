// Deterministic product demo. No remote APIs, credentials or live market data.
const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

function chart(period = '1d') {
  const svg = $('#demo-chart')
  if (!svg) return
  const count = 52, factor = { '1d': 1, '1w': 1.8, '1M': 2.7 }[period]
  const candles = []
  let previous = 3468
  for (let index = 0; index < count; index++) {
    const movement = Math.sin(index * .71 * factor) * 6 + Math.cos(index * .24) * 4 + .7
    const open = previous, close = open + movement
    candles.push({ open, close, high: Math.max(open, close) + 2 + Math.abs(Math.sin(index + .3)) * 5, low: Math.min(open, close) - 2 - Math.abs(Math.cos(index + .7)) * 5, volume: 10 + Math.abs(Math.sin(index * 1.9)) * 24 })
    previous = close
  }
  const minimum = Math.min(...candles.map(value => value.low)) - 8, maximum = Math.max(...candles.map(value => value.high)) + 8
  const y = value => 226 - (value - minimum) / (maximum - minimum) * 198
  let markup = ''
  for (let index = 0; index < 5; index++) {
    const height = 28 + index * 49
    markup += `<path d="M8 ${height}H714" stroke="#d8e0ed" stroke-opacity=".10" stroke-dasharray="2 5"/><text x="722" y="${height + 3}" fill="#8e9bad" font-size="8" font-family="monospace">${(maximum - index / 4 * (maximum - minimum)).toFixed(0)}</text>`
  }
  for (let index = 0; index < count; index++) {
    const value = candles[index], x = 14 + index * 13.6, color = value.close >= value.open ? '#ef4444' : '#22c55e'
    const top = Math.min(y(value.open), y(value.close)), height = Math.max(1.2, Math.abs(y(value.open) - y(value.close)))
    markup += `<path d="M${x} ${y(value.high)}V${y(value.low)}" stroke="${color}" stroke-width="1"/><rect x="${x - 3.2}" y="${top}" width="6.4" height="${height}" fill="${color}"/><rect x="${x - 3.2}" y="${296 - value.volume}" width="6.4" height="${value.volume}" fill="${color}" opacity=".28"/>`
  }
  for (const [window, color] of [[5, '#e0c98c'], [20, '#aebbd0']]) {
    const points = []
    for (let index = window - 1; index < count; index++) {
      const mean = candles.slice(index - window + 1, index + 1).reduce((sum, value) => sum + value.close, 0) / window
      points.push((14 + index * 13.6).toFixed(2) + ',' + y(mean).toFixed(2))
    }
    markup += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.2" opacity=".9"/>`
  }
  markup += '<text x="10" y="252" fill="#8e9bad" font-size="8" font-family="monospace">VOLUME</text>'
  svg.innerHTML = markup
}
chart('1d')
for (const button of $$('[data-demo-period]')) button.addEventListener('click', () => {
  for (const candidate of $$('[data-demo-period]')) candidate.classList.toggle('selected', candidate === button)
  chart(button.dataset.demoPeriod)
})

const overlay = $('[data-command-overlay]')
const commandInput = $('[data-command-input]')
let commandItems = []
function openCommand() {
  overlay.hidden = false
  commandInput.value = ''
  filterCommand('')
  setTimeout(() => commandInput.focus(), 0)
}
function closeCommand() { overlay.hidden = true }
function filterCommand(query) {
  const q = query.trim().toLowerCase()
  commandItems = $$('[data-command-action]').filter(item => !q || item.textContent.toLowerCase().includes(q))
  for (const item of $$('[data-command-action]')) item.hidden = !commandItems.includes(item)
  if (commandItems[0]) commandItems.forEach((item, index) => item.classList.toggle('selected', index === 0))
}
function runCommand(action) {
  const targets = { market: '#market', screener: '#screener', monitor: '#monitor', paper: '#paper', review: '#review' }
  const target = targets[action]
  closeCommand()
  if (target) $(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
for (const trigger of $$('[data-command-open]')) trigger.addEventListener('click', openCommand)
overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeCommand() })
commandInput.addEventListener('input', () => filterCommand(commandInput.value))
commandInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeCommand() }
  if (event.key === 'Enter') { event.preventDefault(); const selected = $('.command-list button.selected') || commandItems[0]; if (selected) runCommand(selected.dataset.commandAction) }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const current = commandItems.indexOf($('.command-list button.selected'))
    const next = event.key === 'ArrowDown' ? Math.min(commandItems.length - 1, current + 1) : Math.max(0, current - 1)
    commandItems.forEach((item, index) => item.classList.toggle('selected', index === next))
  }
})
for (const item of $$('[data-command-action]')) item.addEventListener('click', () => runCommand(item.dataset.commandAction))
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand() }
  if (event.key === 'Escape' && !overlay.hidden) closeCommand()
})

const themeButton = $('[data-theme-toggle]')
themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  document.querySelector('meta[name=theme-color]').content = next === 'dark' ? '#151619' : '#f6f7f4'
})

const navLinks = $$('[data-nav]')
for (const link of navLinks) link.addEventListener('click', () => {
  for (const item of navLinks) item.classList.toggle('active', item === link)
})
const sections = $$('[id="market"],[id="screener"],[id="monitor"],[id="paper"],[id="review"]')
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    for (const item of navLinks) item.classList.toggle('active', item.dataset.nav === entry.target.id)
  }
}, { rootMargin: '-30% 0px -60% 0px' })
for (const section of sections) observer.observe(section)

const screenerButton = $('[data-run-screener]')
const screenerResults = $('[data-screener-results]')
const screenerStatus = $('[data-screener-status]')
screenerButton.addEventListener('click', () => {
  screenerButton.disabled = true
  screenerButton.textContent = '扫描中…'
  screenerStatus.textContent = '正在按所选规则扫描示例股票池…'
  setTimeout(() => {
    screenerButton.disabled = false
    screenerButton.innerHTML = '重新扫描 <svg><use href="#i-arrow"/></svg>'
    screenerResults.hidden = false
    screenerStatus.textContent = '扫描 100 只，命中 3 条；结果只用于研究。'
  }, 550)
})
for (const signal of $$('[data-signal]')) signal.addEventListener('click', () => {
  const badge = signal.querySelector('em')
  badge.textContent = '已推送'
  badge.classList.add('pushed')
})
$('[data-push-all]').addEventListener('click', () => {
  for (const signal of $$('[data-signal]')) {
    const badge = signal.querySelector('em')
    badge.textContent = '已推送'
    badge.classList.add('pushed')
  }
})
$('[data-simulate]').addEventListener('click', () => {
  $('[data-paper-status]').textContent = '已提交 100 股仿真委托：已成交，回执已推送。'
  $('[data-simulate]').textContent = '已仿真'
})
$('[data-review]').addEventListener('click', () => {
  $('[data-review-output]').hidden = false
  $('[data-review-status]').textContent = '复盘提纲已生成，可复制到对话中继续研究。'
  $('[data-review]').textContent = '重新生成提纲'
})
$('[data-open-monitor]').addEventListener('click', () => $('#monitor').scrollIntoView({ behavior: 'smooth', block: 'start' }))
