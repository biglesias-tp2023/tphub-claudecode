import { useState, useMemo } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import type {
  Task,
  TaskInput,
  TaskArea,
  TaskSubarea,
  Profile,
  Restaurant,
} from '@/types';

// ============================================
// TYPES
// ============================================

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  task?: Task;
  restaurants: Restaurant[];
  areas: TaskArea[];
  subareas: TaskSubarea[];
  profiles: Profile[];
  defaultRestaurantId?: string;
  isLoading?: boolean;
  isDeleting?: boolean;
}

interface FormData {
  restaurantId: string;
  title: string;
  description: string;
  areaId: string;
  subareaId: string;
  ownerId: string;
  deadline: string;
}

// ============================================
// FORM COMPONENT
// ============================================

interface TaskFormProps {
  initialData: FormData;
  restaurants: Restaurant[];
  areas: TaskArea[];
  subareas: TaskSubarea[];
  profiles: Profile[];
  onSave: (data: FormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading: boolean;
  isDeleting: boolean;
  isEditing: boolean;
}

function TaskForm({
  initialData,
  restaurants,
  areas,
  subareas,
  profiles,
  onSave,
  onCancel,
  onDelete,
  isLoading,
  isDeleting,
  isEditing,
}: TaskFormProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter subareas by selected area
  const filteredSubareas = useMemo(() => {
    if (!formData.areaId) return [];
    return subareas.filter((s) => s.areaId === formData.areaId);
  }, [formData.areaId, subareas]);

  // Reset subarea when area changes
  const handleAreaChange = (areaId: string) => {
    updateField('areaId', areaId);
    updateField('subareaId', '');
  };

  // Validation
  const isValid =
    formData.restaurantId &&
    formData.title.trim() &&
    formData.areaId &&
    formData.subareaId;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave(formData);
  };

  const handleDelete = () => {
    if (showDeleteConfirm && onDelete) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* Restaurant selector */}
        <Select
          label="Restaurante"
          value={formData.restaurantId}
          onChange={(e) => updateField('restaurantId', e.target.value)}
          options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Seleccionar restaurante"
          disabled={isEditing}
        />

        {/* Title */}
        <Input
          label="Titulo de la tarea"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Ej: Actualizar carta de precios"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Descripcion (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe la tarea con mas detalle..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Area and Subarea */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Area"
            value={formData.areaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Seleccionar area"
          />
          <Select
            label="Subarea"
            value={formData.subareaId}
            onChange={(e) => updateField('subareaId', e.target.value)}
            options={filteredSubareas.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={formData.areaId ? 'Seleccionar subarea' : 'Primero selecciona area'}
            disabled={!formData.areaId}
          />
        </div>

        {/* Owner and Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Responsable (opcional)"
            value={formData.ownerId}
            onChange={(e) => updateField('ownerId', e.target.value)}
            options={[
              { value: '', label: 'Sin asignar' },
              ...profiles.map((p) => ({
                value: p.id,
                label: p.fullName || p.email.split('@')[0],
              })),
            ]}
          />
          <Input
            label="Fecha limite (opcional)"
            type="date"
            value={formData.deadline}
            onChange={(e) => updateField('deadline', e.target.value)}
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <div>
          {isEditing && onDelete && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {showDeleteConfirm ? 'Confirmar eliminacion' : 'Eliminar tarea'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading} isDisabled={!isValid}>
            {isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TaskEditor({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  restaurants,
  areas,
  subareas,
  profiles,
  defaultRestaurantId,
  isLoading = false,
  isDeleting = false,
}: TaskEditorProps) {
  const isEditing = !!task;

  // Default form data
  const getDefaultData = (): FormData => ({
    restaurantId: task?.restaurantId || defaultRestaurantId || '',
    title: task?.title || '',
    description: task?.description || '',
    areaId: task?.areaId || '',
    subareaId: task?.subareaId || '',
    ownerId: task?.ownerId || '',
    deadline: task?.deadline ? task.deadline.split('T')[0] : '',
  });

  // Handle form save
  const handleFormSave = async (formData: FormData) => {
    const input: TaskInput = {
      restaurantId: formData.restaurantId,
      title: formData.title,
      description: formData.description || undefined,
      areaId: formData.areaId,
      subareaId: formData.subareaId,
      ownerId: formData.ownerId || undefined,
      deadline: formData.deadline || undefined,
    };

    await onSave(input);
    onClose();
  };

  // Handle delete
  const handleDelete = async () => {
    if (task && onDelete) {
      await onDelete(task.id);
      onClose();
    }
  };

  // Generate a unique key to force form remount
  const formKey = task?.id || 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
      size="lg"
    >
      <TaskForm
        key={formKey}
        initialData={getDefaultData()}
        restaurants={restaurants}
        areas={areas}
        subareas={subareas}
        profiles={profiles}
        onSave={handleFormSave}
        onCancel={onClose}
        onDelete={isEditing ? handleDelete : undefined}
        isLoading={isLoading}
        isDeleting={isDeleting}
        isEditing={isEditing}
      />
    </Modal>
  );
}
