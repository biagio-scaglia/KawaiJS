import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getBaseThemeCss(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(dirname, '..', '..', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', 'renderer-dom', 'dist', 'theme.css'),
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'dist', 'theme.css'),
    path.resolve(dirname, '..', '..', 'node_modules', '@kawaijs', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', 'node_modules', '@kawaijs', 'renderer-dom', 'dist', 'theme.css')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return fs.readFileSync(c, 'utf-8');
    }
  }

  // Built-in fallback base CSS
  return `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap');
:root {
  --kawa-font-heading: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --kawa-font-body: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --kawa-font-family: var(--kawa-font-body);
  --kawa-bg-color: #080c16;
  --kawa-text-color: #f8fafc;
  --kawa-primary-accent: #f43f5e;
  --kawa-primary-glow: rgba(244, 63, 94, 0.45);
  --kawa-secondary-accent: #38bdf8;
  --kawa-dialogue-bg: linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 15, 29, 0.95) 100%);
  --kawa-dialogue-border: rgba(244, 63, 94, 0.35);
  --kawa-dialogue-radius: 16px;
  --kawa-dialogue-padding: clamp(16px, 2.5vh, 26px) clamp(20px, 3vw, 36px);
  --kawa-speaker-bg: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  --kawa-speaker-color: #ffffff;
  --kawa-speaker-radius: 8px;
  --kawa-choice-bg: linear-gradient(135deg, rgba(30, 41, 59, 0.88) 0%, rgba(15, 23, 42, 0.94) 100%);
  --kawa-choice-hover-bg: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  --kawa-choice-color: #ffffff;
  --kawa-choice-border: 1px solid rgba(255, 255, 255, 0.14);
  --kawa-choice-radius: 12px;
  --kawa-choice-padding: clamp(12px, 1.8vh, 16px) clamp(20px, 3vw, 32px);
  --kawa-menu-btn-bg: rgba(15, 23, 42, 0.6);
  --kawa-menu-btn-hover-bg: rgba(244, 63, 94, 0.85);
  --kawa-stage-aspect-ratio: 16 / 9;
  --kawa-main-menu-bg: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%);
  --kawa-main-menu-title-color: #f8fafc;
  --kawa-main-menu-btn-bg: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.88) 100%);
  --kawa-main-menu-btn-hover-bg: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  --kawa-main-menu-btn-color: #ffffff;
  --kawa-main-menu-btn-radius: 12px;
  --kawa-main-menu-btn-padding: clamp(8px, 1.4vh, 12px) 20px;
}
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #030712; overflow: hidden; -webkit-font-smoothing: antialiased; }
.kawa-root { position: relative; width: 100vw; height: 100vh; background: radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%); color: var(--kawa-text-color); font-family: var(--kawa-font-family); display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; box-sizing: border-box; }
.kawa-root * { box-sizing: border-box; }
.kawa-stage { position: relative; width: 100%; max-width: calc(100vh * (16 / 9)); aspect-ratio: var(--kawa-stage-aspect-ratio); background: radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 50px rgba(244, 63, 94, 0.12); }
.kawa-background { position: absolute; inset: 0; z-index: 1; background: radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%); overflow: hidden; }
.kawa-bg-layer { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat; transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
.kawa-bg-layer.active { opacity: 1; }
.kawa-characters { position: absolute; inset: 0; pointer-events: none; z-index: 2; display: flex; align-items: flex-end; }
@keyframes kawa-sprite-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.kawa-sprite { position: absolute; bottom: 0; height: 85%; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease; display: flex; align-items: flex-end; justify-content: center; }
.kawa-sprite img { max-height: 100%; width: auto; object-fit: contain; filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.7)); animation: kawa-sprite-breathe 4s ease-in-out infinite; }
.kawa-sprite.kawa-pos-left { left: 15%; transform: translateX(-50%); }
.kawa-sprite.kawa-pos-center { left: 50%; transform: translateX(-50%); }
.kawa-sprite.kawa-pos-right { left: 85%; transform: translateX(-50%); }
.kawa-ui-layer { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; justify-content: flex-end; padding: clamp(20px, 3.5vh, 36px) clamp(24px, 4vw, 54px); pointer-events: none; }
.kawa-dialogue-box { position: relative; width: 100%; min-height: 140px; background: var(--kawa-dialogue-bg); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid var(--kawa-dialogue-border); border-radius: var(--kawa-dialogue-radius); padding: var(--kawa-dialogue-padding); box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(244, 63, 94, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15); pointer-events: auto; cursor: pointer; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease; }
.kawa-dialogue-box:hover { transform: translateY(-2px); box-shadow: 0 24px 60px -10px rgba(0, 0, 0, 0.85), 0 0 35px rgba(244, 63, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25); }
.kawa-speaker-tag { display: inline-flex; align-items: center; font-family: var(--kawa-font-heading); font-weight: 800; font-size: 1.05rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--kawa-speaker-color); background: var(--kawa-speaker-bg); padding: 5px 16px; border-radius: var(--kawa-speaker-radius); margin-bottom: 12px; box-shadow: 0 4px 14px rgba(244, 63, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.2); }
.kawa-dialogue-text { font-family: var(--kawa-font-body); font-size: clamp(1.05rem, 1.8vh, 1.25rem); line-height: 1.75; letter-spacing: 0.01em; color: var(--kawa-text-color); word-break: break-word; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7); }
.kawa-continue-indicator { position: absolute; right: 24px; bottom: 16px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.5); color: var(--kawa-primary-accent); animation: kawa-indicator-pulse 1.4s infinite ease-in-out; box-shadow: 0 0 12px rgba(244, 63, 94, 0.35); }
@keyframes kawa-indicator-pulse { 0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 8px rgba(244, 63, 94, 0.3); } 50% { transform: translateY(4px) scale(1.08); box-shadow: 0 0 16px rgba(244, 63, 94, 0.6); } }
.kawa-choice-container { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 14px; width: 85%; max-width: 520px; pointer-events: auto; z-index: 20; animation: kawa-choice-appear 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes kawa-choice-appear { from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.kawa-choice-btn { position: relative; overflow: hidden; background: var(--kawa-choice-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: var(--kawa-choice-color); border: var(--kawa-choice-border); border-left: 4px solid var(--kawa-primary-accent); border-radius: var(--kawa-choice-radius); padding: var(--kawa-choice-padding); font-family: var(--kawa-font-heading); font-size: 1.08rem; font-weight: 600; letter-spacing: 0.02em; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); text-align: center; }
.kawa-choice-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent); transition: left 0.5s ease; }
.kawa-choice-btn:hover::before { left: 100%; }
.kawa-choice-btn:hover { background: var(--kawa-choice-hover-bg); border-color: rgba(255, 255, 255, 0.35); border-left-color: #ffffff; transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 30px rgba(244, 63, 94, 0.5), 0 0 20px rgba(244, 63, 94, 0.3); }
.kawa-choice-btn:active { transform: translateY(0) scale(0.99); }
.kawa-quick-menu { display: inline-flex; gap: 6px; justify-content: flex-end; margin-top: 12px; pointer-events: auto; align-items: center; background: rgba(10, 15, 29, 0.72); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 4px 8px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); align-self: flex-end; }
.kawa-btn { background: transparent; color: #cbd5e1; border: none; border-radius: 12px; padding: 6px 12px; font-family: var(--kawa-font-heading); font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; gap: 6px; line-height: 1; }
.kawa-btn:hover { background: rgba(244, 63, 94, 0.2); color: #ffffff; transform: translateY(-1px); }
.kawa-btn.active { background: var(--kawa-primary-accent); color: #ffffff; box-shadow: 0 0 12px rgba(244, 63, 94, 0.55); }
.kawa-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.kawa-mode-badge { position: absolute; top: 20px; right: 24px; z-index: 30; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); border: 1px solid var(--kawa-primary-accent); border-radius: 20px; padding: 6px 14px; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; color: var(--kawa-primary-accent); display: inline-flex; align-items: center; gap: 6px; }
.kawa-modal-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.84); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
@keyframes kawa-modal-pop { 0% { opacity: 0; transform: scale(0.94) translateY(12px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
.kawa-modal-card { background: linear-gradient(180deg, rgba(20, 28, 48, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 18px; width: 90%; max-width: 760px; max-height: 85%; display: flex; flex-direction: column; padding: 26px 32px; box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(244, 63, 94, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.18); animation: kawa-modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.kawa-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 14px; }
.kawa-modal-title { font-family: var(--kawa-font-heading); font-size: 1.4rem; font-weight: 800; letter-spacing: -0.01em; color: #ffffff; display: flex; align-items: center; gap: 10px; }
.kawa-modal-body { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
.kawa-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
.kawa-slot-card { position: relative; background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.55) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35); }
.kawa-slot-card:hover { border-color: rgba(244, 63, 94, 0.6); background: linear-gradient(135deg, rgba(20, 28, 48, 0.9) 0%, rgba(35, 48, 72, 0.75) 100%); transform: translateY(-3px); box-shadow: 0 10px 25px rgba(244, 63, 94, 0.25); }
.kawa-slot-badge { font-family: var(--kawa-font-heading); font-size: 0.82rem; font-weight: 800; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: #ffffff; padding: 3px 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(244, 63, 94, 0.4); }
.kawa-slot-time { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
.kawa-slot-preview { font-size: 0.85rem; color: #cbd5e1; line-height: 1.45; margin-bottom: 12px; word-break: break-word; max-height: 48px; overflow: hidden; }
.kawa-slot-btn { flex: 1; padding: 7px 10px; border-radius: 6px; border: none; font-family: var(--kawa-font-heading); font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.kawa-slot-btn-save { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; }
.kawa-slot-btn-load { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: #ffffff; }
.kawa-slot-btn-del { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
.kawa-ending-card { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(180deg, rgba(20, 28, 48, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(244, 63, 94, 0.45); border-radius: 20px; padding: 36px 54px; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(244, 63, 94, 0.25); z-index: 50; animation: kawa-modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.kawa-ending-title { font-family: var(--kawa-font-heading); font-size: 2.3rem; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(135deg, #ffffff 0%, #fda4af 50%, var(--kawa-primary-accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px; filter: drop-shadow(0 4px 14px rgba(244, 63, 94, 0.4)); }
.kawa-ending-subtitle { font-size: 1.05rem; color: #cbd5e1; margin-bottom: 20px; font-weight: 500; }
.kawa-setting-row { display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); }
.kawa-setting-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; font-weight: 600; color: #e2e8f0; }
.kawa-setting-value { font-size: 0.85rem; color: var(--kawa-primary-accent); font-weight: 700; }
.kawa-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 4px; background: #334155; outline: none; cursor: pointer; }
.kawa-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--kawa-primary-accent); border: 2px solid #ffffff; cursor: pointer; box-shadow: 0 0 10px rgba(244, 63, 94, 0.7); transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1); }
.kawa-slider::-webkit-slider-thumb:hover { transform: scale(1.25); box-shadow: 0 0 16px rgba(244, 63, 94, 0.9); }
.kawa-bold { font-weight: 700; }
.kawa-italic { font-style: italic; }
.kawa-main-menu { position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: var(--kawa-main-menu-bg); background-size: cover; background-position: center; animation: kawa-fade-in 0.4s ease-out; user-select: none; }
.kawa-main-menu-backdrop { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.45) 0%, rgba(2, 6, 23, 0.88) 100%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1; overflow: hidden; }
.kawa-main-menu-backdrop::after { content: ''; position: absolute; inset: -60%; background-image: radial-gradient(2px 2px at 20% 30%, rgba(253, 164, 175, 0.6), transparent), radial-gradient(3px 3px at 40% 70%, rgba(244, 63, 94, 0.5), transparent), radial-gradient(2px 2px at 60% 20%, rgba(255, 255, 255, 0.7), transparent), radial-gradient(3px 3px at 80% 60%, rgba(251, 113, 133, 0.5), transparent), radial-gradient(2px 2px at 90% 90%, rgba(244, 63, 94, 0.6), transparent); background-size: 550px 550px; animation: kawa-ambient-drift 28s linear infinite; opacity: 0.7; pointer-events: none; }
@keyframes kawa-ambient-drift { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(550px) rotate(15deg); } }
.kawa-main-menu-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 90%; max-width: 600px; max-height: 96%; height: auto; text-align: center; padding: 12px 16px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(244, 63, 94, 0.4) transparent; }
.kawa-main-menu-content::-webkit-scrollbar { width: 4px; }
.kawa-main-menu-content::-webkit-scrollbar-thumb { background: rgba(244, 63, 94, 0.4); border-radius: 4px; }
.kawa-main-menu-header { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.kawa-main-menu-logo { max-height: clamp(36px, 7vh, 60px); width: auto; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(244, 63, 94, 0.5)); }
.kawa-main-menu-title { margin: 0; font-family: var(--kawa-font-heading); font-size: clamp(2rem, 5vh, 2.8rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.15; background: linear-gradient(135deg, #ffffff 0%, #fecdd3 35%, var(--kawa-primary-accent) 75%, #fda4af 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 14px rgba(244, 63, 94, 0.4)); }
.kawa-main-menu-subtitle { font-size: clamp(0.8rem, 1.6vh, 0.95rem); font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; }
.kawa-main-menu-nav { display: flex; flex-direction: column; gap: clamp(6px, 1.2vh, 10px); width: 100%; max-width: 310px; margin: clamp(10px, 1.8vh, 18px) 0; }
.kawa-main-menu-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: var(--kawa-main-menu-btn-bg); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: var(--kawa-main-menu-btn-color); font-family: var(--kawa-font-heading); font-size: clamp(0.92rem, 1.7vh, 1.08rem); font-weight: 700; letter-spacing: 0.02em; padding: var(--kawa-main-menu-btn-padding); border-radius: var(--kawa-main-menu-btn-radius); border: 1px solid rgba(255, 255, 255, 0.12); cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
.kawa-main-menu-btn:hover:not(.disabled) { background: var(--kawa-main-menu-btn-hover-bg); transform: translateY(-2px) scale(1.03); border-color: rgba(255, 255, 255, 0.35); box-shadow: 0 10px 28px rgba(244, 63, 94, 0.55), 0 0 20px rgba(244, 63, 94, 0.3); }
.kawa-main-menu-btn.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.kawa-main-menu-footer { font-size: clamp(0.75rem, 1.4vh, 0.85rem); color: #64748b; font-weight: 500; }
.kawa-about-card { max-width: 480px; }
.kawa-about-content { display: flex; flex-direction: column; align-items: center; text-align: center; }
.kawa-about-logo-badge { font-size: 2.8rem; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(244, 63, 94, 0.5)); }
.kawa-about-game-title { font-family: var(--kawa-font-heading); font-size: 1.7rem; font-weight: 800; margin: 0 0 4px 0; color: #ffffff; }
.kawa-about-game-sub { font-size: 0.95rem; color: #94a3b8; margin: 0 0 16px 0; }
.kawa-about-divider { width: 60px; height: 2px; background: var(--kawa-primary-accent); border-radius: 2px; margin-bottom: 16px; box-shadow: 0 0 10px rgba(244, 63, 94, 0.6); }
.kawa-about-info { font-size: 0.95rem; color: #cbd5e1; line-height: 1.6; margin: 0 0 16px 0; }
.kawa-about-footer-text { font-size: 0.85rem; color: #64748b; font-weight: 500; }
`;
}

export function getInlineRuntimeScript(assetPrefix = '/'): string {
  const prefix = assetPrefix.endsWith('/') ? assetPrefix : assetPrefix + '/';
  return `
    const ASSET_PREFIX = '${prefix}';
    const SVG_ICONS = {
      home: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      power: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
      back: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
      history: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>',
      save: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
      load: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      auto: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      skip: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
      settings: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      volumeOn: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
      volumeMute: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
      trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      arrowDown: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      replay: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
    };

    function formatRichText(raw) {
      return (raw || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\\{b\\}(.*?)\\{\\/b\\}/gi, '<strong class="kawa-bold">$1</strong>')
        .replace(/\\{i\\}(.*?)\\{\\/i\\}/gi, '<em class="kawa-italic">$1</em>')
        .replace(/\\{color=([#a-zA-Z0-9_().,\\s-]+)\\}(.*?)\\{\\/color\\}/gi, function(_, colorVal, inner) {
          return '<span style="color:' + colorVal.replace(/[^#a-zA-Z0-9_().,\\s-]/g, '').trim() + '">' + inner + '</span>';
        })
        .replace(/\\{size=([0-9.]+(?:px|em|rem|%|vw|vh)?)\\}(.*?)\\{\\/size\\}/gi, function(_, sizeVal, inner) {
          return '<span style="font-size:' + sizeVal.replace(/[^0-9.a-z%]/gi, '').trim() + '">' + inner + '</span>';
        });
    }

    class MemoryStorageAdapter {
      constructor() { this.store = new Map(); }
      getItem(k) { return this.store.get(k) || null; }
      setItem(k, v) { this.store.set(k, v); }
      removeItem(k) { this.store.delete(k); }
    }
    class LocalStorageAdapter {
      getItem(k) { return localStorage.getItem(k); }
      setItem(k, v) { localStorage.setItem(k, v); }
      removeItem(k) { localStorage.removeItem(k); }
    }
    class SaveManager {
      constructor() { this.storage = typeof localStorage !== 'undefined' ? new LocalStorageAdapter() : new MemoryStorageAdapter(); }
      async saveSlot(id, snapshot, previewText) {
        const slot = { id, name: 'Slot ' + id, timestamp: Date.now(), snapshot, previewText };
        this.storage.setItem('kawaijs_save_' + id, JSON.stringify(slot));
        return slot;
      }
      async loadSlot(id) {
        const raw = this.storage.getItem('kawaijs_save_' + id);
        return raw ? JSON.parse(raw) : null;
      }
      async deleteSlot(id) {
        this.storage.removeItem('kawaijs_save_' + id);
      }
      async listSlots(total = 6) {
        const slots = [];
        for (let i = 1; i <= total; i++) {
          slots.push(await this.loadSlot(String(i)));
        }
        return slots;
      }
    }
    function findOpOutsideQuotes(str, ops) {
      let inQuote = null;
      for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (inQuote) {
          if (ch === inQuote && str[i - 1] !== '\\\\') inQuote = null;
          continue;
        }
        if (ch === '"' || ch === "'") { inQuote = ch; continue; }
        for (const op of ops) {
          if (str.startsWith(op, i)) {
            if (op === 'and' || op === 'or') {
              const before = i === 0 ? ' ' : str[i - 1];
              const after = i + op.length >= str.length ? ' ' : str[i + op.length];
              if (/\\s/.test(before) && /\\s/.test(after)) return { op, index: i };
            } else {
              return { op, index: i };
            }
          }
        }
      }
      return null;
    }
    function isTruthy(val) {
      if (val === false || val === 'false' || val === 0 || val === '0' || val === undefined || val === null || val === '') return false;
      return Boolean(val);
    }
    function evaluateCondition(cond, vars) {
      const t = (cond || '').trim();
      if (!t || t === 'true') return true;
      if (t === 'false') return false;

      const orMatch = findOpOutsideQuotes(t, ['||', 'or']);
      if (orMatch) {
        return evaluateCondition(t.slice(0, orMatch.index), vars) || evaluateCondition(t.slice(orMatch.index + orMatch.op.length), vars);
      }
      const andMatch = findOpOutsideQuotes(t, ['&&', 'and']);
      if (andMatch) {
        return evaluateCondition(t.slice(0, andMatch.index), vars) && evaluateCondition(t.slice(andMatch.index + andMatch.op.length), vars);
      }

      const toNum = (v) => {
        if (typeof v === 'number') return v;
        if (v === true) return 1;
        if (v === false || v === undefined || v === null || v === '') return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      };
      const ops = ['>=', '<=', '!=', '==', '>', '<'];
      const cmpMatch = findOpOutsideQuotes(t, ops);
      if (cmpMatch) {
        const op = cmpMatch.op;
        const l = resolveVal(t.slice(0, cmpMatch.index), vars);
        const r = resolveVal(t.slice(cmpMatch.index + op.length), vars);
        const isLNum = typeof l === 'number' || (!isNaN(Number(l)) && typeof l === 'string' && l.trim() !== '');
        const isRNum = typeof r === 'number' || (!isNaN(Number(r)) && typeof r === 'string' && r.trim() !== '');

        if (op === '==') return l === r || String(l) === String(r);
        if (op === '!=') return l !== r && String(l) !== String(r);
        if (op === '>=') return (isLNum && isRNum) ? toNum(l) >= toNum(r) : String(l || '') >= String(r || '');
        if (op === '<=') return (isLNum && isRNum) ? toNum(l) <= toNum(r) : String(l || '') <= String(r || '');
        if (op === '>') return (isLNum && isRNum) ? toNum(l) > toNum(r) : String(l || '') > String(r || '');
        if (op === '<') return (isLNum && isRNum) ? toNum(l) < toNum(r) : String(l || '') < String(r || '');
      }
      if (t.startsWith('!')) {
        return !evaluateCondition(t.slice(1).trim(), vars);
      }
      const val = t in vars ? vars[t] : resolveVal(t, vars);
      return isTruthy(val);
    }
    function resolveVal(token, vars, isVariable) {
      const t = token.trim();
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (!isNaN(Number(t)) && t !== '') return Number(t);
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
      if (isVariable === false) return t;
      if (t in vars) return vars[t];
      if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(t)) return undefined;
      return t;
    }
    function applySetOp(curr, op, val, vars, isVariable) {
      const res = (isVariable !== false && typeof val === 'string' && val in vars) ? vars[val] : val;
      if (op === '+=') {
        if (typeof curr === 'string' || typeof res === 'string') return String(curr || '') + String(res || '');
        return Number(curr || 0) + Number(res);
      }
      if (op === '-=') return Number(curr || 0) - Number(res);
      return res;
    }
    class StoryVM {
      constructor(story) {
        this.story = story;
        const startLabel = story.meta.startLabel || 'start';
        this.state = {
          currentLabel: startLabel,
          instructionPointer: 0,
          callStack: [],
          variables: {},
          visual: { background: null, transition: null, characters: {} },
          audio: { music: null, voice: null },
          dialogue: null,
          choices: null,
          isWaitingForInput: false,
          isFinished: false
        };
        this.snapshotStack = [];
        this.listeners = new Set();
        this.audioListeners = new Set();
        this.history = [];
        this.saveManager = new SaveManager();
        this.isExecuting = false;
      }
      getState() { return this.state; }
      getStory() { return this.story; }
      onStateChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
      onAudioEvent(cb) { this.audioListeners.add(cb); return () => this.audioListeners.delete(cb); }
      start() {
        const startLabel = (this.story && this.story.meta && this.story.meta.startLabel) || 'start';
        this.state = {
          currentLabel: startLabel,
          instructionPointer: 0,
          callStack: [],
          variables: {},
          visual: { background: null, transition: null, characters: {} },
          audio: { music: null, voice: null },
          dialogue: null,
          choices: null,
          isWaitingForInput: false,
          isFinished: false
        };
        this.snapshotStack = [];
        this.history = [];
        this.execute();
      }
      jump(target) {
        this.state.currentLabel = target;
        this.state.instructionPointer = 0;
        this.state.choices = null;
        this.state.isWaitingForInput = false;
        this.state.isFinished = false;
        this.execute();
      }
      next() {
        if (this.state.isFinished || this.isExecuting || (this.state.choices && this.state.choices.length > 0)) return;
        this.state.isWaitingForInput = false;
        this.execute();
      }
      choose(idx) {
        if (this.isExecuting || !this.state.choices || !this.state.choices[idx]) return;
        const choice = this.state.choices[idx];
        this.state.choices = null;
        this.state.isWaitingForInput = false;
        this.state.currentLabel = choice.targetLabel;
        this.state.instructionPointer = 0;
        this.execute();
      }
      rollback() {
        if (this.snapshotStack.length <= 1) return false;
        this.snapshotStack.pop();
        const prev = this.snapshotStack[this.snapshotStack.length - 1];
        if (prev) {
          this.state = JSON.parse(JSON.stringify(prev));
          this.notify();
          return true;
        }
        return false;
      }
      canRollback() { return this.snapshotStack.length > 1; }
      async save(slot) {
        await this.saveManager.saveSlot(slot, JSON.parse(JSON.stringify(this.state)), this.state.dialogue ? this.state.dialogue.text : '');
      }
      async load(slot) {
        const data = await this.saveManager.loadSlot(slot);
        if (data && data.snapshot) {
          this.state = JSON.parse(JSON.stringify(data.snapshot.state || data.snapshot));
          this.snapshotStack = [JSON.parse(JSON.stringify(this.state))];
          this.notify();
          return true;
        }
        return false;
      }
      execute() {
        if (this.isExecuting) return;
        this.isExecuting = true;
        try {
          while (!this.state.isWaitingForInput && !this.state.isFinished) {
            const currentInstructions = this.story.labels[this.state.currentLabel];
            if (!currentInstructions || this.state.instructionPointer >= currentInstructions.length) {
              if (this.state.callStack.length > 0) {
                const ret = this.state.callStack.pop();
                this.state.currentLabel = ret.returnLabel || ret.label;
                this.state.instructionPointer = ret.returnPointer || ret.pointer;
                continue;
              }
              this.state.isFinished = true;
              this.state.dialogue = null;
              this.state.choices = null;
              this.notify();
              break;
            }
            const inst = currentInstructions[this.state.instructionPointer];
            this.state.instructionPointer++;
            this.executeInstruction(inst);
          }
        } finally {
          this.isExecuting = false;
        }
      }
      executeInstruction(inst) {
        switch (inst.type) {
          case 'dialogue':
          case 'say': {
            let spkName = null;
            let spkColor = null;
            if (inst.speaker) {
              const decl = this.story.characters ? this.story.characters[inst.speaker] : null;
              spkName = decl ? (decl.name || decl.displayName || inst.speaker) : inst.speaker;
              spkColor = decl ? decl.color : null;
            }
            this.state.dialogue = { speaker: inst.speaker || null, speakerDisplayName: spkName, speakerColor: spkColor, text: inst.text };
            this.state.choices = null;
            this.state.isWaitingForInput = true;
            this.history.push({ speakerDisplayName: spkName, text: inst.text });
            this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
            this.notify();
            break;
          }
          case 'scene': {
            this.state.visual.background = inst.background;
            this.state.visual.transition = inst.transition || null;
            this.state.visual.characters = {};
            this.notify();
            break;
          }
          case 'show': {
            const charDef = this.state.visual.characters[inst.character] || {};
            this.state.visual.characters[inst.character] = {
              expression: inst.expression || charDef.expression,
              position: inst.position || charDef.position || 'center'
            };
            this.notify();
            break;
          }
          case 'hide': {
            delete this.state.visual.characters[inst.character];
            this.notify();
            break;
          }
          case 'play_audio':
          case 'play': {
            if (inst.channel === 'music') this.state.audio.music = inst.track;
            else if (inst.channel === 'voice') this.state.audio.voice = inst.track;
            this.notifyAudio({ action: 'play', channel: inst.channel, track: inst.track, fade: inst.fade, loop: inst.loop !== false });
            break;
          }
          case 'stop_audio':
          case 'stop': {
            if (inst.channel === 'music') this.state.audio.music = null;
            else if (inst.channel === 'voice') this.state.audio.voice = null;
            this.notifyAudio({ action: 'stop', channel: inst.channel, fade: inst.fade });
            break;
          }
          case 'choice':
          case 'menu': {
            const avail = [];
            const list = inst.choices || [];
            for (const item of list) {
              if (item.condition) {
                if (evaluateCondition(item.condition, this.state.variables)) avail.push(item);
              } else {
                avail.push(item);
              }
            }
            this.state.choices = avail;
            this.state.dialogue = null;
            this.state.isWaitingForInput = true;
            this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
            this.notify();
            break;
          }
          case 'jump': {
            this.state.currentLabel = inst.targetLabel;
            this.state.instructionPointer = 0;
            break;
          }
          case 'branch': {
            const pass = evaluateCondition(inst.condition, this.state.variables);
            const target = pass ? inst.thenLabel : (inst.elseLabel || inst.thenLabel);
            this.state.currentLabel = target;
            this.state.instructionPointer = 0;
            break;
          }
          case 'if': {
            const pass = evaluateCondition(inst.condition, this.state.variables);
            if (pass) {
              this.state.currentLabel = inst.thenLabel;
              this.state.instructionPointer = 0;
            } else if (inst.elseLabel) {
              this.state.currentLabel = inst.elseLabel;
              this.state.instructionPointer = 0;
            }
            break;
          }
          case 'set': {
            const cur = this.state.variables[inst.variable];
            this.state.variables[inst.variable] = applySetOp(cur, inst.operator || '=', inst.value, this.state.variables, inst.isVariable);
            break;
          }
          case 'call': {
            this.state.callStack.push({ returnLabel: this.state.currentLabel, returnPointer: this.state.instructionPointer });
            this.state.currentLabel = inst.targetLabel;
            this.state.instructionPointer = 0;
            break;
          }
          case 'return': {
            if (this.state.callStack.length > 0) {
              const ret = this.state.callStack.pop();
              this.state.currentLabel = ret.returnLabel || ret.label;
              this.state.instructionPointer = ret.returnPointer || ret.pointer;
            } else {
              this.state.isFinished = true;
              this.state.dialogue = null;
              this.state.choices = null;
              this.state.isWaitingForInput = false;
              this.notify();
            }
            break;
          }
        }
      }
      notify() { for (const l of this.listeners) l(this.state); }
      notifyAudio(e) { for (const l of this.audioListeners) l(e); }
    }
    class AudioManager {
      constructor() {
        this.masterVolume = 1.0;
        this.musicVolume = 0.8;
        this.soundVolume = 1.0;
        this.voiceVolume = 1.0;
        this.isMuted = false;
        this.currentMusicAudio = null;
        this.currentVoiceAudio = null;
        this.soundPool = [];
      }
      setMasterVolume(v) { this.masterVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      setMusicVolume(v) { this.musicVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      setSoundVolume(v) { this.soundVolume = Math.max(0, Math.min(1, v)); }
      setVoiceVolume(v) { this.voiceVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      toggleMute() { this.isMuted = !this.isMuted; this.updateVolumes(); return this.isMuted; }
      updateVolumes() {
        if (this.currentMusicAudio) {
          this.currentMusicAudio.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
        }
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.volume = this.isMuted ? 0 : this.masterVolume * this.voiceVolume;
        }
      }
      playMusic(src, options = {}) {
        if (this.currentMusicAudio) {
          this.currentMusicAudio.pause();
          this.currentMusicAudio.src = '';
        }
        const audio = new Audio(src);
        audio.loop = options.loop !== false;
        const targetVolume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
        this.currentMusicAudio = audio;
        if (options.fadein && options.fadein > 0) {
          audio.volume = 0;
          audio.play().catch(() => {});
          this.fadeVolume(audio, 0, targetVolume, options.fadein * 1000);
        } else {
          audio.volume = targetVolume;
          audio.play().catch(() => {});
        }
      }
      stopMusic(options = {}) {
        const audio = this.currentMusicAudio;
        if (!audio) return;
        this.currentMusicAudio = null;
        if (options.fadeout && options.fadeout > 0) {
          this.fadeVolume(audio, audio.volume, 0, options.fadeout * 1000, () => {
            audio.pause();
            audio.src = '';
          });
        } else {
          audio.pause();
          audio.src = '';
        }
      }
      playSound(src, volume = 1) {
        if (this.isMuted) return;
        const audio = new Audio(src);
        audio.volume = volume * this.masterVolume * this.soundVolume;
        audio.play().catch(() => {});
        this.soundPool.push(audio);
        audio.addEventListener('ended', () => {
          const idx = this.soundPool.indexOf(audio);
          if (idx !== -1) this.soundPool.splice(idx, 1);
        });
      }
      playVoice(src, volume = 1) {
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.pause();
          this.currentVoiceAudio.src = '';
        }
        if (this.isMuted) return;
        const audio = new Audio(src);
        audio.volume = volume * this.masterVolume * this.voiceVolume;
        audio.play().catch(() => {});
        this.currentVoiceAudio = audio;
      }
      stopVoice() {
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.pause();
          this.currentVoiceAudio.src = '';
          this.currentVoiceAudio = null;
        }
      }
      fadeVolume(audio, from, to, durationMs, onComplete) {
        const steps = 20;
        const stepTime = durationMs / steps;
        const volumeStep = (to - from) / steps;
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          if (this.isMuted) {
            audio.volume = 0;
          } else {
            audio.volume = Math.max(0, Math.min(1, from + volumeStep * currentStep));
          }
          if (currentStep >= steps) {
            clearInterval(interval);
            if (!this.isMuted) audio.volume = to;
            if (onComplete) onComplete();
          }
        }, stepTime);
      }
      attachToVM(vm, assetResolver) {
        return vm.onAudioEvent((event) => {
          if (event.action === 'play' && event.track) {
            const url = assetResolver(event.track, event.channel);
            if (event.channel === 'music') {
              this.playMusic(url, { fadein: event.fade, loop: event.loop });
            } else if (event.channel === 'sound') {
              this.playSound(url);
            } else if (event.channel === 'voice') {
              this.playVoice(url);
            }
          } else if (event.action === 'stop') {
            if (event.channel === 'music') {
              this.stopMusic({ fadeout: event.fade });
            } else if (event.channel === 'voice') {
              this.stopVoice();
            }
          }
        });
      }
    }
    class DOMRenderer {
      constructor(vm, container, audioManager) {
        this.vm = vm;
        this.container = container;
        this.audioManager = audioManager;
        this.isChoicePending = false;
        this.activeBgLayer = 'A';
        this.currentBgUrl = '';
        this.activeChars = new Map();
        this.typewriterSpeed = 20;
        this.autoDelayMs = 1800;
        this.isAutoMode = false;
        this.isSkipMode = false;
        this.autoTimer = null;
        this.skipInterval = null;
        this.typewriterInterval = null;
        this.isTypewriting = false;
        this.fullText = '';
        this.isMainMenuVisible = true;

        if (typeof localStorage !== 'undefined') {
          try {
            const s = JSON.parse(localStorage.getItem('kawaijs_settings') || '{}');
            if (typeof s.typewriterSpeed === 'number') this.typewriterSpeed = s.typewriterSpeed;
            if (typeof s.autoDelayMs === 'number') this.autoDelayMs = s.autoDelayMs;
          } catch {}
        }

        this.build();
        vm.onStateChange(s => this.render(s));
        this.showMainMenu();
      }

      build() {
        const metaTitle = (this.vm && this.vm.story && this.vm.story.meta && this.vm.story.meta.title) || 'Kawaijs Visual Novel';
        const metaAuthor = (this.vm && this.vm.story && this.vm.story.meta && this.vm.story.meta.author) ? 'By ' + this.vm.story.meta.author : 'A web-native visual novel';

        this.container.innerHTML = \`
          <div class="kawa-root">
            <div class="kawa-stage">
              <div class="kawa-background">
                <div class="kawa-bg-layer kawa-bg-a active"></div>
                <div class="kawa-bg-layer kawa-bg-b"></div>
              </div>
              <div class="kawa-characters kawa-sprites"></div>
              <div class="kawa-mode-badge" style="display:none"></div>
              <div class="kawa-ui-layer">
                <div class="kawa-choice-container kawa-choices" style="display:none"></div>
                <div class="kawa-dialogue-box kawa-dialogue">
                  <div class="kawa-speaker-tag kawa-speaker" style="display:none"></div>
                  <div class="kawa-dialogue-text kawa-text"></div>
                  <div class="kawa-continue-indicator">\${SVG_ICONS.arrowDown}</div>
                </div>
                <nav class="kawa-quick-menu">
                  <button class="kawa-btn kawa-title">\${SVG_ICONS.home} <span>Title</span></button>
                  <button class="kawa-btn kawa-back">\${SVG_ICONS.back} <span>Back</span></button>
                  <button class="kawa-btn kawa-hist">\${SVG_ICONS.history} <span>History</span></button>
                  <button class="kawa-btn kawa-auto">\${SVG_ICONS.auto} <span>Auto</span></button>
                  <button class="kawa-btn kawa-skip">\${SVG_ICONS.skip} <span>Skip</span></button>
                  <button class="kawa-btn kawa-save">\${SVG_ICONS.save} <span>Save</span></button>
                  <button class="kawa-btn kawa-load">\${SVG_ICONS.load} <span>Load</span></button>
                  <button class="kawa-btn kawa-settings">\${SVG_ICONS.settings} <span>Settings</span></button>
                </nav>
              </div>
              <div class="kawa-main-menu" role="region" aria-label="Main Menu" style="display:flex">
                <div class="kawa-main-menu-backdrop"></div>
                <div class="kawa-main-menu-content">
                  <div class="kawa-main-menu-header">
                    <div class="kawa-about-logo-badge">🌸</div>
                    <h1 class="kawa-main-menu-title">\${metaTitle}</h1>
                    <div class="kawa-main-menu-subtitle">\${metaAuthor}</div>
                  </div>
                  <nav class="kawa-main-menu-nav" role="navigation">
                    <button class="kawa-main-menu-btn kawa-start-btn" data-action="start">\${SVG_ICONS.play} <span>Start Game</span></button>
                    <button class="kawa-main-menu-btn kawa-continue-btn" data-action="continue">\${SVG_ICONS.auto} <span>Continue</span></button>
                    <button class="kawa-main-menu-btn kawa-load-btn" data-action="load">\${SVG_ICONS.load} <span>Load Game</span></button>
                    <button class="kawa-main-menu-btn kawa-settings-btn" data-action="settings">\${SVG_ICONS.settings} <span>Preferences</span></button>
                    <button class="kawa-main-menu-btn kawa-about-btn" data-action="about">\${SVG_ICONS.info} <span>About</span></button>
                    <button class="kawa-main-menu-btn kawa-quit-btn" data-action="quit">\${SVG_ICONS.power} <span>Quit</span></button>
                  </nav>
                  <footer class="kawa-main-menu-footer">🌸 Powered by Kawaijs Engine</footer>
                </div>
              </div>
            </div>
          </div>\`;

        this.rootEl = this.container.querySelector('.kawa-root');
        this.stageEl = this.container.querySelector('.kawa-stage');
        this.bgLayerA = this.container.querySelector('.kawa-bg-a');
        this.bgLayerB = this.container.querySelector('.kawa-bg-b');
        this.charsEl = this.container.querySelector('.kawa-characters');
        this.modeBadgeEl = this.container.querySelector('.kawa-mode-badge');
        this.boxEl = this.container.querySelector('.kawa-dialogue-box');
        this.spkEl = this.container.querySelector('.kawa-speaker-tag');
        this.txtEl = this.container.querySelector('.kawa-dialogue-text');
        this.choiceEl = this.container.querySelector('.kawa-choice-container');
        this.titleBtn = this.container.querySelector('.kawa-title');
        this.backBtn = this.container.querySelector('.kawa-back');
        this.histBtn = this.container.querySelector('.kawa-hist');
        this.autoBtn = this.container.querySelector('.kawa-auto');
        this.skipBtn = this.container.querySelector('.kawa-skip');
        this.saveBtn = this.container.querySelector('.kawa-save');
        this.loadBtn = this.container.querySelector('.kawa-load');
        this.settingsBtn = this.container.querySelector('.kawa-settings');

        this.mainMenuEl = this.container.querySelector('.kawa-main-menu');
        this.startBtn = this.container.querySelector('.kawa-start-btn');
        this.continueBtn = this.container.querySelector('.kawa-continue-btn');
        this.mainLoadBtn = this.container.querySelector('.kawa-load-btn');
        this.mainSettingsBtn = this.container.querySelector('.kawa-settings-btn');
        this.aboutBtn = this.container.querySelector('.kawa-about-btn');
        this.quitBtn = this.container.querySelector('.kawa-quit-btn');

        this.boxEl.addEventListener('click', () => {
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.advance();
        });
        this.titleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showMainMenu();
        });
        this.backBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.vm.rollback();
        });
        this.histBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showHistory(); });
        this.autoBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleAuto(); });
        this.skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSkip(); });
        this.saveBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('save'); });
        this.loadBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('load'); });
        this.settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSettings(); });

        this.startBtn.addEventListener('click', (e) => { e.stopPropagation(); this.startNewGame(); });
        this.continueBtn.addEventListener('click', (e) => { e.stopPropagation(); this.continueLatestGame(); });
        this.mainLoadBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('load'); });
        this.mainSettingsBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSettings(); });
        this.aboutBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showAbout(); });
        this.quitBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showQuitConfirm(); });

        window.addEventListener('keydown', (e) => {
          const modal = this.rootEl.querySelector('.kawa-modal-overlay');
          if (modal) {
            if (e.key === 'Escape') modal.remove();
            return;
          }
          if (this.isMainMenuVisible) return;

          if (e.code === 'Space' || e.code === 'Enter') {
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
            e.preventDefault();
            if (this.isAutoMode) this.toggleAuto(false);
            if (this.isSkipMode) this.toggleSkip(false);
            this.advance();
          } else if (e.code === 'Backspace') {
            e.preventDefault();
            if (this.isAutoMode) this.toggleAuto(false);
            if (this.isSkipMode) this.toggleSkip(false);
            this.vm.rollback();
          } else if (e.key === 'a' || e.key === 'A') {
            this.toggleAuto();
          } else if (e.key === 'Tab' || e.key === 'Control') {
            e.preventDefault();
            this.toggleSkip();
          } else if (e.key === 's' || e.key === 'S') {
            this.showSaveLoad('save');
          } else if (e.key === 'l' || e.key === 'L') {
            this.showSaveLoad('load');
          } else if (e.key === 'h' || e.key === 'H') {
            this.showHistory();
          } else if (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O') {
            this.showSettings();
          } else if (e.key === 'Escape') {
            this.showMainMenu();
          }
        });
      }

      showMainMenu() {
        this.isMainMenuVisible = true;
        if (this.isAutoMode) this.toggleAuto(false);
        if (this.isSkipMode) this.toggleSkip(false);
        this.refreshContinueBtn();
        if (this.mainMenuEl) {
          this.mainMenuEl.style.display = 'flex';
          this.mainMenuEl.classList.add('active');
        }
      }

      hideMainMenu() {
        this.isMainMenuVisible = false;
        if (this.mainMenuEl) {
          this.mainMenuEl.classList.remove('active');
          this.mainMenuEl.style.display = 'none';
        }
      }

      startNewGame() {
        this.vm.start();
        this.hideMainMenu();
      }

      async continueLatestGame() {
        const slots = await this.vm.saveManager.listSlots(6);
        const valid = slots.filter(s => s !== null);
        if (valid.length === 0) return;
        valid.sort((a, b) => b.timestamp - a.timestamp);
        const latest = valid[0];
        if (await this.vm.load(latest.id)) {
          this.hideMainMenu();
        }
      }

      async refreshContinueBtn() {
        if (!this.continueBtn) return;
        const slots = await this.vm.saveManager.listSlots(6);
        const has = slots.some(s => s !== null);
        if (!has) {
          this.continueBtn.classList.add('disabled');
          this.continueBtn.setAttribute('aria-disabled', 'true');
        } else {
          this.continueBtn.classList.remove('disabled');
          this.continueBtn.removeAttribute('aria-disabled');
        }
      }

      showAbout() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const metaTitle = (this.vm && this.vm.story && this.vm.story.meta && this.vm.story.meta.title) || 'Kawaijs Visual Novel';
        const metaAuthor = (this.vm && this.vm.story && this.vm.story.meta && this.vm.story.meta.author) ? 'By ' + this.vm.story.meta.author : 'A web-native visual novel';

        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card kawa-about-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${SVG_ICONS.info} <span>About</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body kawa-about-body">
            <div class="kawa-about-content">
              <div class="kawa-about-logo-badge">🌸</div>
              <h2 class="kawa-about-game-title">\${metaTitle}</h2>
              <p class="kawa-about-game-sub">\${metaAuthor}</p>
              <div class="kawa-about-divider"></div>
              <p class="kawa-about-info">Built with <strong>Kawaijs</strong> — a web-native visual novel engine and toolchain inspired by Ren'Py.</p>
              <div class="kawa-about-footer-text">🌸 Powered by Kawaijs Engine</div>
            </div>
          </div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      showQuitConfirm() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.style.maxWidth = '420px';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title"><span>Quit Visual Novel</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body" style="padding:20px 8px;text-align:center">
            <p style="font-size:1.05rem;color:#e2e8f0;margin-bottom:24px">Are you sure you want to quit?</p>
            <div style="display:flex;gap:12px;justify-content:center">
              <button class="kawa-btn kawa-cancel-quit" style="padding:8px 20px">Cancel</button>
              <button class="kawa-btn active kawa-confirm-quit" style="padding:8px 20px">Quit</button>
            </div>
          </div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        card.querySelector('.kawa-cancel-quit').addEventListener('click', () => ov.remove());
        card.querySelector('.kawa-confirm-quit').addEventListener('click', () => {
          if (typeof window !== 'undefined') window.close();
        });
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      toggleAuto(force) {
        this.isAutoMode = force !== undefined ? force : !this.isAutoMode;
        if (this.isAutoMode && this.isSkipMode) this.toggleSkip(false);
        this.updateModeUI();
        if (this.isAutoMode && !this.isTypewriting) this.scheduleAuto();
        else if (!this.isAutoMode && this.autoTimer) {
          clearTimeout(this.autoTimer);
          this.autoTimer = null;
        }
      }

      toggleSkip(force) {
        this.isSkipMode = force !== undefined ? force : !this.isSkipMode;
        if (this.isSkipMode && this.isAutoMode) this.toggleAuto(false);
        this.updateModeUI();
        if (this.isSkipMode) {
          if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
          if (!this.skipInterval) {
            this.skipInterval = setInterval(() => {
              const s = this.vm.getState();
              if (s.isFinished || (s.choices && s.choices.length > 0)) {
                this.toggleSkip(false);
                return;
              }
              if (this.isTypewriting) this.finishTypewriter();
              this.vm.next();
            }, 55);
          }
        } else {
          if (this.skipInterval) { clearInterval(this.skipInterval); this.skipInterval = null; }
        }
      }

      updateModeUI() {
        if (this.autoBtn) this.autoBtn.classList.toggle('active', this.isAutoMode);
        if (this.skipBtn) this.skipBtn.classList.toggle('active', this.isSkipMode);
        if (this.modeBadgeEl) {
          if (this.isSkipMode) {
            this.modeBadgeEl.innerHTML = SVG_ICONS.skip + ' SKIP';
            this.modeBadgeEl.style.display = 'inline-flex';
          } else if (this.isAutoMode) {
            this.modeBadgeEl.innerHTML = SVG_ICONS.auto + ' AUTO';
            this.modeBadgeEl.style.display = 'inline-flex';
          } else {
            this.modeBadgeEl.style.display = 'none';
          }
        }
      }

      scheduleAuto() {
        if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
        if (!this.isAutoMode) return;
        const s = this.vm.getState();
        if (s.isFinished || (s.choices && s.choices.length > 0)) return;
        const dur = Math.max(800, this.autoDelayMs + (s.dialogue ? s.dialogue.text.length * 15 : 0));
        this.autoTimer = setTimeout(() => {
          if (this.isAutoMode) {
            const cur = this.vm.getState();
            if (!cur.isFinished && (!cur.choices || cur.choices.length === 0)) this.vm.next();
          }
        }, dur);
      }

      advance() {
        if (this.isTypewriting) this.finishTypewriter();
        else this.vm.next();
      }

      render(state) {
        this.isChoicePending = false;
        this.backBtn.disabled = !this.vm.canRollback();

        // 1. Dual Background Crossfade
        if (state.visual.background) {
          const rawBg = state.visual.background;
          const bg = rawBg.replace(/^bg[\s_]+/i, '').trim();
          const baseName = bg.replace(/\\.(svg|png|jpg|jpeg|webp)$/i, '');
          const svgUrl = ASSET_PREFIX + 'assets/backgrounds/' + (bg.includes('.') ? bg : bg + '.svg');
          const pngUrl = ASSET_PREFIX + 'assets/backgrounds/' + baseName + '.png';

          if (svgUrl !== this.currentBgUrl) {
            this.currentBgUrl = svgUrl;
            const inLayer = this.activeBgLayer === 'A' ? this.bgLayerB : this.bgLayerA;
            const outLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;

            inLayer.style.backgroundImage = 'url("' + svgUrl + '")';
            inLayer.classList.add('active');
            outLayer.classList.remove('active');
            this.activeBgLayer = this.activeBgLayer === 'A' ? 'B' : 'A';

            const testImg = new Image();
            testImg.onerror = () => {
              const img2 = new Image();
              img2.onload = () => {
                inLayer.style.backgroundImage = 'url("' + pngUrl + '")';
              };
              img2.onerror = () => {
                inLayer.style.backgroundImage = 'radial-gradient(ellipse at center, #334155 0%, #0f172a 100%)';
              };
              img2.src = pngUrl;
            };
            testImg.src = svgUrl;
          }
        } else {
          this.currentBgUrl = '';
          this.bgLayerA.classList.remove('active');
          this.bgLayerB.classList.remove('active');
        }

        // 2. Character Reconciliation
        const currChars = state.visual.characters;
        const currIds = new Set(Object.keys(currChars));

        for (const [id, rec] of this.activeChars.entries()) {
          if (!currIds.has(id)) {
            rec.div.style.opacity = '0';
            rec.div.style.transform = rec.div.style.transform + ' translateY(20px)';
            setTimeout(() => rec.div.remove(), 350);
            this.activeChars.delete(id);
          }
        }

        for (const [id, cs] of Object.entries(currChars)) {
          const pos = cs.position || 'center';
          const expr = cs.expression;
          const posClass = 'kawa-pos-' + pos;
          const exprPart = expr ? '/' + expr : '';
          const svgUrl = ASSET_PREFIX + 'assets/characters/' + id + exprPart + '.svg';
          const pngUrl = ASSET_PREFIX + 'assets/characters/' + id + exprPart + '.png';

          if (!this.activeChars.has(id)) {
            const div = document.createElement('div');
            div.className = 'kawa-sprite ' + posClass;
            const img = document.createElement('img');
            img.src = svgUrl;
            img.onerror = () => {
              img.onerror = null;
              img.src = pngUrl;
            };
            div.appendChild(img);
            this.charsEl.appendChild(div);
            this.activeChars.set(id, { div, img, expr, pos });
          } else {
            const rec = this.activeChars.get(id);
            if (rec.pos !== pos) {
              rec.div.className = 'kawa-sprite ' + posClass;
              rec.pos = pos;
            }
            if (rec.expr !== expr) {
              rec.img.src = svgUrl;
              rec.img.onerror = () => {
                rec.img.onerror = null;
                rec.img.src = pngUrl;
              };
              rec.expr = expr;
            }
          }
        }

        // 3. Choice Menu
        if (state.choices && state.choices.length > 0) {
          this.isChoicePending = true;
          this.choiceEl.innerHTML = '';
          this.choiceEl.style.display = 'flex';
          state.choices.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = 'kawa-choice-btn';
            btn.textContent = c.text;
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.vm.choose(idx);
            });
            this.choiceEl.appendChild(btn);
          });
        } else {
          this.choiceEl.style.display = 'none';
          this.choiceEl.innerHTML = '';
        }

        // 4. Dialogue Box
        if (state.dialogue) {
          this.boxEl.style.display = 'block';
          if (state.dialogue.speakerDisplayName || state.dialogue.speaker) {
            this.spkEl.textContent = state.dialogue.speakerDisplayName || state.dialogue.speaker;
            this.spkEl.style.display = 'inline-block';
            this.spkEl.style.backgroundColor = state.dialogue.speakerColor || '#f43f5e';
          } else {
            this.spkEl.style.display = 'none';
          }

          this.fullText = state.dialogue.text;
          if (this.typewriterInterval) clearInterval(this.typewriterInterval);

          if (this.typewriterSpeed <= 0) {
            this.txtEl.innerHTML = formatRichText(this.fullText);
            this.isTypewriting = false;
            if (this.isAutoMode && (!state.choices || state.choices.length === 0)) this.scheduleAuto();
          } else {
            this.isTypewriting = true;
            this.txtEl.innerHTML = '';
            const temp = document.createElement('div');
            temp.innerHTML = formatRichText(this.fullText);
            const plain = temp.textContent || '';
            let cIdx = 0;
            this.typewriterInterval = setInterval(() => {
              cIdx++;
              if (cIdx >= plain.length) {
                this.finishTypewriter();
                if (this.isAutoMode && (!state.choices || state.choices.length === 0)) this.scheduleAuto();
              } else {
                this.txtEl.textContent = plain.slice(0, cIdx);
              }
            }, this.typewriterSpeed);
          }
        } else {
          this.boxEl.style.display = 'none';
        }

        // 5. Ending Card
        const exEnd = this.stageEl ? this.stageEl.querySelector('.kawa-ending-card') : this.rootEl.querySelector('.kawa-ending-card');
        if (exEnd) exEnd.remove();

        if (state.isFinished) {
          const endingCard = document.createElement('div');
          endingCard.className = 'kawa-ending-card';
          endingCard.innerHTML = \`
            <div class="kawa-ending-title">The End</div>
            <div class="kawa-ending-subtitle">Thank you for playing!</div>
            <button class="kawa-choice-btn kawa-replay-btn" style="margin-top:16px">\${SVG_ICONS.replay} Play Again</button>
            <button class="kawa-choice-btn kawa-return-menu-btn" style="margin-top:10px">\${SVG_ICONS.home} Main Menu</button>\`;
          endingCard.querySelector('.kawa-replay-btn').addEventListener('click', () => {
            endingCard.remove();
            this.startNewGame();
          });
          endingCard.querySelector('.kawa-return-menu-btn').addEventListener('click', () => {
            endingCard.remove();
            this.showMainMenu();
          });
          (this.stageEl || this.rootEl.querySelector('.kawa-stage')).appendChild(endingCard);
        }
      }

      finishTypewriter() {
        if (!this.isTypewriting) return;
        if (this.typewriterInterval) {
          clearInterval(this.typewriterInterval);
          this.typewriterInterval = null;
        }
        this.isTypewriting = false;
        this.txtEl.innerHTML = formatRichText(this.fullText);
      }

      showSettings() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${SVG_ICONS.settings} <span>Preferences</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body">
            <div class="kawa-setting-row">
              <div class="kawa-setting-header"><span>Text Display Speed</span><span class="kawa-setting-value" id="kawa-speed-val">\${this.typewriterSpeed === 0 ? 'Instant' : this.typewriterSpeed + 'ms'}</span></div>
              <input type="range" class="kawa-slider" id="kawa-speed-slider" min="0" max="60" step="5" value="\${this.typewriterSpeed}">
            </div>
            <div class="kawa-setting-row">
              <div class="kawa-setting-header"><span>Auto-Forward Time</span><span class="kawa-setting-value" id="kawa-auto-val">\${(this.autoDelayMs / 1000).toFixed(1)}s</span></div>
              <input type="range" class="kawa-slider" id="kawa-auto-slider" min="500" max="5000" step="250" value="\${this.autoDelayMs}">
            </div>
            <div class="kawa-setting-row">
              <div class="kawa-setting-header"><span>\${SVG_ICONS.volumeOn} Music Volume</span><span class="kawa-setting-value">80%</span></div>
              <input type="range" class="kawa-slider" min="0" max="100" step="5" value="80">
            </div>
            <div class="kawa-setting-row">
              <div class="kawa-setting-header"><span>\${SVG_ICONS.volumeOn} SFX & Voice Volume</span><span class="kawa-setting-value">100%</span></div>
              <input type="range" class="kawa-slider" min="0" max="100" step="5" value="100">
            </div>
          </div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const speedIn = card.querySelector('#kawa-speed-slider');
        const speedVal = card.querySelector('#kawa-speed-val');
        speedIn.addEventListener('input', () => {
          this.typewriterSpeed = Number(speedIn.value);
          speedVal.textContent = this.typewriterSpeed === 0 ? 'Instant' : this.typewriterSpeed + 'ms';
          this.saveSettings();
        });
        const autoIn = card.querySelector('#kawa-auto-slider');
        const autoVal = card.querySelector('#kawa-auto-val');
        autoIn.addEventListener('input', () => {
          this.autoDelayMs = Number(autoIn.value);
          autoVal.textContent = (this.autoDelayMs / 1000).toFixed(1) + 's';
          this.saveSettings();
        });
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      saveSettings() {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('kawaijs_settings', JSON.stringify({
              typewriterSpeed: this.typewriterSpeed,
              autoDelayMs: this.autoDelayMs
            }));
          } catch {}
        }
      }

      async showSaveLoad(mode) {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${mode === 'save' ? SVG_ICONS.save : SVG_ICONS.load} <span>\${mode === 'save' ? 'Save Game' : 'Load Game'}</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body"><div class="kawa-slots-grid"></div></div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const grid = card.querySelector('.kawa-slots-grid');
        const slots = await this.vm.saveManager.listSlots(6);
        slots.forEach((s, i) => {
          const num = String(i + 1);
          const c = document.createElement('div');
          c.className = 'kawa-slot-card';
          c.innerHTML = \`
            <div class="kawa-slot-header">
              <span class="kawa-slot-badge">Slot \${num}</span>
              <span class="kawa-slot-time">\${s ? new Date(s.timestamp).toLocaleTimeString() : 'Empty'}</span>
            </div>
            <div class="kawa-slot-preview">\${s ? (s.previewText || 'Game in progress') : '<span class="kawa-slot-empty-text">No save data</span>'}</div>
            <div class="kawa-slot-actions"></div>\`;
          const act = c.querySelector('.kawa-slot-actions');
          if (mode === 'save') {
            const b = document.createElement('button');
            b.className = 'kawa-slot-btn kawa-slot-btn-save';
            b.innerHTML = SVG_ICONS.save + ' Save Here';
            b.addEventListener('click', async () => {
              await this.vm.save(num);
              ov.remove();
              this.showSaveLoad('save');
            });
            act.appendChild(b);
          } else if (s) {
            const b = document.createElement('button');
            b.className = 'kawa-slot-btn kawa-slot-btn-load';
            b.innerHTML = SVG_ICONS.load + ' Load';
            b.addEventListener('click', async () => {
              if (await this.vm.load(num)) {
                ov.remove();
                this.hideMainMenu();
              }
            });
            act.appendChild(b);
          }
          if (s) {
            const d = document.createElement('button');
            d.className = 'kawa-slot-btn kawa-slot-btn-del';
            d.innerHTML = SVG_ICONS.trash;
            d.addEventListener('click', async () => {
              await this.vm.saveManager.deleteSlot(num);
              ov.remove();
              this.showSaveLoad(mode);
            });
            act.appendChild(d);
          }
          grid.appendChild(c);
        });
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      showHistory() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${SVG_ICONS.history} <span>Dialogue History</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body"></div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const body = card.querySelector('.kawa-modal-body');
        if (this.vm.history.length === 0) {
          body.innerHTML = '<div style="opacity:0.6">No dialogue history yet.</div>';
        } else {
          this.vm.history.forEach(h => {
            const item = document.createElement('div');
            item.className = 'kawa-history-item';
            if (h.speakerDisplayName) {
              item.innerHTML = '<div class="kawa-history-speaker">' + h.speakerDisplayName + '</div>';
            }
            const txt = document.createElement('div');
            txt.innerHTML = formatRichText(h.text);
            item.appendChild(txt);
            body.appendChild(item);
          });
        }
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }
    }

    function preloadAssets(story) {
      if (typeof window === 'undefined') return;
      for (const list of Object.values(story.labels || {})) {
        for (const inst of list) {
          if (inst.type === 'scene' && inst.background) {
            const clean = inst.background.replace(/^bg[\\s_]+/i, '').trim();
            const img = new Image();
            img.src = ASSET_PREFIX + 'assets/backgrounds/' + (clean.includes('.') ? clean : clean + '.svg');
          } else if (inst.type === 'show') {
            const expr = inst.expression ? '/' + inst.expression : '';
            const img = new Image();
            img.src = ASSET_PREFIX + 'assets/characters/' + inst.character + expr + '.svg';
          }
        }
      }
    }

    function mountKawaApp(story, container) {
      preloadAssets(story);
      const vm = new StoryVM(story);
      const audio = new AudioManager();
      const audioResolver = (track, channel) => {
        return track.includes('.') ? ASSET_PREFIX + 'assets/audio/' + track : ASSET_PREFIX + 'assets/audio/' + track + '.mp3';
      };
      audio.attachToVM(vm, audioResolver);
      const renderer = new DOMRenderer(vm, container, audio);
      return { vm, renderer, audio };
    }
  `;
}
