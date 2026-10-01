(() => {
  document.documentElement.removeAttribute('data-theme')
  try {
    localStorage.removeItem('numen-theme')
  } catch {
    // Legacy preference cleanup is best-effort.
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7f8fb')
})()
