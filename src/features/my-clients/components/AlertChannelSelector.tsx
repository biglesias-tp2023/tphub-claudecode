import { cn } from '@/utils/cn';

interface AlertChannelSelectorProps {
  slackEnabled: boolean;
  emailEnabled: boolean;
  onSlackChange: (enabled: boolean) => void;
  onEmailChange: (enabled: boolean) => void;
}

export function AlertChannelSelector({
  slackEnabled,
  emailEnabled,
  onSlackChange,
  onEmailChange,
}: AlertChannelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-1">Canal:</span>
      <button
        onClick={() => { onSlackChange(true); onEmailChange(false); }}
        className={cn(
          'px-3 py-1 text-sm rounded-full border transition-colors',
          slackEnabled
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
        )}
      >
        Slack
      </button>
      <button
        onClick={() => { onEmailChange(true); onSlackChange(false); }}
        className={cn(
          'px-3 py-1 text-sm rounded-full border transition-colors',
          emailEnabled
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
        )}
      >
        Email
      </button>
    </div>
  );
}
