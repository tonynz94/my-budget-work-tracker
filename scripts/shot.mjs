// Opens the app in Edge without a window, does some steps and saves screenshots in the shots folder.
// It uses the preview server, so there is no login and no real data.
//
// 1. Start the preview server with "npm run dev:shots". It needs the file .env.shots.local (see CLAUDE.md).
// 2. Run "npm run shot -- <name> <width> <height> <steps...>"
//
// Steps
//   goto:/work                 go to a page
//   click:Fixed costs          click the first element with this exact text
//   label:Add                  click the element with this label
//   fill:Name=Rent             type into the field with this label
//   key:Escape                 press a key
//   scroll:900                 scroll the page down to this position
//   wait:500                   wait some milliseconds
//   shot:other-name            save one more screenshot in the middle
//   eval:document.title        run JavaScript in the page and print the result
//
// Example
//   npm run shot -- home-phone 390 844 "goto:/" "wait:500"
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const [name, width, height, ...steps] = process.argv.slice(2)
if (!name || !width || !height) {
  console.log('Usage: npm run shot -- <name> <width> <height> <steps...>')
  process.exit(1)
}

mkdirSync('shots', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

await page.goto('http://localhost:5174/')
await page.getByText('Preview without login').click()
await page.waitForTimeout(400)

for (const step of steps) {
  const [kind, ...rest] = step.split(':')
  const value = rest.join(':')
  if (kind === 'goto') {
    // Change the page without a reload, so the preview data stays.
    await page.evaluate((path) => {
      window.history.pushState(null, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, value)
  } else if (kind === 'click') {
    await page.getByText(value, { exact: true }).first().click()
  } else if (kind === 'label') {
    await page.getByLabel(value, { exact: true }).first().click()
  } else if (kind === 'fill') {
    const [label, text] = value.split('=')
    await page.getByLabel(label, { exact: true }).first().fill(text)
  } else if (kind === 'key') {
    await page.keyboard.press(value)
  } else if (kind === 'shot') {
    await page.screenshot({ path: `shots/${value}.png` })
  } else if (kind === 'wait') {
    await page.waitForTimeout(Number(value))
  } else if (kind === 'scroll') {
    await page.evaluate((y) => window.scrollTo(0, y), Number(value))
  } else if (kind === 'eval') {
    console.log(JSON.stringify(await page.evaluate(value)))
  }
  await page.waitForTimeout(500)
}

await page.screenshot({ path: `shots/${name}.png` })
if (errors.length > 0) console.log('ERRORS', errors.slice(0, 5))
await browser.close()
