<template>
  <v-dialog v-model="show" max-width="960" scrollable :fullscreen="smAndDown" persistent>
    <v-card :title="detail ? $t('Tournament.Edit') : $t('Tournament.New')">
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="article, article" />
        <v-form v-else ref="form" @submit.prevent="save">
          <v-row density="compact">
            <v-col cols="12" md="7">
              <v-text-field
                v-model="draft.name"
                :label="$t('Tournament.Name')"
                :rules="[(v: string) => !!v?.trim() || $t('misc.Required')]"
                counter="100"
                autofocus
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="draft.season_id"
                :items="seasonItems"
                :label="$t('CreateMatch.SeasonLabel')"
              />
            </v-col>
          </v-row>

          <div class="text-body-medium mb-2">{{ $t("Tournament.Format") }}</div>
          <v-item-group
            v-model="draft.format"
            mandatory
            :disabled="started"
            class="format-grid mb-4"
          >
            <v-item
              v-for="format in FORMATS"
              :key="format"
              v-slot="{ isSelected, toggle }"
              :value="format"
            >
              <v-card
                :color="isSelected ? 'primary' : undefined"
                :variant="isSelected ? 'tonal' : 'outlined'"
                :disabled="started"
                class="pa-3 h-100"
                @click="toggle"
              >
                <div class="text-title-small">{{ $t(`Tournament.${format}`) }}</div>
                <div class="text-body-small text-medium-emphasis">
                  {{ $t(`Tournament.${format}Hint`) }}
                </div>
              </v-card>
            </v-item>
          </v-item-group>

          <div class="d-flex align-center flex-wrap ga-2 mb-2">
            <span class="text-body-medium">{{ $t("Tournament.Teams") }}</span>
            <v-chip size="x-small" variant="tonal" label>{{ draft.team_ids.length }}</v-chip>
            <v-spacer />
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-shuffle-variant"
              :disabled="started || draft.team_ids.length < 2"
              @click="shuffle"
            >
              {{ $t("Tournament.Shuffle") }}
            </v-btn>
          </div>
          <v-autocomplete
            v-if="!started"
            :model-value="null"
            :items="teamChoices"
            :label="$t('Tournament.AddTeam')"
            prepend-inner-icon="mdi-plus"
            density="compact"
            clearable
            @update:model-value="addTeam"
          />
          <v-list density="compact" class="seed-list mb-2">
            <v-list-item v-for="(teamId, index) in draft.team_ids" :key="teamId">
              <template #prepend>
                <v-chip size="small" label class="mr-3">{{ index + 1 }}</v-chip>
              </template>
              <v-list-item-title>{{ teamName(teamId) }}</v-list-item-title>
              <template v-if="!started" #append>
                <v-btn
                  icon="mdi-arrow-up"
                  size="x-small"
                  variant="text"
                  :disabled="index === 0"
                  @click="move(index, -1)"
                />
                <v-btn
                  icon="mdi-arrow-down"
                  size="x-small"
                  variant="text"
                  :disabled="index === draft.team_ids.length - 1"
                  @click="move(index, 1)"
                />
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  @click="draft.team_ids.splice(index, 1)"
                />
              </template>
            </v-list-item>
          </v-list>
          <div v-if="teamError" class="text-error text-body-small mb-2">{{ teamError }}</div>

          <v-divider class="my-4" />
          <div class="text-title-small mb-2">{{ $t("Tournament.MatchSettings") }}</div>
          <v-row density="compact">
            <v-col cols="6" sm="3">
              <v-select
                v-model="settings.best_of"
                :items="BEST_OF"
                :label="$t('Tournament.BestOf')"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="settings.final_best_of"
                :items="BEST_OF"
                :label="$t('Tournament.FinalBestOf')"
              />
            </v-col>
            <v-col v-if="draft.format === 'swiss'" cols="12" sm="6">
              <v-number-input
                v-model="settings.swiss_rounds"
                :label="$t('Tournament.SwissRounds')"
                :hint="$t('Tournament.SwissRoundsHint')"
                persistent-hint
                :min="1"
                :max="10"
                clearable
                control-variant="split"
              />
            </v-col>
          </v-row>
          <v-row v-if="draft.format === 'groups_playoff'" density="compact">
            <v-col cols="6" sm="3">
              <v-number-input
                v-model="settings.group_count"
                :label="$t('Tournament.GroupCount')"
                :min="1"
                :max="16"
                control-variant="split"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-number-input
                v-model="settings.group_advance"
                :label="$t('Tournament.GroupAdvance')"
                :min="1"
                :max="16"
                control-variant="split"
              />
            </v-col>
            <v-col cols="12" sm="6" class="d-flex align-center">
              <span class="text-body-small text-medium-emphasis">{{ groupSummary }}</span>
            </v-col>
          </v-row>
          <v-row density="compact">
            <v-col cols="12" sm="4">
              <v-number-input
                v-model="settings.players_per_team"
                :label="$t('CreateMatch.PlayersPerTeam')"
                :min="1"
                :max="10"
                control-variant="split"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-number-input
                v-model="settings.min_players_to_ready"
                :label="$t('CreateMatch.ReadyPerTeam')"
                :min="1"
                :max="settings.players_per_team || 10"
                control-variant="split"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="settings.side_type"
                :items="sideTypeItems"
                :label="$t('Veto.SidePick')"
              />
            </v-col>
          </v-row>
          <v-switch
            v-model="settings.skip_veto"
            :label="$t('CreateMatch.SkipVeto')"
            color="primary"
            hide-details
          />
          <v-text-field
            v-model="settings.challonge_url"
            :label="$t('Tournament.ChallongeUrl')"
            :hint="$t('Tournament.ChallongeHint')"
            persistent-hint
            :rules="[challongeRule]"
            prepend-inner-icon="mdi-tournament"
            clearable
            class="mt-3"
          />
          <MapPoolPicker
            v-model="settings.map_pool"
            :maps="mapList"
            :error="mapPoolError"
            class="mt-2"
          />
          <button type="submit" hidden />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="show = false">{{ $t("misc.Cancel") }}</v-btn>
        <v-btn color="primary" :loading="busy" :disabled="loading" @click="save">{{
          $t("misc.Save")
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { maps, seasons as seasonsApi, teams as teamsApi, tournaments } from "@/api";
import type {
  MapListEntry,
  Season,
  Team,
  TournamentDetail,
  TournamentFormat,
  TournamentSettings
} from "@/api/types";
import MapPoolPicker from "@/components/MapPoolPicker.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const FORMATS: TournamentFormat[] = [
  "single_elim",
  "double_elim",
  "round_robin",
  "swiss",
  "groups_playoff"
];
const BEST_OF = [1, 2, 3, 5, 7].map((n) => ({ value: n, title: `BO${n}` }));

const show = defineModel<boolean>({ default: false });
/** The tournament to edit, or null to create one. */
const props = defineProps<{ detail: TournamentDetail | null }>();
const emit = defineEmits<{ saved: [id: number] }>();

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();
const { smAndDown } = useDisplay();
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const loading = ref(false);
const busy = ref(false);
const allTeams = ref<Team[]>([]);
const seasonList = ref<Season[]>([]);
const mapList = ref<MapListEntry[]>([]);

const draft = reactive({
  name: "",
  format: "single_elim" as TournamentFormat,
  season_id: null as number | null,
  team_ids: [] as number[]
});
const settings = reactive<TournamentSettings>({
  best_of: 1,
  final_best_of: 3,
  swiss_rounds: undefined,
  group_count: 2,
  group_advance: 2,
  map_pool: [],
  players_per_team: 5,
  min_players_to_ready: 5,
  side_type: "standard",
  skip_veto: false,
  challonge_url: undefined
});

/** A Challonge tournament id ("abc123", "sub-abc123"); a pasted challonge.com link is cut down to it. */
const challongeRule = (value: string | null | undefined) =>
  !value || /^[A-Za-z0-9_-]{1,100}$/.test(challongeId(value)) || t("Tournament.ChallongeInvalid");
function challongeId(value: string) {
  const link =
    /^https?:\/\/(?:([A-Za-z0-9-]+)\.)?challonge\.com\/(?:[a-z]{2}\/)?([A-Za-z0-9_]+)\/?$/.exec(
      value.trim()
    );
  if (!link) return value.trim();
  return link[1] && link[1] !== "www" ? `${link[1]}-${link[2]}` : link[2];
}

/** Teams and format are fixed once the bracket exists. */
const started = computed(() => props.detail != null && props.detail.tournament.status !== "draft");

watch(show, async (open) => {
  if (!open) return;
  loading.value = true;
  const existing = props.detail;
  Object.assign(draft, {
    name: existing?.tournament.name ?? "",
    format: existing?.tournament.format ?? "single_elim",
    season_id: existing?.tournament.season_id ?? null,
    team_ids: existing?.teams.map((team) => team.id) ?? []
  });
  Object.assign(settings, {
    best_of: 1,
    final_best_of: 3,
    swiss_rounds: undefined,
    group_count: 2,
    group_advance: 2,
    map_pool: [],
    players_per_team: 5,
    min_players_to_ready: 5,
    side_type: "standard",
    skip_veto: false,
    challonge_url: undefined,
    ...(existing?.tournament.settings ?? {})
  });
  try {
    const [teamList, seasons, mapsList] = await Promise.all([
      teamsApi.all(),
      seasonsApi.all(),
      auth.user?.id != null ? maps.enabled(auth.user.id) : Promise.resolve([])
    ]);
    allTeams.value = teamList;
    seasonList.value = seasons;
    mapList.value = mapsList;
    // A new tournament starts with the whole map pool selected.
    if (!existing && !settings.map_pool.length)
      settings.map_pool = mapsList.map((map) => map.map_name);
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loading.value = false;
  }
});

const teamName = (id: number) =>
  allTeams.value.find((team) => team.id === id)?.name ??
  props.detail?.teams.find((team) => team.id === id)?.name ??
  `#${id}`;
const teamChoices = computed(() =>
  allTeams.value
    .filter((team) => !draft.team_ids.includes(team.id))
    .map((team) => ({ value: team.id, title: team.tag ? `${team.name} [${team.tag}]` : team.name }))
);
const seasonItems = computed(() => [
  { value: null, title: t("CreateMatch.NoSeason") },
  ...seasonList.value.map((season) => ({ value: season.id, title: season.name }))
]);
const sideTypeItems = computed(() => [
  { value: "standard", title: t("CreateMatch.KnifeDefault") },
  { value: "never_knife", title: t("CreateMatch.KnifeNever") },
  { value: "always_knife", title: t("CreateMatch.KnifeAlways") }
]);

/** Groups + playoff: the same rules as the API (every group plays, the playoff has 2+ teams). */
const groupError = computed(() => {
  if (draft.format !== "groups_playoff") return "";
  const count = draft.team_ids.length;
  const groups = settings.group_count ?? 1;
  const advance = settings.group_advance ?? 1;
  if (count < groups * 2) return t("Tournament.GroupTooSmall");
  if (advance > Math.floor(count / groups)) {
    return t("Tournament.AdvanceTooMany", { n: Math.floor(count / groups) });
  }
  if (groups * advance < 2) return t("Tournament.PlayoffTooSmall");
  return "";
});
const teamError = computed(() =>
  draft.team_ids.length < 2 ? t("Tournament.MinTeams") : groupError.value
);
/** "2 groups of 3 · top 2 of each → playoff of 4 teams" */
const groupSummary = computed(() => {
  const count = draft.team_ids.length;
  const groups = settings.group_count ?? 1;
  const advance = settings.group_advance ?? 1;
  if (!count || groupError.value) return groupError.value;
  const small = Math.floor(count / groups);
  const size = count % groups ? `${small}-${small + 1}` : String(small);
  return t("Tournament.GroupSummary", { groups, size, advance, playoff: groups * advance });
});
const mapPoolError = computed(() => {
  if (!settings.map_pool.length) return t("CreateMatch.MapChoiceError");
  if (settings.map_pool.length < Math.max(settings.best_of, settings.final_best_of)) {
    return t("CreateMatch.MapNotEnough");
  }
  return "";
});

function addTeam(id: number | null) {
  if (id != null && !draft.team_ids.includes(id)) draft.team_ids.push(id);
}
function move(index: number, by: number) {
  const [id] = draft.team_ids.splice(index, 1);
  draft.team_ids.splice(index + by, 0, id);
}
function shuffle() {
  const ids = [...draft.team_ids];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  draft.team_ids = ids;
}

async function save() {
  if (busy.value || teamError.value || mapPoolError.value || !(await form.value?.validate())?.valid)
    return;
  busy.value = true;
  try {
    const body: Record<string, unknown> = {
      name: draft.name.trim(),
      season_id: draft.season_id,
      settings: {
        ...settings,
        swiss_rounds: settings.swiss_rounds || undefined,
        challonge_url: settings.challonge_url ? challongeId(settings.challonge_url) : undefined
      }
    };
    if (!started.value) Object.assign(body, { format: draft.format, team_ids: draft.team_ids });
    let id: number;
    if (props.detail) {
      id = props.detail.tournament.id;
      await tournaments.update(id, body);
    } else {
      id = (await tournaments.create(body)).id;
    }
    ui.notify(t("Tournament.Saved"), "success");
    show.value = false;
    emit("saved", id);
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.format-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.seed-list {
  max-height: 320px;
  overflow-y: auto;
}
</style>
