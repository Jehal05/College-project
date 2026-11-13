import { useEmergencies } from './EmergencyProvider.jsx';

/**
 * Hidden live regions for screen readers (A4). New EMERGENCY alerts are announced at once (assertive),
 * everything else politely. Only one message is shown at a time; a changed id makes the reader say it again.
 */
export default function AlertAnnouncer() {
  const { announcement } = useEmergencies();
  const assertive = announcement?.politeness === 'assertive' ? announcement.text : '';
  const polite = announcement && announcement.politeness !== 'assertive' ? announcement.text : '';
  return (
    <div className="sr-only">
      <div data-testid="live-assertive" aria-live="assertive" aria-atomic="true">{assertive}</div>
      <div data-testid="live-polite" role="status" aria-live="polite" aria-atomic="true">{polite}</div>
    </div>
  );
}
