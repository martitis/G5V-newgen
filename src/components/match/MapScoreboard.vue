<template>
  <v-card>
    <div class="map-banner">
      <v-img
        :src="mapImageUrl(mapStat?.map_name)"
        height="96"
        cover
        gradient="to right, rgba(0,0,0,.75), rgba(0,0,0,.25)"
      >
        <div class="d-flex align-center flex-wrap ga-4 pa-4 h-100 text-white">
          <div>
            <div class="text-body-small">{{ $t("Match.MapNumber", { n: mapNumber + 1 }) }}</div>
            <div class="text-title-large font-weight-medium">
              {{ mapDisplayName(mapStat?.map_name) }}
            </div>
          </div>
          <v-spacer />
          <div class="text-headline-medium font-weight-bold">
            {{ mapStat?.team1_score ?? 0 }} : {{ mapStat?.team2_score ?? 0 }}
          </div>
          <v-chip v-if="live" color="error" size="small" variant="flat" label>{{
            $t("Matches.StatusLive")
          }}</v-chip>
          <v-btn
            v-if="mapStat?.demoFile"
            :href="apiUrl(`/demo/${mapStat.demoFile}`)"
            color="white"
            variant="outlined"
            size="small"
            prepend-icon="mdi-download"
          >
            {{ $t("PlayerStats.Download") }}
          </v-btn>
          <v-chip
            v-else-if="mapStat?.demo_status === 'failed'"
            color="error"
            size="small"
            variant="flat"
            prepend-icon="mdi-alert"
            label
          >
            {{ $t("Match.DemoFailed") }}
          </v-chip>
          <!-- The demo was removed from the game servers' folder (cs2manager.sh archive). -->
          <v-chip
            v-else-if="mapStat?.demo_status === 'archived'"
            size="small"
            variant="outlined"
            color="white"
            prepend-icon="mdi-archive"
            :title="$t('Match.DemoArchivedHint')"
            label
          >
            {{ $t("Match.DemoArchived") }}
          </v-chip>
          <v-chip
            v-else-if="mapStat?.end_time"
            size="small"
            variant="outlined"
            color="white"
            prepend-icon="mdi-timer-sand"
            label
          >
            {{ $t("Match.DemoPending") }}
          </v-chip>
        </div>
      </v-img>
    </div>

    <v-card-text>
      <v-alert
        v-if="mapStat?.stats_incomplete"
        type="info"
        variant="tonal"
        density="compact"
        icon="mdi-database-alert"
        class="mb-4"
      >
        {{ $t("ServerState.StatsIncomplete") }}
      </v-alert>
      <template v-if="rounds.length">
        <div class="text-title-small mb-2">{{ $t("Match.Rounds") }}</div>
        <RoundHistory
          :rounds="rounds"
          :bombs="bombs"
          :team1="match.team1_string"
          :team2="match.team2_string"
          class="mb-4"
        />
      </template>
      <v-expansion-panels
        v-if="kills.length"
        :model-value="live ? [0] : []"
        variant="accordion"
        class="mb-4"
      >
        <v-expansion-panel :title="$t('Match.KillFeed')">
          <v-expansion-panel-text>
            <KillFeed :kills="kills" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <div v-if="!players.length" class="text-medium-emphasis">
        {{ $t("PlayerStats.NoStatFound") }}
      </div>
      <div v-for="side in sides" v-else :key="side.key" class="mb-4">
        <div class="d-flex align-center ga-2 mb-1">
          <span class="text-title-small">{{ side.name }}</span>
          <span class="text-body-small text-medium-emphasis">{{ side.score }}</span>
        </div>
        <v-data-table
          :headers="headers"
          :items="side.rows"
          :sort-by="[{ key: 'rating', order: 'desc' }]"
          item-value="id"
          density="compact"
          :items-per-page="-1"
          hide-default-footer
          show-expand
        >
          <template #[`item.name`]="{ item }">
            <router-link :to="`/user/${item.steam_id}`" class="app-link">{{
              item.name
            }}</router-link>
          </template>
          <template #[`item.diff`]="{ item }">
            <span :class="item.diff > 0 ? 'text-success' : item.diff < 0 ? 'text-error' : ''">
              {{ item.diff > 0 ? `+${item.diff}` : item.diff }}
            </span>
          </template>
          <template #[`item.rating`]="{ item }">
            <span class="font-weight-medium">{{ item.rating.toFixed(2) }}</span>
          </template>
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="py-2">
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="extra in extras(item)"
                    :key="extra.label"
                    size="small"
                    variant="tonal"
                    label
                  >
                    {{ extra.label }}: <strong class="ml-1">{{ extra.value }}</strong>
                  </v-chip>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { BombEvent, KillEvent, MapStat, Match, MatchRound, PlayerStat } from "@/api/types";
import KillFeed from "@/components/match/KillFeed.vue";
import RoundHistory from "@/components/match/RoundHistory.vue";
import { apiUrl } from "@/config";
import { adr, fpr, hsp, kdr, mapDisplayName, mapImageUrl, rating } from "@/utils/format";

const props = withDefaults(
  defineProps<{
    match: Match;
    mapStat: MapStat | null;
    /** Index of the map in the series (0-based). */
    mapNumber: number;
    players: PlayerStat[];
    live: boolean;
    /** This map's rounds, kills (newest first) and bomb events. */
    rounds?: MatchRound[];
    kills?: KillEvent[];
    bombs?: BombEvent[];
  }>(),
  { rounds: () => [], kills: () => [], bombs: () => [] }
);

const { t } = useI18n();
const n = (value: unknown) => Number(value) || 0;

/** Team 1 or 2; PUG players have no team id, so fall back to the team name. */
function sideOf(player: PlayerStat): 1 | 2 {
  if (player.team_id != null) return player.team_id === props.match.team2_id ? 2 : 1;
  return player.team_name === props.match.team2_string ? 2 : 1;
}

const rows = computed(() =>
  props.players.map((p) => ({
    ...p,
    side: sideOf(p),
    diff: n(p.kills) - n(p.deaths),
    adr: Number(adr(p)),
    hsp: Number(hsp(p)),
    rating: Number(
      rating(
        n(p.kills),
        n(p.roundsplayed),
        n(p.deaths),
        n(p.k1),
        n(p.k2),
        n(p.k3),
        n(p.k4),
        n(p.k5)
      )
    )
  }))
);

const sides = computed(() => [
  {
    key: 1,
    name: props.match.team1_string,
    score: props.mapStat ? String(props.mapStat.team1_score) : "",
    rows: rows.value.filter((r) => r.side === 1)
  },
  {
    key: 2,
    name: props.match.team2_string,
    score: props.mapStat ? String(props.mapStat.team2_score) : "",
    rows: rows.value.filter((r) => r.side === 2)
  }
]);

const headers = computed(() => [
  { title: t("PlayerStats.User"), key: "name" },
  { title: "K", key: "kills", align: "end" as const },
  { title: "D", key: "deaths", align: "end" as const },
  { title: "A", key: "assists", align: "end" as const },
  { title: "+/-", key: "diff", align: "end" as const },
  { title: "ADR", key: "adr", align: "end" as const },
  { title: "HS%", key: "hsp", align: "end" as const },
  { title: t("PlayerStats.Rating"), key: "rating", align: "end" as const },
  { title: "", key: "data-table-expand" }
]);

function extras(p: PlayerStat) {
  return [
    { label: t("PlayerStats.KDR"), value: kdr(p) },
    { label: t("PlayerStats.FPR"), value: fpr(p) },
    { label: t("PlayerStats.KAST"), value: n(p.kast) },
    { label: t("PlayerStats.MVP"), value: n(p.mvp) },
    { label: t("PlayerStats.UtilDamage"), value: n(p.util_damage) },
    { label: t("PlayerStats.EnemyFlash"), value: n(p.enemies_flashed) },
    { label: t("PlayerStats.FlashbangAssists"), value: n(p.flashbang_assists) },
    { label: t("PlayerStats.FriendFlash"), value: n(p.friendlies_flashed) },
    { label: t("PlayerStats.KnifeKills"), value: n(p.knife_kills) },
    { label: t("PlayerStats.BombPlants"), value: n(p.bomb_plants) },
    { label: t("PlayerStats.BombDefuses"), value: n(p.bomb_defuses) },
    { label: t("PlayerStats.Suicides"), value: n(p.suicides) },
    { label: t("PlayerStats.5kill"), value: n(p.k5) },
    { label: t("PlayerStats.4kill"), value: n(p.k4) },
    { label: t("PlayerStats.3kill"), value: n(p.k3) },
    { label: "1v1", value: n(p.v1) },
    { label: "1v2", value: n(p.v2) },
    { label: "1v3+", value: n(p.v3) + n(p.v4) + n(p.v5) },
    { label: t("PlayerStats.ContribScore"), value: n(p.contribution_score) }
  ];
}
</script>
