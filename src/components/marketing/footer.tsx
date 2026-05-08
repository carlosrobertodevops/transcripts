import { Logo } from './logo'
import { Github, Linkedin, Twitter } from 'lucide-react'
import Link from 'next/link'

const FOOTER_SECTIONS = [
  {
    title: 'Produto',
    links: [
      { label: 'Recursos', href: '#features' },
      { label: 'Preços', href: '#pricing' },
      { label: 'API', href: '#' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Contato', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos', href: '#' },
      { label: 'Privacidade', href: '#' },
      { label: 'LGPD', href: '#' },
    ],
  },
]

const SOCIAL = [
  {
    icon: Twitter,
    href: '#',
    label: 'Twitter',
  },
  {
    icon: Github,
    href: '#',
    label: 'GitHub',
  },
  {
    icon: Linkedin,
    href: '#',
    label: 'LinkedIn',
  },
]

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/40 bg-background/50 backdrop-blur-lg">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="space-y-4 lg:col-span-2">
              <Logo size="md" />
              <p className="text-sm text-muted-foreground">
                Transcrição de mídia em português brasileiro com IA de ponta.
              </p>
            </div>

            {/* Links */}
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="mt-12 border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 transcripts — Feito no Brasil 🇧🇷
            </p>
            <div className="flex items-center gap-4">
              {SOCIAL.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
