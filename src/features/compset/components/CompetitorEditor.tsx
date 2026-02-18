import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CompsetCompetitor, CompsetPlatform } from '@/types';

interface CompetitorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompetitorFormData) => void;
  competitor?: CompsetCompetitor;
}

export interface CompetitorFormData {
  name: string;
  platform: CompsetPlatform;
  externalStoreId: string;
  externalStoreUrl: string;
  address: string;
}

const PLATFORMS: { value: CompsetPlatform; label: string }[] = [
  { value: 'glovo', label: 'Glovo' },
  { value: 'ubereats', label: 'UberEats' },
  { value: 'justeat', label: 'JustEat' },
];

export function CompetitorEditor({ isOpen, onClose, onSave, competitor }: CompetitorEditorProps) {
  const [name, setName] = useState(competitor?.name ?? '');
  const [platform, setPlatform] = useState<CompsetPlatform>(competitor?.platform ?? 'glovo');
  const [externalStoreId, setExternalStoreId] = useState(competitor?.externalStoreId ?? '');
  const [externalStoreUrl, setExternalStoreUrl] = useState(competitor?.externalStoreUrl ?? '');
  const [address, setAddress] = useState(competitor?.address ?? '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), platform, externalStoreId, externalStoreUrl, address });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {competitor ? 'Editar competidor' : 'Añadir competidor'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del restaurante *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ej: Burger King Gran Vía"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma *</label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    platform === p.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID en plataforma
            </label>
            <input
              type="text"
              value={externalStoreId}
              onChange={(e) => setExternalStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="ID externo (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL en plataforma
            </label>
            <input
              type="url"
              value={externalStoreUrl}
              onChange={(e) => setExternalStoreUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Calle, Ciudad"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {competitor ? 'Guardar' : 'Añadir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
