import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#E8EDF5',
    primaryTextColor: '#1B2A4A',
    primaryBorderColor: '#C5D0E5',
    lineColor: '#6B7280',
    secondaryColor: '#FFF7ED',
    tertiaryColor: '#F0FDF4',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
});

let renderCounter = 0;

export default function MermaidRenderer({ code, id = 'mermaid' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const render = async () => {
      try {
        renderCounter++;
        const uniqueId = `${id}-${renderCounter}`;
        const { svg } = await mermaid.render(uniqueId, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-card text-sm text-amber-800">
              <p class="font-medium mb-2">⚠️ Diagram rendering failed</p>
              <pre class="text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-white/50 p-3 rounded">${
                code.slice(0, 500)
              }</pre>
            </div>
          `;
        }
      }
    };

    render();
  }, [code, id]);

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto [&_svg]:mx-auto"
    />
  );
}
