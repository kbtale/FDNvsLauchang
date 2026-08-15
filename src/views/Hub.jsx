import React from 'react';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { ExternalLink, Sliders, Dices, Trophy } from 'lucide-react';

export default function Hub() {
  return (
    <div className="admin-page-bg" style={{ padding: '60px 24px 24px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <FdnLogo size={70} />
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-green)' }}>VS</span>
            <LauchangLogo size={70} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>
            FDN VS LAUCHANG
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 600 }}>
            Plataforma de Ruleta y Marcadores para OBS Stream
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <a
            href="/control"
            className="card-panel-active"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff' }}
          >
            <div>
              <div className="pill-badge badge-dark" style={{ marginBottom: 8 }}>
                RECOMENDADO PARA EL STREAMER
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={24} /> PANEL DE CONTROL PRINCIPAL
              </h2>
              <p style={{ opacity: 0.9, marginTop: 4, fontSize: 14 }}>
                Gira la ruleta, controla los puntos de FDN y Lauchang y gestiona el evento en vivo.
              </p>
            </div>
            <ExternalLink size={24} />
          </a>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <a
              href="/roulette"
              target="_blank"
              rel="noreferrer"
              className="card-panel"
              style={{ textDecoration: 'none', color: '#ffffff' }}
            >
              <div className="pill-badge badge-green" style={{ marginBottom: 12 }}>
                OBS SOURCE
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dices size={20} color="var(--accent-green)" /> Overlay Ruleta
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Añade esta URL a tu navegador de OBS para mostrar la ruleta animada entre cámaras.
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Abrir URL <ExternalLink size={14} />
              </span>
            </a>

            <a
              href="/scoreboard"
              target="_blank"
              rel="noreferrer"
              className="card-panel"
              style={{ textDecoration: 'none', color: '#ffffff' }}
            >
              <div className="pill-badge badge-green" style={{ marginBottom: 12 }}>
                OBS SOURCE
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={20} color="var(--accent-green)" /> Overlay Marcador
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Marcador 3D para OBS con fondo 100% transparente.
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Abrir URL <ExternalLink size={14} />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
