import { useState, useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react';
import { Modal, Input, Button, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import { CATEGORIES, RESPONSIBLES } from '../config';
import type {
  StrategicTask,
  StrategicTaskInput,
  StrategicObjective,
  Restaurant,
  Profile,
  ObjectiveCategory,
  ObjectiveResponsible,
} from '@/types';

interface StrategicTaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: StrategicTaskInput) => Promise<void>;
  task?: StrategicTask;
  objectives: StrategicObjective[];
  restaurants: Restaurant[];
  profiles: Profile[];
  defaultRestaurantId?: string;
  defaultObjectiveId?: string;
  isLoading?: boolean;
}

/**
 * Modal editor for creating/editing strategic tasks
 */
export function StrategicTaskEditor({
  isOpen,
  onClose,
  onSave,
  task,
  objectives,
  restaurants,
  profiles,
  defaultRestaurantId,
  defaultObjectiveId,
  isLoading,
}: StrategicTaskEditorProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [category, setCategory] = useState<ObjectiveCategory>('operaciones');
  const [responsible, setResponsible] = useState<ObjectiveResponsible>('thinkpaladar');
  const [assigneeId, setAssigneeId] = useState('');
  const [clientName, setClientName] = useState('');
  const [deadline, setDeadline] = useState('');

  // Ref for date input to trigger native picker
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Editing existing task
        setTitle(task.title);
        setDescription(task.description || '');
        setObjectiveId(task.objectiveId);
        setRestaurantId(task.restaurantId);
        setCategory(task.category);
        setResponsible(task.responsible);
        setAssigneeId(task.assigneeId || '');
        setClientName(task.clientName || '');
        setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      } else {
        // Creating new task
        setTitle('');
        setDescription('');
        setObjectiveId(defaultObjectiveId || '');
        setRestaurantId(defaultRestaurantId || '');
        setCategory('operaciones');
        setResponsible('thinkpaladar');
        setAssigneeId('');
        setClientName('');
        setDeadline('');
      }
    }
  }, [isOpen, task, defaultRestaurantId, defaultObjectiveId]);

  // When objective changes, update category and restaurant
  useEffect(() => {
    if (objectiveId && !isEditing) {
      const objective = objectives.find((o) => o.id === objectiveId);
      if (objective) {
        setCategory(objective.category);
        setRestaurantId(objective.restaurantId);
      }
    }
  }, [objectiveId, objectives, isEditing]);

  // Handle save
  const handleSave = async () => {
    if (!title.trim() || !objectiveId || !restaurantId) return;

    await onSave({
      objectiveId,
      restaurantId,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      responsible,
      assigneeId: assigneeId || undefined,
      clientName: responsible === 'cliente' ? clientName.trim() || undefined : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });

    onClose();
  };

  // Open date picker when clicking anywhere on the date container
  const handleDateContainerClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.focus();
    }
  };

  // Build options for selects
  const restaurantOptions = restaurants.map((r) => ({ value: r.id, label: r.name }));

  const objectiveOptions = objectives
    .filter((o) => !restaurantId || o.restaurantId === restaurantId)
    .map((o) => ({ value: o.id, label: o.title }));

  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.id,
    label: c.label,
  }));

  const responsibleOptions = RESPONSIBLES.map((r) => ({
    value: r.id,
    label: r.label,
  }));

  const assigneeOptions = [
    { value: '', label: 'Sin asignar' },
    ...profiles.map((p) => ({ value: p.id, label: p.fullName || p.email })),
  ];

  const isValid = title.trim() && objectiveId && restaurantId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Restaurant selector */}
          <Select
            label="Restaurante"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            options={restaurantOptions}
            placeholder="Seleccionar restaurante"
            disabled={isEditing}
          />

          {/* Objective selector */}
          <Select
            label="Objetivo vinculado"
            value={objectiveId}
            onChange={(e) => setObjectiveId(e.target.value)}
            options={objectiveOptions}
            placeholder="Seleccionar objetivo"
            disabled={isEditing || !restaurantId}
          />

          {/* Title */}
          <Input
            label="Título de la tarea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Revisar escandallos actuales"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Categoría
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((opt) => {
                const catConfig = CATEGORIES.find((c) => c.id === opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value as ObjectiveCategory)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      category === opt.value
                        ? cn(catConfig?.bgColor, catConfig?.textColor, catConfig?.borderColor)
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsible */}
          <Select
            label="Responsable"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value as ObjectiveResponsible)}
            options={responsibleOptions}
          />

          {/* Assignee (for ThinkPaladar tasks) */}
          {responsible === 'thinkpaladar' && (
            <Select
              label="Asignar a (ThinkPaladar)"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              options={assigneeOptions}
            />
          )}

          {/* Client name (for client tasks) */}
          {responsible === 'cliente' && (
            <Input
              label="Nombre del contacto (opcional)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Ana García"
            />
          )}

          {/* Deadline - clickable container */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Fecha límite
            </label>
            <div
              onClick={handleDateContainerClick}
              className="relative cursor-pointer"
            >
              <input
                ref={dateInputRef}
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm cursor-pointer"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
