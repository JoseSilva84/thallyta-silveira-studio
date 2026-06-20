import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://www.thallytasilveira.com.br'
const DEFAULT_TITLE = 'Studio de Beleza e Cabeleireiro em Jaguaribe, CE | Thallyta Silveira'
const DEFAULT_DESCRIPTION = 'Procurando um studio de beleza e cabeleireiro em Jaguaribe (CE)? Thallyta Silveira é especialista em cabelos, mechas, tratamentos capilares, progressiva e nail design.'
const DEFAULT_IMAGE = `${SITE_URL}/img/studio-06.jpeg`

const privateRoutes = ['/login', '/register', '/auth/callback', '/meus-agendamentos', '/admin']

const routeTitles = {
  '/login': 'Entrar | Thallyta Silveira',
  '/register': 'Criar conta | Thallyta Silveira',
  '/auth/callback': 'Autenticação | Thallyta Silveira',
  '/meus-agendamentos': 'Meus agendamentos | Thallyta Silveira',
  '/admin': 'Painel administrativo | Thallyta Silveira',
}

const setMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
}

export default function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isPrivate = privateRoutes.some((route) => pathname.startsWith(route))
    const canonicalUrl = isPrivate ? `${SITE_URL}${pathname}` : SITE_URL
    const title = routeTitles[pathname] || DEFAULT_TITLE

    document.title = title
    document.documentElement.lang = 'pt-BR'

    setMeta('meta[name="description"]', { name: 'description', content: DEFAULT_DESCRIPTION })
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: isPrivate ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large',
    })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: DEFAULT_DESCRIPTION })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE })
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'pt_BR' })
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: DEFAULT_DESCRIPTION })
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [pathname])

  return null
}
