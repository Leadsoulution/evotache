import { db } from "@/lib/db";

/** Adds/removes userId from every team's memberIds to match the requested set — same logic the old client-side syncTeamMembership() did, now run server-side in one request instead of N nested fetches. */
export async function syncTeamMembership(userId: string, teamIds: string[]): Promise<void> {
  const allTeams = await db.team.findMany();
  await Promise.all(
    allTeams.map((team) => {
      const shouldBeMember = teamIds.includes(team.id);
      const isMember = team.memberIds.includes(userId);
      if (shouldBeMember === isMember) return Promise.resolve();
      const memberIds = shouldBeMember ? [...team.memberIds, userId] : team.memberIds.filter((id) => id !== userId);
      return db.team.update({ where: { id: team.id }, data: { memberIds } });
    })
  );
}
