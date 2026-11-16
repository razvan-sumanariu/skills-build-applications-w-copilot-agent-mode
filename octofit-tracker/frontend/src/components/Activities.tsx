import { getJson } from '../api/client.js';
import { useApiResource } from '../api/useApiResource.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };

export default function Activities() {
  const resource = useApiResource(() => getJson<{ activities: Activity[] }>('/api/activities'), []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      {resource.status === 'loading' && <p role="status">Loading activities…</p>}
      {resource.status === 'error' && <p role="alert">Unable to load activities. Please try again.</p>}
      {resource.status === 'success' && resource.data.activities.length === 0 && <p>No activities have been logged yet.</p>}
      {resource.status === 'success' && resource.data.activities.length > 0 && (
        <table className="table">
          <thead><tr><th scope="col">Type</th><th scope="col">Minutes</th><th scope="col">Points</th></tr></thead>
          <tbody>
            {resource.data.activities.map((activity, index) => (
              <tr key={activity._id ?? index}><td>{activity.type}</td><td>{activity.minutes}</td><td>{activity.points}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </CapabilityCard>
  );
}
