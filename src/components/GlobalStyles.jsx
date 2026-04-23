export default function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; padding: 0; min-height: 100vh; }
      body {
        font-family: 'Inter Tight', system-ui, sans-serif;
        background: #f5f1ea; color: #1a1917;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      .serif { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
      .tabular { font-variant-numeric: tabular-nums; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fade-up { animation: fadeUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
      .fade-in { animation: fadeIn 0.4s ease both; }
      button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
      input { font-family: inherit; }
      .skeleton {
        background: linear-gradient(90deg, #ece7de 0%, #f5f1ea 50%, #ece7de 100%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
      .spinner {
        width: 20px; height: 20px; border-radius: 50%;
        border: 2px solid #e3dcc9; border-top-color: #1a1917;
        animation: spin 0.8s linear infinite;
      }
      a { color: inherit; }
    `}</style>
  );
}
