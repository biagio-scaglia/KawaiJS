# 🌸 KawaiiJS — Comprehensive Technical Audit Report

> **Data Audit:** 17 Ottobre 2026  
> **Oggetto:** Repository KawaiiJS (Monorepo)  
> **Team di Audit:** Senior JavaScript/TypeScript Engineer, Software Architect, Security Engineer, QA Automation Engineer, Performance Engineer, Developer Experience Engineer, Open Source Maintainer.  
> **Versione Software Esaminata:** 1.0.0  

---

## 1. Executive Summary

KawaiiJS è un motore visual novel web-native modulare e un toolchain ispirato a Ren'Py. Il progetto implementa un'architettura a monorepo pulita e ben strutturata, suddivisa in 8 pacchetti funzionali: AST (`@kawaijs/ast`), Parser/Compilatore (`@kawaijs/parser`), Macchina Virtuale headless (`@kawaijs/runtime`), Sistema Audio (`@kawaijs/audio`), Rendering DOM/CSS semantico (`@kawaijs/renderer-dom`), Plugin Vite (`@kawaijs/vite-plugin`), CLI (`kawaijs`) ed Estensione editor (`vscode-kawa`).

### Punti di Forza Rilevati
- **Architettura disaccoppiata e reattiva**: Il runtime (`StoryVM`) è headless e indipendente dal DOM, consentendo esecuzioni headless, simulazioni monte-carlo (fuzzing) e un'eccellente testabilità.
- **Rendering 100% web-native semantico**: Nessun canvas lock-in; layout responsivo 16:9 con letterboxing dinamico, dual-layer transition per sfondi, typewriter sound-synced e rispetto delle preferenze di accessibilità (dyslexia font, contrasto, screen reader).
- **Batterie incluse per il web e SEO/GEO**: Generazione automatica di PWA (manifest, service worker), metadati Open Graph/Twitter, structured data JSON-LD, sitemap, robots.txt e `llms.txt` per crawler AI.
- **Suite di test solida**: 140 test automatizzati coprono compilazione, esecuzione VM, rollback, persistenza dei salvataggi, conformità DOM e accessibility.

### Criticità e Rischi Principali
1. **Release Blocker per `kawa create`**: I template di scaffold (`templates/starter`) non sono inclusi nel packaging di `packages/cli/package.json` (`"files"`). Di conseguenza, un utente che installa `kawaijs` da npm non riceve i template e ottiene uno scaffold incompleto e privo di asset.
2. **XSS / HTML Injection in Static Build e Dev Server**: L'incorporamento di `storyPackage` e `projectConfig` nei file HTML generati avviene mediante interpolazione diretta di `JSON.stringify` dentro tag `<script type="module">` senza sanitizzazione di sequenze `</script>`, permettendo potenziale esecuzione di script malevoli se nei testi sono presenti tag HTML.
3. **Bug funzionale nella gestione degli Achievement**: Lo stato degli achievement sbloccati non viene reidratato dal `localStorage` all'avvio di una nuova partita con `StoryVM.prototype.start()` o `DOMRenderer.prototype.startNewGame()`, causando lo svuotamento dell'elenco sbloccati in memoria.
4. **Discrepanza tra Documentazione e Implementazione**: Il `README.md` dichiara il supporto ad operatori `*=` e `/=` per l'istruzione `set`, ma né il Lexer, né il Parser, né la VM li supportano (supportati solo `=`, `+=`, `-=`).
5. **Vulnerabilità delle dipendenze (Supply Chain)**: Rilevata 1 vulnerabilità di severità High in `source-map-js` (GHSA-68fv-2mgg-jv7q) ereditata transitivamente da Vite/PostCSS.

---

## 2. Descrizione dell'Architettura Attuale

Il monorepo è orchestrato tramite npm workspaces con compilazione modulare gestita da TypeScript Project References (`tsc -b`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                                kawaijs                                 │
│                              (CLI Tool)                                │
│          dev | build | create | validate | export | embed              │
└────────┬──────────────────┬───────────────────┬────────────────────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ @kawaijs/parser │ │@kawaijs/renderer│ │ @kawaijs/audio  │
│ Lexer / Parser  │ │    DOM/CSS      │ │ Web Audio Engine│
│ Compiler / Diag │ │ Modals & Layout │ │ Autoducking/Fade│
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │                   ▼                   │
         │          ┌─────────────────┐          │
         └─────────►│@kawaijs/runtime │◄─────────┘
                    │ StoryVM / State │
                    │ Save / History  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  @kawaijs/ast   │
                    │ Nodes / IR / Loc│
                    └─────────────────┘
```

### Flusso Dati e Componenti
1. **Script `.kawa`**: File narrativo testuale con sintassi a indentazione pythonica.
2. **Lexer & Parser (`@kawaijs/parser`)**: Tokenizza il sorgente e costruisce l'AST (`ProgramNode`, `StatementNode`).
3. **Compiler (`@kawaijs/parser`)**: Appiattisce le inclusioni (`include`), valida le etichette orfane/cicliche e produce l'Intermediate Representation `StoryPackage` (etichette con vettori di `Instruction`).
4. **Virtual Machine (`@kawaijs/runtime`)**: Esegue istruzioni deterministicamente fino a incontrare un punto di attesa (`dialogue`, `choice`, `input`, `hotspot`, `pause`). Gestisce lo stack delle chiamate (`call`/`return`), lo storico dei rollback (snapshot), il motore di valutazione delle espressioni (parser a discesa ricorsiva senza `eval`) e i salvataggi (MemoryStorage/LocalStorage).
5. **Renderer DOM (`@kawaijs/renderer-dom`)**: Si aggancia agli eventi di stato della VM. Gestisce lo stage, i layer di transizione per gli sfondi (dual-layer wipe/crossfade/video), gli sprite dei personaggi con posizionamento e animazioni CSS, il box dei dialoghi con typewriter sonoro, i controlli touch/gamepad e i modal accessibili.
6. **Audio Manager (`@kawaijs/audio`)**: Ascolta gli `AudioEvent` emessi dalla VM e gestisce i canali `music`, `sound` e `voice`, supportando volume indipendente, dissolvenze incrociate e autoducking musicale durante il parlato.
7. **CLI (`kawaijs`)**: Fornisce un server di sviluppo con Server-Sent Events (SSE) per il live reload, bundling statico production-ready con `esbuild`, esportazione verso scaffolding desktop nativi (Tauri e Electron) e generazione di snippet `<iframe>` per embed.

---

## 3. Diagramma Mermaid dell'Architettura Reale

```mermaid
flowchart TD
    subgraph Authoring ["Fase di Authoring & Tooling"]
        Script[".kawa Script File"]
        Config["kawa.config.json"]
        VSCode["vscode-kawa (Syntax Highlighting)"]
        Playground["In-Browser Playground (CodeMirror 6)"]
    end

    subgraph Pipeline ["Pipeline di Compilazione (@kawaijs/parser)"]
        Lexer["Lexer (Indent / Dedent / Tokens)"]
        Parser["Parser (AST Construction)"]
        Validator["Validator & Diagnostica (Levenshtein hints)"]
        Compiler["Compiler (Flatten includes, IR generation)"]
        StoryPkg["StoryPackage (IR, Labels, Characters, i18n)"]
    end

    subgraph Execution ["Runtime Headless (@kawaijs/runtime)"]
        VM["StoryVM (Instruction Execution Engine)"]
        State["StoryState (Immutable snapshots)"]
        History["HistoryManager (Backlog)"]
        SaveMgr["SaveManager (V1/V2 Schema, Continue Links)"]
        Expr["Expression Evaluator (No eval, AST descent)"]
    end

    subgraph Presentation ["Presentazione & Output (@kawaijs/renderer-dom & audio)"]
        DOMR["DOMRenderer (Event Loop & State Sync)"]
        Stage["StageLayer (Responsive 16:9, Backgrounds, Sprites, VFX)"]
        Dialog["DialogueBox (Typewriter, Rich Text Sanitizer)"]
        Menus["Quick Menu & Ren'Py Main Menu"]
        Audio["AudioManager (Web Audio API, Ducking, Fades)"]
    end

    subgraph Distribution ["Distribuzione & Build (kawaijs CLI)"]
        DevSrv["Dev Server (HTTP + SSE Live Reload)"]
        StaticBuild["Static Production Build (esbuild IIFE inlined)"]
        Desktop["Desktop Scaffolding (Tauri / Electron)"]
        PWA["PWA Generator (manifest, sw.js, icons)"]
        SEO["SEO & GEO Engine (robots, sitemap, llms.txt, JSON-LD)"]
    end

    Script --> Lexer
    Lexer --> Parser
    Parser --> Validator
    Validator --> Compiler
    Compiler --> StoryPkg

    StoryPkg --> VM
    Config --> VM
    VM --> State
    VM --> History
    VM --> SaveMgr
    VM --> Expr

    State -.-> DOMR
    VM -.-> Audio
    DOMR --> Stage
    DOMR --> Dialog
    DOMR --> Menus

    Config --> DevSrv
    StoryPkg --> DevSrv
    StoryPkg --> StaticBuild
    StaticBuild --> Desktop
    StaticBuild --> PWA
    StaticBuild --> SEO
```

---

## 4. Problemi Critici (Critical)

### [CRIT-01] Scaffolding da npm non funzionante: assenza della cartella `templates/` nel pacchetto CLI
- **Severità:** Critical (Release Blocker)
- **File interessati:** [`packages/cli/package.json`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/package.json), [`packages/cli/src/commands/create.ts#L19-L30`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/src/commands/create.ts#L19-L30)
- **Descrizione tecnica:** Nel file `packages/cli/package.json` il campo `"files"` è configurato come:
  ```json
  "files": [
    "dist",
    "bin",
    "README.md"
  ]
  ```
  La funzione `createProject()` tenta di trovare i file template in `templates/starter/game` tramite percorsi relativi che risalgono verso la radice del monorepo (`../../../../templates/starter/game`). Quando un utente installa `kawaijs` globalmente o lo invoca via `npx kawa create`, il pacchetto npm scaricato contiene esclusivamente `dist` e `bin`.
- **Impatto concreto:** L'inizializzazione di un nuovo progetto da parte di qualsiasi sviluppatore esterno fallisce nel copiare il template completo con grafica, sfondi e audio. Il codice ricade nel blocco di fallback minimale creando uno script che referenzia asset inesistenti (`classroom.svg`, `yumia/happy.svg`), rendendo il nuovo progetto immediatamente rotto all'esecuzione di `kawa dev` o `kawa validate`.
- **Procedura di riproduzione:**
  1. Eseguire `npm pack --workspace=kawaijs --dry-run`
  2. Verificare che nessun file della directory `templates/` sia presente nel tarball risultante.
- **Soluzione proposta:** Copiare la directory `templates` dentro `packages/cli/templates` durante la build oppure includere `templates` nei `files` di `packages/cli/package.json` e aggiornare `resolveStarterGameDir()` per cercare `./templates` rispetto alla directory di installazione del pacchetto.
- **Rischi di regressione:** Minimi; aumenta la dimensione del tarball CLI di circa 600KB (comprensivo degli SVG e campioni audio).
- **Stima complessità:** Bassa (1-2 ore).

---

## 5. Problemi ad Alta Priorità (High)

### [HIGH-01] XSS / HTML Injection nei file `index.html` generati da `kawa build` e `kawa dev`
- **Severità:** High
- **File interessati:** [`packages/cli/src/commands/build.ts#L243-L244`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/src/commands/build.ts#L243-L244), [`packages/cli/src/commands/dev.ts#L362`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/src/commands/dev.ts#L362)
- **Descrizione tecnica:** Nei comandi `build` e `dev`, i dati serializzati di `storyPackage` e `projectConfig` vengono iniettati direttamente nel codice HTML generato:
  ```ts
  const htmlContent = `<!DOCTYPE html>
  ...
  <script type="module">
    const story = ${JSON.stringify(storyPackage, null, 2)};
    const projectConfig = ${JSON.stringify(projectConfig)};
  `;
  ```
  In HTML5, il parser del browser analizza i tag prima dell'interprete JavaScript. Se all'interno di un dialogo, di una variabile, o della configurazione (es. `projectConfig.title`) è presente la sequenza `</script><script>...`, il blocco `<script>` viene immediatamente chiuso e il codice iniettato viene eseguito come markup HTML/JS arbitrario.
- **Impatto concreto:** Se la visual novel include testi provenienti da fonti esterne, localizzazioni non verificate o se il toolchain viene integrato in piattaforme SaaS/web per la compilazione automatica di storie inviate da utenti, si verifica una vulnerabilità XSS memorizzata (Stored XSS).
- **Procedura di riproduzione:**
  1. In un file `script.kawa`, inserire la riga:
     ```kawa
     yumia "Attenzione: </script><script>alert('pwned')</script>"
     ```
  2. Eseguire `npx kawa build`.
  3. Aprire `dist/index.html` nel browser: l'alert viene eseguito all'avvio prima del caricamento del motore.
- **Soluzione proposta:** Sanificare la stringa JSON convertendo i caratteri `<` nella corrispondente sequenza di escape Unicode (`\u003c`):
  ```ts
  function serializeForHtml(obj: unknown): string {
    return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  }
  ```
- **Rischi di regressione:** Nessuno (la semantica JSON in JavaScript rimane identica).
- **Stima complessità:** Bassa (1 ora).

### [HIGH-02] Regressione dello stato Achievement su `start()` e `startNewGame()`
- **Severità:** High
- **File interessati:** [`packages/runtime/src/vm.ts#L185-L205`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/runtime/src/vm.ts#L185-L205), [`packages/renderer-dom/src/renderer.ts#L434-L440`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/renderer-dom/src/renderer.ts#L434-L440)
- **Descrizione tecnica:** Quando l'utente chiama `vm.start()` (oppure preme "Start New Game" o "Play Again" al termine del gioco), la VM esegue:
  ```ts
  this.state = createInitialState(startLabel);
  ```
  `createInitialState()` inizializza `achievements: Object.create(null)`. La funzione `this.hydrateAchievements()`, che recupera gli achievement salvati nel `localStorage`, viene chiamata solo in `mountKawaApp()` durante il montaggio iniziale della pagina e non all'interno di `start()`.
- **Impatto concreto:** Se un giocatore ha sbloccato achievement in partite precedenti e decide di avviare una "Nuova Partita" dal menu principale o di rigiocare dalla ending card senza ricaricare la pagina web (F5), l'elenco degli achievement in memoria si svuota. Nel modal "Achievements" tutti i progressi precedentemente ottenuti risultano bloccati.
- **Procedura di riproduzione:**
  1. Sbloccare un achievement con `unlock test_ach`.
  2. Raggiungere l'ending card e cliccare su "Play Again".
  3. Aprire il modal Achievements: l'achievement `test_ach` risulta perso nello stato della VM.
- **Soluzione proposta:** Invocare `this.hydrateAchievements()` all'interno del metodo `start()` di `StoryVM` subito dopo `this.applyInitialVariables()`.
- **Rischi di regressione:** Nessuno.
- **Stima complessità:** Bassa (30 minuti).

### [HIGH-03] Versione obsoleta hardcoded nello scaffolding (`kawaijs: ^0.1.11`)
- **Severità:** High
- **File interessati:** [`packages/cli/src/commands/create.ts#L144`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/src/commands/create.ts#L144)
- **Descrizione tecnica:** Nel manifest `package.json` generato per i nuovi progetti con `kawa create`, è hardcoded la dipendenza:
  ```json
  "dependencies": {
    "kawaijs": "^0.1.11"
  }
  ```
  La versione corrente del monorepo e di tutti i pacchetti distribuiti è `1.0.0`.
- **Impatto concreto:** Quando uno sviluppatore crea un nuovo progetto e lancia `npm install`, npm tenta di installare la pre-release `0.1.11` (o fallisce se non disponibile nel registro). Le nuove funzionalità e correzioni (vfx tint, video background, continue links v2, accessibility) non saranno disponibili.
- **Soluzione proposta:** Sincronizzare dinamicamente la versione con quella del pacchetto CLI leggendola dal `package.json` della CLI o usando `^1.0.0`.
- **Rischi di regressione:** Nessuno.
- **Stima complessità:** Bassa (15 minuti).

---

## 6. Problemi Medi e Minori (Medium & Low)

### [MED-01] Mancata gestione di query string e `include` nel plugin Vite
- **Severità:** Medium
- **File interessati:** [`packages/vite-plugin/src/index.ts#L10-L16`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/vite-plugin/src/index.ts#L10-L16)
- **Descrizione tecnica:** Il metodo `transform` del plugin Vite controlla l'estensione con `if (!id.endsWith('.kawa'))`. Vite aggiunge spesso suffissi di query (es. `?import`, `?raw`, o hash HMR `?t=12345`), impedendo al plugin di intercettare il modulo. Inoltre, la chiamata `compileScript(code, id)` non fornisce alcun `fileResolver`: se lo script importato in Vite utilizza `include "capitolo2.kawa"`, la compilazione fallisce con un errore di risoluzione file.
- **Soluzione:** Utilizzare `cleanUrl(id)` (rimuovendo query e hash) e fornire un resolver che sfrutti `this.resolve` o il file system basato sulla directory di `id`.

### [MED-02] Discrepanza Documentazione: Operatori `*=` e `/=` non implementati
- **Severità:** Medium
- **File interessati:** [`README.md#L171`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/README.md#L171), [`packages/parser/src/parser.ts#L435-L442`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/parser/src/parser.ts#L435-L442), [`packages/ast/src/ir.ts#L32`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/ast/src/ir.ts#L32)
- **Descrizione tecnica:** La tabella sintattica del `README.md` promette `set <var> = <expr> / += / -= / *= / /=`. Tuttavia, il lexer non tokenizza `*=` né `/=`, il parser accetta solo `['=', '+=', '-=']` e l'IR tipizza l'operatore come `'=' | '+=' | '-='`.
- **Soluzione:** Allineare la documentazione indicando che per moltiplicazioni e divisioni si utilizza la forma espressione `set var = var * factor`, oppure implementare `*=` e `/=` in AST, Lexer, Parser e Runtime.

### [MED-03] Mancanza di confine per directory traversal in `createCliFileResolver`
- **Severità:** Medium
- **File interessati:** [`packages/cli/src/config.ts#L222-L235`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/cli/src/config.ts#L222-L235)
- **Descrizione tecnica:** `createCliFileResolver` risolve qualsiasi percorso con `path.resolve(base, target)`. Se uno script contiene `include "../../../../../etc/passwd"`, il file viene letto senza verificare che si trovi all'interno della cartella di progetto.
- **Soluzione:** Aggiungere una verifica `if (!resolved.startsWith(rootDir + path.sep)) return null;`.

### [LOW-01] Estensione VS Code incompleta (`vscode-kawa`)
- **Severità:** Low (Developer Experience)
- **File interessati:** [`packages/vscode-kawa/syntaxes/kawa.tmLanguage.json`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/packages/vscode-kawa/syntaxes/kawa.tmLanguage.json)
- **Descrizione tecnica:** Il file di grammatica TextMate per VS Code evidenzia solo un sottoinsieme minimale di istruzioni. Mancano `call`, `include`, `import`, `vfx`, `camera`, `cg`, `define`, `input`, `window`, `theme`, `style`, `hotspot`, `layer`, `animate`, `unlock`, `lang`.
- **Soluzione:** Aggiornare la grammatica con i pattern regex corrispondenti a tutti i token definiti in `token.ts`.

### [LOW-02] `git add .` indiscriminato in `scripts/release.js`
- **Severità:** Low
- **File interessati:** [`scripts/release.js#L75`](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/scripts/release.js#L75)
- **Descrizione tecnica:** Lo script di release esegue `git add .`. In presenza di cartelle non tracciate (ad esempio cartelle `assets/` locali non ancora ignorate), queste verrebbero inserite nel commit di release automatico.
- **Soluzione:** Effettuare lo stage esplicito dei soli manifest e lockfile modificati (`git add package.json packages/*/package.json package-lock.json`).

---

## 7. Vulnerabilità di Sicurezza (Security Audit)

| ID | Titolo | Severità | File Interessato | Scenario di Sfruttamento | Soluzione |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Stored XSS via script tag breakout in HTML shell | **High** | `cli/src/commands/build.ts` (r. 243)<br>`cli/src/commands/dev.ts` (r. 362) | Testo narrativo contenente `</script>` rompe il blocco inline ed esegue JS arbitrario | Sanitizzare JSON con `.replace(/</g, '\\u003c')` |
| **SEC-02** | Arbitrary Local File Read via `include` | **Medium** | `cli/src/config.ts` (r. 227) | Uno script `.kawa` malevolo esegue `include "../../../secret.json"` e legge file esterni alla root | Limitare la risoluzione all'interno di `rootDir` |
| **SEC-03** | Supply Chain DoS in `source-map-js` | **High** | `node_modules/source-map-js` | Event-loop denial of service tramite source-map malformata in dev/build | Eseguire aggiornamento dipendenze / override in `package.json` |

---

## 8. Performance & Memory Audit

### 1. Build sincrona ripetuta di esbuild (`runtime-bundle.ts`)
- **Criticità:** In `getInlineRuntimeScript()`, `esbuild.buildSync` viene invocato sincronicamente su ogni richiesta di pagina nel dev server e durante la build. Benché esbuild sia estremamente rapido (~20-40ms), blocca l'event loop di Node.js.
- **Raccomandazione:** Nel dev server memorizzare il bundle compilato in memoria e invalidarlo solo tramite watcher sui file sorgente di `renderer-dom`.

### 2. Micro-leak di timer in `AudioManager.prototype.fadeVolume`
- **Criticità:** Il fade dei volumi audio campiona 20 step a intervalli di `durationMs / 20` (minimo 10ms) con `setInterval`. Se l'utente salta velocemente molte righe con comandi audio, si creano brevi sovrapposizioni di intervalli. Sebbene `clearFade(audio)` esista, una gestione con Web Audio GainNode (`linearRampToValueAtTime`) risulterebbe nativamente priva di timer JavaScript e immune da drift.

### 3. Tree Shaking & Bundle Size
- `@kawaijs/ast`, `@kawaijs/parser` e `@kawaijs/runtime` hanno `"sideEffects": false` configurato nei rispettivi `package.json`.
- Il bundle finale per il web (generato con esbuild format IIFE) ha una dimensione di soli **88 KB minificato**, dimostrando un'eccellente efficienza per progetti web e mobile.

---

## 9. Debito Tecnico

1. **Simmetria di Naming dei Pacchetti:**
   Tutti i pacchetti del monorepo sono sotto lo scope `@kawaijs/*` eccetto il pacchetto CLI che è nominato `kawaijs`. Questo crea incongruenze in script di automazione (es. `publish.yml` definisce `scope: '@kawaijs'`, ignorando potenzialmente i token per il pacchetto unscoped).
2. **Distribuzione del file CSS (`@kawaijs/renderer-dom`):**
   `package.json` del renderer esporta `./theme.css` puntando a `./src/theme.css`. La best practice prevede che il file compilato/minificato risieda in `./dist/theme.css` per evitare dipendenze dalla cartella `src`.
3. **Mancanza di `.npmignore` esplicito o pulizia file:**
   Alcuni pacchetti si affidano al fallback di `.gitignore` generando avvisi durante il comando `npm pack`.

---

## 10. Stato della Documentazione

- Il file [README.md](file:///c:/Users/biagio.scaglia/Desktop/cartella/kawaijs/README.md) è eccezionalmente ricco, chiaro e ben strutturato, corredato da esempi, tabelle sintattiche, guide per PWA, branding, SEO e accessibility.
- **Incongruenze verificate:**
  - Sintassi `set`: dichiarati `*=` e `/=` non supportati dal parser.
  - Dipendenza nello starter kit: indicata `^0.1.11` invece di `^1.0.0`.
  - Le documentazioni interattive (`examples/docs`) e lo showcase (`examples/showcase`) sono perfettamente allineati e compilabili.

---

## 11. Stato della Suite di Test

- **Esecutore:** Vitest 5.0.0 con happy-dom per l'emulazione del browser.
- **Totale file di test:** 15 file.
- **Totale asserzioni/test eseguiti:** 140 test.
- **Esito verifiche reali:** **140 PASSED (100% successo)**.
- **Aree con eccellente copertura:**
  - Sintassi, tokenizer, parser, diagnostica e suggerimenti Levenshtein (`packages/parser/test`).
  - Virtual machine, state cloning, rollback stack, save/load schema v1/v2, deep linking e continue-link token compression (`packages/runtime/test`).
  - Rendering DOM, layout responsivo 16:9, hotkey, gamepad, modals, audio synchronization (`packages/renderer-dom/test`).
  - CLI static build, SEO meta injection, PWA generation, export desktop Tauri/Electron (`packages/cli/test`).
- **Lacune identificate:**
  - Mancanza di test per script `.kawa` contenenti sequenze `</script>`.
  - Mancanza di test di integrazione per `hydrateAchievements` dopo riavvio partita da menu.
  - Mancanza di test per il plugin Vite in combinazione con la direttiva `include`.

---

## 12. Stato della Distribuzione npm

Verificato tramite `npm pack --workspace=<name> --dry-run`:

| Pacchetto | Versione | Dimensione Tarball | File Inclusi | Stato Release |
| :--- | :--- | :--- | :--- | :--- |
| `@kawaijs/ast` | 1.0.0 | 5.4 kB | dist/, package.json, README | **Pronto** |
| `@kawaijs/parser` | 1.0.0 | 18.2 kB | dist/, package.json, README | **Pronto** |
| `@kawaijs/runtime` | 1.0.0 | 24.1 kB | dist/, package.json, README | **Pronto** |
| `@kawaijs/audio` | 1.0.0 | 8.9 kB | dist/, package.json, README | **Pronto** |
| `@kawaijs/renderer-dom` | 1.0.0 | 87.6 kB | dist/, src/theme.css, package.json | **Pronto** (Attenzione export CSS) |
| `@kawaijs/vite-plugin` | 1.0.0 | 1.9 kB | dist/, package.json, README | **Pronto** |
| `kawaijs` (CLI) | 1.0.0 | 48.0 kB | dist/, bin/, package.json, README | **BLOCCANTE (Manca `templates/`)** |
| `vscode-kawa` | 1.0.0 | - | - | Privato (VS Code Marketplace) |

---

## 13. Remediation Plan (Piano di Intervento Ordinato)

### 🔴 P0: Problemi Bloccanti & Release Blocker
1. **[CRIT-01] Ripristinare i template nello scaffolding CLI:**
   - Includere la directory `templates/` nel pacchetto `kawaijs` (aggiornare `"files"` in `packages/cli/package.json` o predisporre uno script di copia in fase di build).
   - Aggiornare `resolveStarterGameDir()` per trovare i template all'interno della cartella installata del pacchetto.
2. **[HIGH-01] Eliminare la vulnerabilità di script breakout (XSS):**
   - Eseguire l'escape di `<` in `\u003c` per tutti i payload JSON inlined nei template HTML di `packages/cli/src/commands/build.ts` e `packages/cli/src/commands/dev.ts`.
3. **[HIGH-03] Aggiornare la versione hardcoded nello starter manifest:**
   - Sostituire `"kawaijs": "^0.1.11"` con `"kawaijs": "^1.0.0"` in `packages/cli/src/commands/create.ts`.

### 🟠 P1: Bug Funzionali & Regressioni
4. **[HIGH-02] Reidratare gli Achievement all'avvio della partita:**
   - Chiamare `this.hydrateAchievements()` dentro `StoryVM.prototype.start()` in `packages/runtime/src/vm.ts`.
5. **[MED-01] Robustezza del Plugin Vite:**
   - Pulire `id` da suffissi query string in `packages/vite-plugin/src/index.ts`.
   - Implementare un `fileResolver` predefinito basato sulla directory del file compilato per supportare la direttiva `include` in ambienti Vite.
6. **[MED-03] Prevenzione directory traversal su `include`:**
   - Verificare che il percorso risultante in `createCliFileResolver` sia contenuto in `rootDir`.

### 🟡 P2: Performance, Affidabilità & Developer Experience
7. **[LOW-01] Aggiornare la sintassi TextMate di `vscode-kawa`:**
   - Aggiungere tutti i comandi mancanti (`call`, `include`, `vfx`, `camera`, `cg`, `define`, `input`, `window`, `theme`, `style`, `hotspot`, `layer`, `animate`, `unlock`, `lang`) a `syntaxes/kawa.tmLanguage.json`.
8. **[PERF-01] Caching della build di runtime in `runtime-bundle.ts`:**
   - Evitare invocazioni ridondanti di `esbuild.buildSync` riutilizzando il bundle in memoria.
9. **[SEC-03] Rimozione della vulnerabilità `source-map-js`:**
   - Eseguire `npm audit fix` o specificare la versione corretta nelle `overrides` di `package.json`.

### 🟢 P3: Pulizia & Documentazione
10. **[MED-02] Allineare `README.md` per gli operatori di assegnamento:**
    - Rimuovere la dicitura `*=` e `/=` o documentare la sintassi supportata `set x = x * 2`.
11. **[LOW-02] Rendere selettivo lo stage git in `scripts/release.js`:**
    - Evitare `git add .` e puntare ai soli manifest e lockfile di rilascio.
12. **[DEBT-01] Esportazione CSS pulita per `@kawaijs/renderer-dom`:**
    - Copiare `src/theme.css` in `dist/theme.css` durante il build di TypeScript e far puntare gli exports unicamente a `dist/`.

---

## Conclusioni dell'Audit

KawaiiJS dimostra un livello architetturale e ingegneristico notevole: il codice è moderno, rigorosamente tipizzato in TypeScript (`strict: true`), con zero dipendenze runtime superflue e un'eccellente separazione delle responsabilità tra motore headless e renderer visivo. 

Risolvendo i **3 problemi P0/Release Blocker** (inclusione dei template npm, sanitizzazione XSS del generatore HTML e allineamento versione scaffolding), il repository è **pienamente pronto per la pubblicazione ufficiale su npm e per l'adozione in produzione**.
