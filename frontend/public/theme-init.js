(() => {
  try {
    const saved = localStorage.getItem('numen-theme')
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#050B14' : '#08111F'
    )
  } catch {
    document.documentElement.dataset.theme = 'light'
  }
})()
