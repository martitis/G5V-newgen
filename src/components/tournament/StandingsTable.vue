<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th class="text-left">#</th>
        <th class="text-left">{{ $t("Team.Name") }}</th>
        <th class="text-right">{{ $t("Tournament.W") }}</th>
        <th class="text-right">{{ $t("Tournament.L") }}</th>
        <th class="text-right">{{ $t("Tournament.MapDiff") }}</th>
        <th v-if="buchholz" class="text-right">{{ $t("Tournament.Buchholz") }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, index) in standings"
        :key="row.team_id"
        :class="{ qualified: qualify != null && index < qualify }"
      >
        <td>{{ index + 1 }}</td>
        <td>
          <div class="d-flex align-center ga-2">
            <TeamLogo :logo="teamOf(row.team_id)?.logo" :size="20" />
            <router-link :to="`/teams/${row.team_id}`" class="app-link">
              {{ teamOf(row.team_id)?.name ?? `#${row.team_id}` }}
            </router-link>
          </div>
        </td>
        <td class="text-right font-weight-medium">{{ row.wins }}</td>
        <td class="text-right">{{ row.losses }}</td>
        <td class="text-right">{{ diff(row) }}</td>
        <td v-if="buchholz" class="text-right">{{ row.buchholz }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { TournamentDetail, TournamentStanding } from "@/api/types";
import TeamLogo from "@/components/TeamLogo.vue";

const props = defineProps<{
  standings: TournamentStanding[];
  teams: TournamentDetail["teams"];
  /** Swiss shows the Buchholz tiebreak. */
  buchholz?: boolean;
  /** Groups: the top rows that go to the playoff are marked. */
  qualify?: number;
}>();

const teamOf = (id: number) => props.teams.find((team) => team.id === id);
const diff = (row: TournamentStanding) => {
  const value = row.maps_won - row.maps_lost;
  return value > 0 ? `+${value}` : String(value);
};
</script>

<style scoped>
.qualified td:first-child {
  box-shadow: inset 3px 0 rgb(var(--v-theme-success));
}
</style>
