import { useApiResource } from '../api/useApiResource.js';
import { CapabilityCard } from './CapabilityCard.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const resource = useApiResource<{ leaderboard: Entry[] }>('/api/leaderboard');

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      {resource.status === 'loading' && <p role="status">Loading leaderboard…</p>}
      {resource.status === 'error' && <p role="alert">Unable to load the leaderboard. Please try again.</p>}
      {resource.status === 'success' && resource.data.leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
      {resource.status === 'success' && resource.data.leaderboard.length > 0 && (
        <table className="table">
          <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
          <tbody>
            {resource.data.leaderboard.map((entry) => (
              <tr key={entry.teamName}><td>{entry.rank}</td><td>{entry.teamName}</td><td>{entry.totalPoints}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </CapabilityCard>
  );
}
