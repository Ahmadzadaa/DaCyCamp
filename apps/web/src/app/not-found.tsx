import Link from 'next/link';
import { BookOpen, Home } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <main className="nf">
      <div className="nf-card">
        <div className="logo">
          <i>Dc</i>
          {t('app.name')}
        </div>
        <svg viewBox="0 0 240 120" className="nf-art" aria-hidden fill="none" strokeLinecap="round">
          <text
            x="120"
            y="92"
            textAnchor="middle"
            fontSize="96"
            fontWeight="700"
            fill="currentColor"
            opacity="0.08"
          >
            404
          </text>
          <path
            d="M30 100 C 70 100, 70 40, 120 40 S 170 100, 210 100"
            stroke="#93A1BC"
            strokeWidth="2"
            strokeDasharray="6 7"
          />
          <circle cx="30" cy="100" r="9" fill="#2BD4A4" />
          <circle cx="210" cy="100" r="9" fill="none" stroke="#93A1BC" strokeWidth="2" />
          <path d="M204 94l12 12M216 94l-12 12" stroke="#FF6B6B" strokeWidth="2" />
        </svg>
        <h1>{t('common.notFound')}</h1>
        <p>{t('common.notFoundDesc')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="b b-brand">
            <Home aria-hidden />
            {t('common.goHome')}
          </Link>
          <Link href="/kurslar" className="b b-ghost">
            <BookOpen aria-hidden />
            {t('nav.courses')}
          </Link>
        </div>
      </div>
    </main>
  );
}
