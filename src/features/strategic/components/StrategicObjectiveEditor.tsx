/**
 * StrategicObjectiveEditor - Modal de edición de objetivos estratégicos
 *
 * Utiliza la configuración dinámica de objectiveConfig.ts para renderizar
 * los campos apropiados según el tipo de objetivo seleccionado.
 */
import { useState, useMemo, useRef } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import { FieldRenderer } from './fields';
import { EntityScopeSelector } from '@/components/common';
import {
  CATEGORIES,
  RESPONSIBLES,
  getObjectiveTypesForCategory,
  getObjectiveTypeConfig,
  getDefaultObjectiveType,
} from '../config';
import type {
  StrategicObjective,
  StrategicObjectiveInput,
  ObjectiveHorizon,
  ObjectiveCategory,
  ObjectiveResponsible,
  ObjectiveFieldData,
} from '@/types';

// ============================================
// TYPES
// ============================================

interface StrategicObjectiveEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: StrategicObjectiveInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  objective?: StrategicObjective;
  defaultCompanyId?: string;
  defaultCategory?: ObjectiveCategory;
  isLoading?: boolean;
  isDeleting?: boolean;
}

interface FormData {
  companyId: string | null;
  brandId: string | null;
  addressId: string | null;
  title: string;
  description: string;
  category: ObjectiveCategory;
  objectiveTypeId: string;
  responsible: ObjectiveResponsible;
  deadline: string; // YYYY-MM-DD
  fieldData: ObjectiveFieldData;
  // KPI fields
  linkedKpiId: string | null;
  kpiTargetValue: number | null;
}

// ============================================
// KPI CONFIGURATION
// ============================================

interface KpiConfig {
  id: string;
  label: string;
  unit: string;
  description: string;
  category: ObjectiveCategory[];
}

const AVAILABLE_KPIS: KpiConfig[] = [
  // Finanzas
  { id: 'revenue', label: 'Ventas', unit: '€', description: 'Facturación total', category: ['finanzas'] },
  { id: 'orders', label: 'Pedidos', unit: '', description: 'Número de pedidos', category: ['finanzas', 'operaciones'] },
  { id: 'avg_ticket', label: 'Ticket Medio', unit: '€', description: 'Valor medio por pedido', category: ['finanzas'] },
  { id: 'net_revenue', label: 'Ventas Netas', unit: '€', description: 'Ventas - Reembolsos', category: ['finanzas'] },
  // Clientes
  { id: 'new_customers', label: 'Clientes Nuevos', unit: '', description: 'Nuevos clientes en el periodo', category: ['clientes'] },
  { id: 'new_customers_pct', label: '% Clientes Nuevos', unit: '%', description: 'Porcentaje de nuevos vs total', category: ['clientes'] },
  { id: 'unique_customers', label: 'Clientes Únicos', unit: '', description: 'Clientes únicos en el periodo', category: ['clientes'] },
  { id: 'orders_per_customer', label: 'Pedidos/Cliente', unit: '', description: 'Frecuencia de compra', category: ['clientes'] },
  // Operaciones
  { id: 'refund_rate', label: '% Reembolsos', unit: '%', description: 'Tasa de reembolsos', category: ['operaciones'] },
  { id: 'promo_rate', label: '% Promociones', unit: '%', description: 'Tasa de descuentos', category: ['operaciones', 'finanzas'] },
  // Reputación
  { id: 'rating', label: 'Valoración', unit: '⭐', description: 'Rating medio', category: ['reputacion'] },
  { id: 'reviews_count', label: 'Nº Reseñas', unit: '', description: 'Cantidad de reseñas', category: ['reputacion'] },
];

function getKpisForCategory(category: ObjectiveCategory): KpiConfig[] {
  return AVAILABLE_KPIS.filter((kpi) => kpi.category.includes(category));
}

function getKpiConfig(kpiId: string): KpiConfig | undefined {
  return AVAILABLE_KPIS.find((kpi) => kpi.id === kpiId);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDaysRemaining(deadline: string): number {
  if (!deadline) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getHorizonFromDeadline(deadline: string): ObjectiveHorizon {
  const days = calculateDaysRemaining(deadline);
  if (days <= 90) return 'short';
  if (days <= 180) return 'medium';
  return 'long';
}

function getHorizonLabel(horizon: ObjectiveHorizon): string {
  switch (horizon) {
    case 'short': return 'Corto Plazo';
    case 'medium': return 'Medio Plazo';
    case 'long': return 'Largo Plazo';
  }
}

function getHorizonColor(horizon: ObjectiveHorizon): string {
  switch (horizon) {
    case 'short': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'long': return 'bg-green-100 text-green-700';
  }
}

function formatDaysRemaining(days: number): string {
  if (days < 0) return `${Math.abs(days)} días atrasado`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return '1 día restante';
  return `${days} días restantes`;
}

// ============================================
// FORM COMPONENT
// ============================================

interface ObjectiveFormProps {
  initialData: FormData;
  onSave: (data: FormData, calculatedHorizon: ObjectiveHorizon) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isDeleting: boolean;
  isEditing: boolean;
}

function ObjectiveForm({
  initialData,
  onSave,
  onDelete,
  onCancel,
  isLoading,
  isDeleting,
  isEditing,
}: ObjectiveFormProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Get current category config and objective types
  const objectiveTypes = getObjectiveTypesForCategory(formData.category);
  const currentTypeConfig = getObjectiveTypeConfig(formData.objectiveTypeId);

  // Update field helper
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle category change - reset objective type to first of new category
  const handleCategoryChange = (category: ObjectiveCategory) => {
    const defaultType = getDefaultObjectiveType(category);
    const defaultResponsible = defaultType?.defaultResponsible || 'thinkpaladar';

    setFormData((prev) => ({
      ...prev,
      category,
      objectiveTypeId: defaultType?.id || '',
      responsible: defaultResponsible,
      fieldData: {}, // Reset field data
      linkedKpiId: null, // Reset KPI when category changes
      kpiTargetValue: null,
    }));
  };

  // Handle objective type change
  const handleTypeChange = (typeId: string) => {
    const typeConfig = getObjectiveTypeConfig(typeId);
    setFormData((prev) => ({
      ...prev,
      objectiveTypeId: typeId,
      responsible: typeConfig?.defaultResponsible || prev.responsible,
      fieldData: {}, // Reset field data
    }));
  };

  // Calculated values
  const daysRemaining = useMemo(() => calculateDaysRemaining(formData.deadline), [formData.deadline]);
  const autoHorizon = useMemo(() => getHorizonFromDeadline(formData.deadline), [formData.deadline]);

  // Validation - companyId es requerido
  const isValid = formData.companyId && formData.title.trim() && formData.category && formData.deadline;

  // Handle submit
  const handleSubmit = () => {
    if (!isValid) return;
    onSave(formData, autoHorizon);
  };

  return (
    <>
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
        {/* Scope selector: Company → Brand → Address */}
        <EntityScopeSelector
          companyId={formData.companyId}
          brandId={formData.brandId}
          addressId={formData.addressId}
          onCompanyChange={(id) => updateField('companyId', id)}
          onBrandChange={(id) => updateField('brandId', id)}
          onAddressChange={(id) => updateField('addressId', id)}
          required
          disabled={isEditing}
          summaryLabel="Alcance del objetivo"
        />

        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoría
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = formData.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors',
                    isSelected
                      ? `border-${cat.color}-500 ${cat.bgColor}`
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected ? cat.textColor : 'text-gray-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs',
                      isSelected ? `${cat.textColor} font-medium` : 'text-gray-500'
                    )}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Objective Type selector */}
        <Select
          label="Tipo de objetivo"
          value={formData.objectiveTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={objectiveTypes.map((t) => ({ value: t.id, label: t.label }))}
        />

        {/* KPI selector - show KPIs relevant to category */}
        {getKpisForCategory(formData.category).length > 0 && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Vincular a KPI (opcional)
              </label>
              {formData.linkedKpiId && (
                <button
                  type="button"
                  onClick={() => {
                    updateField('linkedKpiId', null);
                    updateField('kpiTargetValue', null);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Quitar
                </button>
              )}
            </div>
            <Select
              value={formData.linkedKpiId || ''}
              onChange={(e) => {
                updateField('linkedKpiId', e.target.value || null);
                if (!e.target.value) updateField('kpiTargetValue', null);
              }}
              options={[
                { value: '', label: 'Sin vincular a KPI' },
                ...getKpisForCategory(formData.category).map((kpi) => ({
                  value: kpi.id,
                  label: `${kpi.label}${kpi.unit ? ` (${kpi.unit})` : ''}`,
                })),
              ]}
            />
            {formData.linkedKpiId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Objetivo a alcanzar ({getKpiConfig(formData.linkedKpiId)?.unit || ''})
                </label>
                <Input
                  type="number"
                  value={formData.kpiTargetValue?.toString() || ''}
                  onChange={(e) => updateField('kpiTargetValue', e.target.value ? Number(e.target.value) : null)}
                  placeholder={`Ej: ${formData.linkedKpiId === 'revenue' ? '50000' : formData.linkedKpiId === 'rating' ? '4.5' : '100'}`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {getKpiConfig(formData.linkedKpiId)?.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dynamic field based on objective type */}
        {currentTypeConfig && (
          <FieldRenderer
            config={currentTypeConfig}
            fieldData={formData.fieldData}
            onChange={(fieldData) => updateField('fieldData', fieldData)}
          />
        )}

        {/* Responsible selector */}
        <Select
          label="Responsable"
          value={formData.responsible}
          onChange={(e) => updateField('responsible', e.target.value as ObjectiveResponsible)}
          options={RESPONSIBLES.map((r) => ({ value: r.id, label: r.label }))}
        />

        {/* Title */}
        <Input
          label="Título del objetivo"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Ej: Aumentar facturación mensual un 15%"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Descripción (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe el objetivo con más detalle..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Deadline Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Calendar className="w-4 h-4 inline mr-1" />
            Fecha límite
          </label>
          <div
            className="relative cursor-pointer"
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <input
              ref={dateInputRef}
              type="date"
              value={formData.deadline}
              onChange={(e) => updateField('deadline', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
            />
          </div>

          {/* Quick date presets */}
          <div className="mt-2 flex items-center gap-2">
            {[
              { label: '30d', days: 30 },
              { label: '45d', days: 45 },
              { label: '90d', days: 90 },
              { label: '180d', days: 180 },
            ].map((preset) => {
              const presetDate = new Date();
              presetDate.setDate(presetDate.getDate() + preset.days);
              const presetValue = presetDate.toISOString().split('T')[0];
              const isSelected = formData.deadline === presetValue;
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => updateField('deadline', presetValue)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Auto-calculated horizon and countdown */}
          {formData.deadline && (
            <div className="mt-2 flex items-center gap-3">
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getHorizonColor(autoHorizon))}>
                {getHorizonLabel(autoHorizon)}
              </span>
              <span className={cn(
                'text-sm font-medium',
                daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 7 ? 'text-orange-600' : 'text-gray-600'
              )}>
                {formatDaysRemaining(daysRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        {/* Delete button (only when editing) */}
        <div>
          {isEditing && onDelete && (
            <Button
              variant="outline"
              onClick={onDelete}
              isLoading={isDeleting}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading} isDisabled={!isValid}>
            {isEditing ? 'Guardar cambios' : 'Crear objetivo'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StrategicObjectiveEditor({
  isOpen,
  onClose,
  onSave,
  onDelete,
  objective,
  defaultCompanyId,
  defaultCategory: propDefaultCategory,
  isLoading = false,
  isDeleting = false,
}: StrategicObjectiveEditorProps) {
  const isEditing = !!objective;

  // Default form data
  const getDefaultData = (): FormData => {
    const defaultCategory: ObjectiveCategory = (objective?.category as ObjectiveCategory) || propDefaultCategory || 'finanzas';
    const defaultType = getDefaultObjectiveType(defaultCategory);

    return {
      companyId: objective?.companyId || defaultCompanyId || null,
      brandId: objective?.brandId || null,
      addressId: objective?.addressId || null,
      title: objective?.title || '',
      description: objective?.description || '',
      category: defaultCategory,
      objectiveTypeId: objective?.objectiveTypeId || defaultType?.id || '',
      responsible: (objective?.responsible as ObjectiveResponsible) || defaultType?.defaultResponsible || 'thinkpaladar',
      deadline: objective?.evaluationDate ? objective.evaluationDate.split('T')[0] : '',
      fieldData: objective?.fieldData || {},
      linkedKpiId: objective?.kpiType || null,
      kpiTargetValue: objective?.kpiTargetValue || null,
    };
  };

  // Handle form save
  const handleFormSave = async (formData: FormData, calculatedHorizon: ObjectiveHorizon) => {
    if (!formData.companyId) return;

    // Get KPI config for unit
    const kpiConfig = formData.linkedKpiId ? getKpiConfig(formData.linkedKpiId) : undefined;

    const input: StrategicObjectiveInput = {
      companyId: formData.companyId,
      brandId: formData.brandId || undefined,
      addressId: formData.addressId || undefined,
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      objectiveTypeId: formData.objectiveTypeId,
      horizon: calculatedHorizon,
      status: isEditing ? objective?.status : 'pending',
      responsible: formData.responsible,
      fieldData: formData.fieldData,
      evaluationDate: formData.deadline || undefined,
      // KPI fields
      kpiType: formData.linkedKpiId || undefined,
      kpiTargetValue: formData.kpiTargetValue || undefined,
      kpiUnit: kpiConfig?.unit || undefined,
    };

    await onSave(input);
    onClose();
  };

  // Generate a unique key to force form remount
  const formKey = objective?.id || 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Objetivo' : 'Nuevo Objetivo'}
      size="lg"
    >
      <ObjectiveForm
        key={formKey}
        initialData={getDefaultData()}
        onSave={handleFormSave}
        onDelete={onDelete}
        onCancel={onClose}
        isLoading={isLoading}
        isDeleting={isDeleting}
        isEditing={isEditing}
      />
    </Modal>
  );
}
