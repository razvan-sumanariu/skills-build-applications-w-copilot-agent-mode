import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function requireObjectId(value: unknown, field: string) {
  if (typeof value !== 'string' || !objectIdPattern.test(value)) {
    throw httpError(400, `${field} must be a valid ID`);
  }
  return value;
}

export async function createActivity(input: unknown) {
  const body = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const userId = requireObjectId(body.userId, 'userId');
  const teamId = requireObjectId(body.teamId, 'teamId');
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (!type) throw httpError(400, 'type is required');
  const minutes = body.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError(400, 'minutes must be a number of at least 1');
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  return Activity.create({ user: userId, team: teamId, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw httpError(400, 'name is required');
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  if (!mascot) throw httpError(400, 'mascot is required');

  const rawMembers = body.members ?? [];
  if (!Array.isArray(rawMembers)) throw httpError(400, 'members must be an array of user IDs');
  const members = [...new Set(rawMembers.map((member) => requireObjectId(member, 'members')))];
  if (members.length > 0 && (await User.countDocuments({ _id: { $in: members } })) !== members.length) {
    throw httpError(404, 'One or more members were not found');
  }

  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const totals = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        let: { teamId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$team', '$$teamId'] } } },
          { $group: { _id: null, total: { $sum: '$points' } } },
        ],
        as: 'totals',
      },
    },
    { $project: { _id: 0, teamName: '$name', totalPoints: { $ifNull: [{ $arrayElemAt: ['$totals.total', 0] }, 0] } } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

const activityFocus: Record<string, string> = {
  run: 'endurance',
  cycle: 'endurance',
  swim: 'endurance',
  walk: 'endurance',
  strength: 'strength',
  lift: 'strength',
  yoga: 'mobility',
  stretch: 'mobility',
};

export async function suggestWorkouts(userEmail: string) {
  const email = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw httpError(404, 'User not found');

  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean();
  const byFocus = new Map<string, { minutes: number; type: string }>();
  for (const activity of recent) {
    const type = activity.type.toLowerCase();
    const focus = activityFocus[type] ?? type;
    const entry = byFocus.get(focus);
    if (entry) entry.minutes += activity.minutes;
    else byFocus.set(focus, { minutes: activity.minutes, type });
  }

  const goal = user.fitnessGoal.toLowerCase();
  const priorities = [...byFocus.keys()].sort((a, b) => byFocus.get(b)!.minutes - byFocus.get(a)!.minutes);
  if (!priorities.includes(goal)) priorities.push(goal);

  const reasonFor = (focus: string) => {
    const pattern = byFocus.get(focus);
    const fromActivity = pattern ? `your recent ${pattern.type} activity` : '';
    const fromGoal = focus === goal ? `your ${user.fitnessGoal} goal` : '';
    return `Based on ${[fromActivity, fromGoal].filter(Boolean).join(' and ')}`;
  };

  const workouts = await Workout.find().lean();
  return workouts
    .map((workout) => ({ workout, priority: priorities.indexOf(workout.focus.toLowerCase()) }))
    .filter(({ priority }) => priority >= 0)
    .sort((a, b) => a.priority - b.priority || a.workout.title.localeCompare(b.workout.title))
    .map(({ workout }) => ({ ...workout, reason: reasonFor(workout.focus.toLowerCase()) }));
}

export { User };
