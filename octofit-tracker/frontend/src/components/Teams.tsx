import { getJson } from '../api/client.js';
import { useApiResource } from '../api/useApiResource.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { _id?: string; name: string; mascot?: string; members?: string[] };

export default function Teams() {
  const resource = useApiResource(() => getJson<{ teams: Team[] }>('/api/teams'), []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {resource.status === 'loading' && <p role="status">Loading teams…</p>}
      {resource.status === 'error' && <p role="alert">Unable to load teams. Please try again.</p>}
      {resource.status === 'success' && resource.data.teams.length === 0 && <p>No teams have been created yet.</p>}
      {resource.status === 'success' && resource.data.teams.length > 0 && (
        <ul className="list-group">
          {resource.data.teams.map((team, index) => {
            const memberCount = team.members?.length ?? 0;
            return (
              <li className="list-group-item" key={team._id ?? index}>
                <strong>{team.name}</strong>
                {team.mascot && <span> · Mascot: {team.mascot}</span>}
                <span> · {memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </CapabilityCard>
  );
}
