<template>
  <v-dialog v-model="open" max-width="560">
    <v-card v-if="node && detail" :title="$t('Tournament.EditSlot')" :subtitle="label">
      <v-card-text class="d-flex flex-column ga-4">
        <!-- The two teams: only while no match decides the slot. -->
        <section>
          <div class="text-title-small mb-2">{{ $t("Tournament.SlotTeams") }}</div>
          <template v-if="node.match_id == null">
            <div class="d-flex flex-wrap ga-3">
              <v-select
                v-model="team1"
                :items="teamItems"
                :label="$t('Tournament.SlotTeam', { n: 1 })"
                class="team-select"
                hide-details
              />
              <v-select
                v-model="team2"
                :items="teamItems"
                :label="$t('Tournament.SlotTeam', { n: 2 })"
                class="team-select"
                hide-details
              />
            </div>
            <div class="text-body-small text-medium-emphasis mt-2">
              {{ $t("Tournament.SlotTeamsHint") }}
            </div>
            <div class="d-flex flex-wrap ga-2 mt-3">
              <v-btn
                color="primary"
                variant="tonal"
                :loading="busy === 'teams'"
                :disabled="busy != null || !teamsChanged || sameTeam"
                @click="saveTeams"
              >
                {{ $t("Tournament.SaveTeams") }}
              </v-btn>
              <v-btn
                v-if="node.manual"
                variant="text"
                prepend-icon="mdi-restore"
                :loading="busy === 'reset'"
                :disabled="busy != null"
                @click="resetTeams"
              >
                {{ $t("Tournament.ResetTeams") }}
              </v-btn>
            </div>
            <div v-if="sameTeam" class="text-body-small text-error mt-1">
              {{ $t("Tournament.SameTeam") }}
            </div>
          </template>
          <div v-else class="text-body-medium text-medium-emphasis">
            {{ $t("Tournament.UnlinkFirst") }}
          </div>
        </section>

        <v-divider />

        <!-- The match that decides the slot: link one created by hand, or unlink. -->
        <section>
          <div class="text-title-small mb-2">{{ $t("Tournament.SlotMatch") }}</div>
          <template v-if="node.match_id != null">
            <div class="d-flex align-center flex-wrap ga-2">
              <router-link :to="`/match/${node.match_id}`" class="app-link">
                {{ $t("Tournament.MatchNumber", { id: node.match_id }) }}
              </router-link>
              <v-spacer />
              <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-link-off"
                :loading="busy === 'unlink'"
                :disabled="busy != null"
                @click="unlink"
              >
                {{ $t("Tournament.Unlink") }}
              </v-btn>
            </div>
            <div class="text-body-small text-medium-emphasis mt-2">
              {{ $t("Tournament.UnlinkHint") }}
            </div>
          </template>
          <template v-else-if="node.status === 'ready'">
            <v-autocomplete
              v-model="linkMatch"
              :items="candidateItems"
              :loading="loadingCandidates"
              :label="$t('Tournament.ChooseMatch')"
              :no-data-text="$t('Tournament.NoCandidates')"
              hide-details
            />
            <div class="text-body-small text-medium-emphasis mt-2">
              {{ $t("Tournament.LinkHint") }}
            </div>
            <v-btn
              class="mt-3"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-link"
              :loading="busy === 'link'"
              :disabled="busy != null || linkMatch == null"
              @click="link"
            >
              {{ $t("Tournament.Link") }}
            </v-btn>
          </template>
          <div v-else class="text-body-medium text-medium-emphasis">
            {{ $t("Tournament.LinkNotReady") }}
          </div>
        </section>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ $t("misc.Close") }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { matches, tournaments } from "@/api";
import type { MatchSummary, TournamentDetail, TournamentNode } from "@/api/types";
import { useUiStore } from "@/stores/ui";

/** Admin edit of one bracket slot: its teams (while unplayed) and the match linked to it. */
const props = defineProps<{
  node: TournamentNode | null;
  detail: TournamentDetail | null;
}>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>({ default: false });
const { t } = useI18n();
const ui = useUiStore();

const team1 = ref<number | null>(null);
const team2 = ref<number | null>(null);
const linkMatch = ref<number | null>(null);
const candidates = ref<MatchSummary[]>([]);
const loadingCandidates = ref(false);
const busy = ref<"teams" | "reset" | "link" | "unlink" | null>(null);

const teamName = (id: number | null) =>
  id == null
    ? t("Tournament.Bye")
    : (props.detail?.teams.find((team) => team.id === id)?.name ?? `#${id}`);
const label = computed(() =>
  props.node ? `${teamName(props.node.team1_id)} vs ${teamName(props.node.team2_id)}` : ""
);

/** Tournament teams that can be placed: not disqualified, and from the slot's own group. */
const teamItems = computed(() => {
  const d = props.detail;
  if (!d || !props.node) return [];
  const group = props.node.group;
  const members =
    group != null
      ? new Set(
          d.groups?.find((entry) => entry.group === group)?.standings.map((row) => row.team_id)
        )
      : null;
  const teams = d.teams.filter((team) => !team.disqualified && (!members || members.has(team.id)));
  return [
    { value: null, title: t("Tournament.NobodyBye") },
    ...teams.map((team) => ({ value: team.id, title: `${team.seed}. ${team.name}` }))
  ];
});
const teamsChanged = computed(
  () => team1.value !== props.node?.team1_id || team2.value !== props.node?.team2_id
);
const sameTeam = computed(() => team1.value != null && team1.value === team2.value);

const candidateItems = computed(() =>
  candidates.value.map((match) => ({
    value: match.id,
    title: `#${match.id} · ${match.team1.name} vs ${match.team2.name}${match.title ? ` · ${match.title}` : ""}`
  }))
);

/** Matches of the slot's two teams that aren't cancelled (the API checks they're not linked elsewhere). */
async function loadCandidates(node: TournamentNode) {
  if (node.status !== "ready" || node.match_id != null || node.team1_id == null) return;
  loadingCandidates.value = true;
  try {
    const result = await matches.summary({ status: "all", team_id: node.team1_id, limit: 100 });
    const pair = new Set([node.team1_id, node.team2_id]);
    candidates.value = result.matches.filter(
      (match) =>
        match.status !== "cancelled" &&
        match.team1.id !== match.team2.id &&
        pair.has(match.team1.id!) &&
        pair.has(match.team2.id!)
    );
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loadingCandidates.value = false;
  }
}

watch(
  () => [open.value, props.node] as const,
  ([isOpen, node]) => {
    if (!isOpen || !node) return;
    team1.value = node.team1_id;
    team2.value = node.team2_id;
    linkMatch.value = null;
    candidates.value = [];
    void loadCandidates(node);
  },
  { immediate: true }
);

async function run(kind: NonNullable<typeof busy.value>, action: () => Promise<unknown>) {
  if (busy.value || !props.node || !props.detail) return;
  busy.value = kind;
  try {
    await action();
    ui.notify(t("Tournament.SlotSaved"), "success");
    open.value = false;
    emit("saved");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = null;
  }
}

const tournamentId = () => props.detail!.tournament.id;
const saveTeams = () =>
  run("teams", () =>
    tournaments.setNodeTeams(tournamentId(), props.node!.id, {
      team1_id: team1.value,
      team2_id: team2.value
    })
  );
const resetTeams = () =>
  run("reset", () => tournaments.setNodeTeams(tournamentId(), props.node!.id, { reset: true }));
const link = () =>
  run("link", () => tournaments.setNodeMatch(tournamentId(), props.node!.id, linkMatch.value));
const unlink = () =>
  run("unlink", () => tournaments.setNodeMatch(tournamentId(), props.node!.id, null));
</script>

<style scoped>
.team-select {
  flex: 1 1 200px;
}
</style>
