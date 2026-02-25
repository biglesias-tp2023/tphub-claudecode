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
    <div className="flex items-center gap-6">
      <span className="text-sm font-medium text-gray-700">Canales:</span>

      {/* Slack */}
      <label className="flex items-center gap-2 cursor-pointer">
        <button
          role="switch"
          aria-checked={slackEnabled}
          onClick={() => onSlackChange(!slackEnabled)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            slackEnabled ? 'bg-primary-600' : 'bg-gray-300'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              slackEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
            )}
          />
        </button>
        <span className="text-sm text-gray-700">Slack</span>
      </label>

      {/* Email */}
      <label className="flex items-center gap-2 cursor-pointer">
        <button
          role="switch"
          aria-checked={emailEnabled}
          onClick={() => onEmailChange(!emailEnabled)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            emailEnabled ? 'bg-primary-600' : 'bg-gray-300'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              emailEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
            )}
          />
        </button>
        <span className="text-sm text-gray-700">Email</span>
      </label>
    </div>
  );
}
