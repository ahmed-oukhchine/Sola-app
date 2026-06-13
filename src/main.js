import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const accent = localStorage.getItem('focus-accent')
if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
  const r = parseInt(accent.slice(1, 3), 16), g = parseInt(accent.slice(3, 5), 16), b = parseInt(accent.slice(5, 7), 16)
  const root = document.documentElement
  const shade = (hex, p) => {
    const cr = parseInt(hex.slice(1, 3), 16), cg = parseInt(hex.slice(3, 5), 16), cb = parseInt(hex.slice(5, 7), 16)
    const t = p < 0 ? 0 : 255, f = p < 0 ? 1 + p : 1 - p
    return `#${Math.round(t + (cr - t) * f).toString(16).padStart(2, '0')}${Math.round(t + (cg - t) * f).toString(16).padStart(2, '0')}${Math.round(t + (cb - t) * f).toString(16).padStart(2, '0')}`
  }
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-hover', shade(accent, 10))
  root.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, ${isLight ? 0.08 : 0.12})`)
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accent}, ${shade(accent, -12)})`)
  root.style.setProperty('--accent-glow', `0 0 30px rgba(${r}, ${g}, ${b}, ${isLight ? 0.08 : 0.15})`)
  root.style.setProperty('--glow', `0 0 0 2px rgba(${r}, ${g}, ${b}, 0.25)`)
}

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
