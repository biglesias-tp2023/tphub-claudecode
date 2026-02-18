import { Star, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../config';
import type { CompetitorWithData } from '../types';

interface CompetitorCardProps {
  data: CompetitorWithData;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompetitorCard({ data, onEdit, onDelete }: CompetitorCardProps) {
  const { competitor, snapshot } = data;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{competitor.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${PLATFORM_COLORS[competitor.platform]}20`,
                color: PLATFORM_COLORS[competitor.platform],
              }}
            >
              {PLATFORM_LABELS[competitor.platform]}
            </span>
            {competitor.address && (
              <span className="text-xs text-gray-400 truncate">{competitor.address}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {competitor.externalStoreUrl && (
            <a
              href={competitor.externalStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {snapshot && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-sm font-semibold text-gray-900">
                {snapshot.rating?.toFixed(1) ?? '—'}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Rating</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">
              {snapshot.avgTicket?.toFixed(0) ?? '—'}€
            </span>
            <div className="text-[10px] text-gray-400">Ticket</div>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">
              {snapshot.reviewCount?.toLocaleString() ?? '—'}
            </span>
            <div className="text-[10px] text-gray-400">Reviews</div>
          </div>
        </div>
      )}

      {snapshot && (
        <div className="mt-2 text-[10px] text-gray-400">
          Último snapshot: {new Date(snapshot.snapshotDate).toLocaleDateString('es-ES')}
        </div>
      )}
    </div>
  );
}
