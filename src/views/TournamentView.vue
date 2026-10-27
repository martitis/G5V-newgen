<template>
  <v-container fluid>
    <v-skeleton-loader v-if="loading && !detail" type="card, card" />
    <v-alert v-else-if="!detail" type="warning" variant="tonal">{{
      $t("misc.NotFoundText")
    }}</v-alert>

    <template v-else>
      <TournamentStream
        v-if="info.status === 'running'"
        :key="info.id"
        :tournament-id="info.id"
        @tournament="(next) => (detail = next)"
      />
      <v-card class="mb-4">
        <v-card-text class="d-flex align-center flex-wrap ga-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap ga-2">
              <span class="text-headline-small">{{ info.name }}</span>
              <v-chip size="small" label>{{ $t(`Tournament.${info.format}`) }}</v-chip>
              <v-chip :color="STATUS_COLORS[info.status]" size="small" variant="tonal" label>
                {{ statusLabel }}
              </v-chip>
            </div>
            <div class="text-body-medium text-medium-emphasis mt-1">
              {{ $t("Tournament.TeamsCount", { n: detail.teams.length }) }} · BO{{
                info.settings.best_of
              }}
              / {{ $t("Tournament.FinalBestOf") }} BO{{ info.settings.final_best_of }}
              <template v-if="info.season_id">
                ·
                <router-link :to="`/season/${info.season_id}`" class="app-link">
                  {{ $t("Match.Season") }} #{{ info.season_id }}
                </router-link>
              </template>
              <template v-if="champion">
                · {{ $t("Tournament.Winner") }}: <strong>{{ champion }}</strong></template
              >
            </div>
          </div>
          <div v-if="manageable" class="d-flex flex-wrap ga-2">
            <v-btn
              v-if="info.status === 'draft'"
              color="primary"
              prepend-icon="mdi-flag-checkered"
              @click="confirmStart = true"
            >
              {{ $t("Tournament.Start") }}
            </v-btn>
            <v-btn
              v-if="info.status === 'running'"
              color="primary"
              prepend-icon="mdi-play-box-multiple"
              :loading="startingReady"
              :title="$t('Tournament.StartReadyHint')"
              @click="startReady"
            >
              {{ $t("Tournament.StartReady") }}
            </v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-pencil" @click="editOpen = true">{{
              $t("Tournament.Edit")
            }}</v-btn>
            <v-btn
              variant="tonal"
              color="error"
              icon="mdi-delete"
              :title="$t('misc.Delete')"
              @click="confirmDelete = true"
            />
          </div>
        </v-card-text>
      </v-card>

      <!-- Draft: the seeding the bracket will be built from. -->
      <v-card v-if="info.status === 'draft'" :title="$t('Tournament.Teams')">
        <v-list density="compact">
          <v-list-item v-for="team in detail.teams" :key="team.id" :to="`/teams/${team.id}`">
            <template #prepend>
              <v-chip size="small" label class="mr-3">{{ team.seed }}</v-chip>
            </template>
            <v-list-item-title>{{ team.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <template v-else-if="isElimination">
        <v-card>
          <v-card-text>
            <BracketView
              :nodes="detail.nodes"
              :teams="detail.teams"
              :manageable="manageable"
              @create="openCreate"
            />
          </v-card-text>
        </v-card>
      </template>

      <v-row v-else>
        <v-col cols="12" lg="5">
          <v-card :title="$t('Tournament.Standings')">
            <StandingsTable
              :standings="detail.standings ?? []"
              :teams="detail.teams"
              :buchholz="info.format === 'swiss'"
            />
          </v-card>
        </v-col>
        <v-col cols="12" lg="7">
          <v-card :title="$t('Tournament.Rounds')">
            <v-card-text class="d-flex flex-column ga-4">
              <div v-for="round in groupRounds" :key="round.round">
                <div class="text-title-small mb-2">
                  {{ $t("Tournament.Round", { n: round.round }) }}
                </div>
                <div class="d-flex flex-wrap ga-3">
                  <TournamentNodeCard
                    v-for="node in round.nodes"
                    :key="node.key"
                    :node="node"
                    :teams="detail.teams"
                    :manageable="manageable"
                    @create="openCreate"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <TournamentDialog v-model="editOpen" :detail="detail" @saved="load" />

    <!-- One slot's match on a chosen server. -->
    <v-dialog v-model="createOpen" max-width="480">
      <v-card :title="$t('Tournament.CreateMatch')">
        <v-card-text>
          <div class="text-body-medium mb-3">{{ createLabel }}</div>
          <v-select
            v-model="createServer"
            :items="serverItems"
            :label="$t('Tournament.ChooseServer')"
            :no-data-text="$t('CreateMatch.NoServers')"
          />
          <div v-if="creating" class="text-body-small text-medium-emphasis">
            {{ $t("CreateMatch.Creating") }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="creating" @click="createOpen = false">{{
            $t("misc.Cancel")
          }}</v-btn>
          <v-btn color="primary" :loading="creating" :disabled="!createServer" @click="createOne">
            {{ $t("Tournament.CreateMatch") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmStart" max-width="480">
      <v-card :title="$t('Tournament.Start')" :text="$t('Tournament.StartConfirm')">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmStart = false">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="primary" :loading="busy" @click="start">{{ $t("Tournament.Start") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="confirmDelete" max-width="480">
      <v-card :title="$t('misc.Delete')" :text="$t('Tournament.DeleteConfirm')">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="error" :loading="busy" @click="remove">{{ $t("misc.Delete") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { matches, servers as serversApi, tournaments } from "@/api";
import type { Server, TournamentDetail, TournamentNode } from "@/api/types";
import BracketView from "@/components/tournament/BracketView.vue";
import StandingsTable from "@/components/tournament/StandingsTable.vue";
import TournamentDialog from "@/components/tournament/TournamentDialog.vue";
import TournamentNodeCard from "@/components/tournament/TournamentNodeCard.vue";
import TournamentStream from "@/components/tournament/TournamentStream.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { canCreateMatch, roundLabel } from "@/utils/tournament";

const STATUS_COLORS = { draft: "grey", running: "success", finished: "secondary" } as const;

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

const detail = ref<TournamentDetail | null>(null);
const loading = ref(true);
const busy = ref(false);
const editOpen = ref(false);
const confirmStart = ref(false);
const confirmDelete = ref(false);
const createOpen = ref(false);
const creating = ref(false);
const startingReady = ref(false);
const createNode = ref<TournamentNode | null>(null);
const createServer = ref<number | null>(null);
const freeServers = ref<Server[]>([]);

const info = computed(() => detail.value!.tournament);
const manageable = computed(() => detail.value != null && auth.isAdmin);
const isElimination = computed(() => ["single_elim", "double_elim"].includes(info.value.format));
const statusLabel = computed(
  () =>
    ({
      draft: t("Tournament.StatusDraft"),
      running: t("Tournament.StatusRunning"),
      finished: t("Tournament.StatusFinished")
    })[info.value.status]
);
const teamName = (id: number | null) =>
  detail.value?.teams.find((team) => team.id === id)?.name ?? t("Tournament.TBD");

/** Elimination: the final's winner; groups: the top of the standings once finished. */
const champion = computed(() => {
  const d = detail.value;
  if (!d || d.tournament.status !== "finished") return "";
  const final = d.nodes.find((node) => node.final && node.winner_id != null);
  if (final) return teamName(final.winner_id);
  return d.standings?.[0] ? teamName(d.standings[0].team_id) : "";
});

const groupRounds = computed(() => {
  const nodes = detail.value?.nodes ?? [];
  const rounds = [...new Set(nodes.map((node) => node.round))].sort((a, b) => b - a);
  return rounds.map((round) => ({
    round,
    nodes: nodes.filter((node) => node.round === round && node.status !== "empty")
  }));
});

const serverItems = computed(() =>
  freeServers.value.map((server) => ({ value: server.id, title: server.display_name }))
);
const createLabel = computed(() =>
  createNode.value
    ? `${teamName(createNode.value.team1_id)} vs ${teamName(createNode.value.team2_id)}`
    : ""
);

let requestId = 0;
async function load() {
  const id = ++requestId;
  try {
    await auth.load();
    const result = await tournaments.get(String(route.params.id));
    if (id === requestId) detail.value = result;
  } catch (error) {
    if (id === requestId) {
      detail.value = null;
      ui.notifyError(error);
    }
  } finally {
    if (id === requestId) loading.value = false;
  }
}

/** The match for a slot, with the tournament's settings. */
function matchBody(node: TournamentNode, serverId: number) {
  const d = detail.value!;
  const settings = d.tournament.settings;
  const upperRounds = Math.max(
    0,
    ...d.nodes.filter((n) => n.bracket === "upper").map((n) => n.round)
  );
  return {
    server_id: serverId,
    team1_id: node.team1_id,
    team2_id: node.team2_id,
    tournament_match_id: node.id,
    title: `${d.tournament.name} · ${roundLabel(node.bracket, node.round, upperRounds, t)}`,
    start_time: new Date().toISOString().slice(0, 19).replace("T", " "),
    max_maps: node.best_of,
    veto_mappool: settings.map_pool.join(" "),
    skip_veto: settings.skip_veto,
    side_type: settings.side_type,
    players_per_team: settings.players_per_team,
    min_players_to_ready: settings.min_players_to_ready,
    min_spectators_to_ready: 0,
    season_id: d.tournament.season_id
  };
}

/** The user's free servers first, then public ones (as on create match). */
async function loadServers() {
  const list = await serversApi.available();
  freeServers.value = [...list].sort(
    (a, b) =>
      Number(b.user_id === auth.user?.id) - Number(a.user_id === auth.user?.id) ||
      Number(b.public_server) - Number(a.public_server)
  );
}

async function openCreate(node: TournamentNode) {
  createNode.value = node;
  try {
    await loadServers();
    createServer.value = freeServers.value[0]?.id ?? null;
    createOpen.value = true;
  } catch (error) {
    ui.notifyError(error);
  }
}

async function createOne() {
  if (!createNode.value || !createServer.value) return;
  creating.value = true;
  try {
    const result = await matches.create(matchBody(createNode.value, createServer.value));
    ui.notify(t("CreateMatch.MessageRegisterSuccess"), "success");
    createOpen.value = false;
    await router.push(`/match/${result.id}`);
  } catch (error) {
    ui.notifyError(error);
  } finally {
    creating.value = false;
  }
}

/** Every ready slot without a match goes onto the next free server. */
async function startReady() {
  const ready = (detail.value?.nodes ?? []).filter(canCreateMatch);
  if (!ready.length) {
    ui.notify(t("Tournament.NothingReady"), "info");
    return;
  }
  startingReady.value = true;
  try {
    await loadServers();
    const queue = [...freeServers.value];
    let started = 0;
    for (const node of ready) {
      const server = queue.shift();
      if (!server) break;
      try {
        await matches.create(matchBody(node, server.id));
        started++;
      } catch (error) {
        // That server refused (offline or a match already loaded); the slot stays ready for the next run.
        ui.notifyError(error);
      }
    }
    if (started) ui.notify(t("Tournament.Started", { n: started }), "success");
    const waiting = ready.length - started;
    if (waiting > 0) ui.notify(t("Tournament.NoFreeServer", { n: waiting }), "warning");
    await load();
  } finally {
    startingReady.value = false;
  }
}

async function start() {
  busy.value = true;
  try {
    await tournaments.start(info.value.id);
    confirmStart.value = false;
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

async function remove() {
  busy.value = true;
  try {
    await tournaments.remove(info.value.id);
    ui.notify(t("Tournament.Deleted"), "success");
    await router.push("/tournaments");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

watch(
  () => route.params.id,
  () => {
    loading.value = true;
    void load();
  },
  { immediate: true }
);
</script>
