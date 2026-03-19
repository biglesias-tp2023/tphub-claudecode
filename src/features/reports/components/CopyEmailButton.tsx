/**
 * CopyEmailButton — copies the HTML email to clipboard for pasting in Gmail.
 */

import { useState, useCallback } from 'react';
import { ClipboardCopy, Check } from 'lucide-react';

interface CopyEmailButtonProps {
  buildHtml: () => string;
}

export function CopyEmailButton({ buildHtml }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const html = buildHtml();

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(html);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [buildHtml]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
      }`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado
        </>
      ) : (
        <>
          <ClipboardCopy className="w-4 h-4" />
          Copiar al portapapeles
        </>
      )}
    </button>
  );
}
