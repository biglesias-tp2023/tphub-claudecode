import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { CompetitorCard } from './CompetitorCard';
import { CompetitorEditor, type CompetitorFormData } from './CompetitorEditor';
import {
  useCreateCompetitor,
  useUpdateCompetitor,
  useDeleteCompetitor,
} from '../hooks';
import type { CompetitorWithData } from '../types';
import type { CompsetCompetitor } from '@/types';

interface CompsetConfigProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  companyId: string;
}

const MAX_COMPETITORS = 5;

export function CompsetConfig({ hero, competitors, companyId }: CompsetConfigProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompsetCompetitor | undefined>();

  const createMutation = useCreateCompetitor();
  const updateMutation = useUpdateCompetitor();
  const deleteMutation = useDeleteCompetitor();

  const handleAdd = () => {
    setEditingCompetitor(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (competitor: CompsetCompetitor) => {
    setEditingCompetitor(competitor);
    setEditorOpen(true);
  };

  const handleSave = (data: CompetitorFormData) => {
    if (editingCompetitor) {
      updateMutation.mutate({
        id: editingCompetitor.id,
        input: {
          name: data.name,
          platform: data.platform,
          externalStoreId: data.externalStoreId || null,
          externalStoreUrl: data.externalStoreUrl || null,
          address: data.address || null,
        },
      });
    } else {
      createMutation.mutate({
        companyId,
        brandId: null,
        addressId: null,
        name: data.name,
        platform: data.platform,
        externalStoreId: data.externalStoreId || null,
        externalStoreUrl: data.externalStoreUrl || null,
        logoUrl: null,
        address: data.address || null,
        latitude: null,
        longitude: null,
        isActive: true,
        displayOrder: competitors.length + 1,
        createdBy: null,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este competidor del compset?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero info */}
      {hero && (
        <div className="bg-primary-50/50 rounded-lg border border-primary-100 p-4">
          <h4 className="text-sm font-semibold text-primary-700 mb-1">Tu restaurante (hero)</h4>
          <p className="text-sm text-primary-600">{hero.competitor.name}</p>
          {hero.competitor.address && (
            <p className="text-xs text-primary-500 mt-1">{hero.competitor.address}</p>
          )}
        </div>
      )}

      {/* Competitors grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Competidores ({competitors.length}/{MAX_COMPETITORS})
          </h3>
          {competitors.length < MAX_COMPETITORS && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          )}
        </div>

        {competitors.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-sm text-gray-500">
              No hay competidores configurados.
            </p>
            <Button size="sm" variant="outline" onClick={handleAdd} className="mt-3">
              <Plus className="w-4 h-4 mr-1" />
              Añadir competidor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <CompetitorCard
                key={c.competitor.id}
                data={c}
                onEdit={() => handleEdit(c.competitor)}
                onDelete={() => handleDelete(c.competitor.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-50 rounded-lg border border-blue-100 p-4">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Mapping de categorías</p>
          <p className="text-blue-600">
            Para comparar precios por categoría, los productos deben tener una categoría normalizada asignada.
            Los admins pueden asignarla desde{' '}
            <span className="font-medium">Administración &rarr; Categorías Menú</span>.
          </p>
        </div>
      </div>

      {/* Editor modal */}
      <CompetitorEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        competitor={editingCompetitor}
      />
    </div>
  );
}
