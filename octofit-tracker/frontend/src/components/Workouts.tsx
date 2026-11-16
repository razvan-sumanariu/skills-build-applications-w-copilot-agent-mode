import { getJson } from '../api/client.js';
import { useApiResource } from '../api/useApiResource.js';
import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };

// No authentication in this exercise, so suggestions are requested for a seeded demo user.
const demoUserEmail = 'mona@example.com';

export default function Workouts() {
  const resource = useApiResource(
    () => getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(demoUserEmail)}`),
    [],
  );

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {resource.status === 'loading' && <p role="status">Loading workout suggestions…</p>}
      {resource.status === 'error' && <p role="alert">Unable to load workout suggestions. Please try again.</p>}
      {resource.status === 'success' && resource.data.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
      {resource.status === 'success' && resource.data.suggestions.length > 0 && (
        <>
          <p>Suggested for {demoUserEmail}</p>
          <ul className="list-group">
            {resource.data.suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={suggestion._id ?? index}>
                <strong>{suggestion.title}</strong>
                {suggestion.reason && <p className="mb-0">{suggestion.reason}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </CapabilityCard>
  );
}
