<template>
  <v-card class="node" :class="`node--${node.status}`" variant="outlined">
    <div
      v-for="slot in slots"
      :key="slot.side"
      class="slot"
      :class="{ 'slot--won': slot.won, 'slot--lost': slot.lost }"
    >
      <TeamLogo :logo="slot.team?.logo" :size="18" />
      <span class="slot-name">
        {{
          slot.team?.name ??
          (node.status === "bye" && !slot.team ? $t("Tournament.Bye") : $t("Tournament.TBD"))
        }}
      </span>
      <span v-if="node.score" class="slot-score">{{ slot.score }}</span>
    </div>
    <div class="node-footer text-caption">
      <v-chip v-if="node.status === 'live'" color="error" size="x-small" variant="flat" label>
        {{ $t("Matches.StatusLive") }}
      </v-chip>
      <span v-else class="text-medium-emphasis">BO{{ node.best_of }}</span>
      <v-spacer />
      <v-btn
        v-if="node.status === 'live' && node.server_id && auth.loggedIn"
        icon="mdi-content-copy"
        size="x-small"
        variant="text"
        :loading="copying"
        :title="$t('Match.CopyConnect')"
        @click="copyConnect"
      />
      <v-btn
        v-if="node.match_id"
        :to="`/match/${node.match_id}`"
        size="x-small"
        variant="text"
        append-icon="mdi-chevron-right"
      >
        {{ $t("Tournament.OpenMatch") }}
      </v-btn>
      <v-btn
        v-else-if="manageable && canCreateMatch(node)"
        size="x-small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-play"
        @click="emit('create', node)"
      >
        {{ $t("Tournament.CreateMatch") }}
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { servers } from "@/api";
import type { TournamentDetail, TournamentNode } from "@/api/types";
import TeamLogo from "@/components/TeamLogo.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { copyText } from "@/utils/clipboard";
import { connectLinks } from "@/utils/format";
import { canCreateMatch } from "@/utils/tournament";

const props = defineProps<{
  node: TournamentNode;
  teams: TournamentDetail["teams"];
  /** The viewer may create matches (owner or super admin). */
  manageable: boolean;
}>();
const emit = defineEmits<{ create: [node: TournamentNode] }>();
const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

/** Copies the live match's connect command; the API only gives the address to admins and the match's players. */
const copying = ref(false);
async function copyConnect() {
  if (!props.node.server_id) return;
  copying.value = true;
  try {
    const server = await servers.get(props.node.server_id);
    if (!server.ip_string) {
      ui.notify(t("Tournament.NoConnect"), "warning");
      return;
    }
    const { command } = connectLinks(
      server.ip_string,
      server.port,
      server.gotv_port,
      server.join_password
    );
    if (await copyText(command)) ui.notify(t("Match.Copied"), "success");
    else ui.notify(t("misc.CopyFailed"), "warning");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    copying.value = false;
  }
}

const slots = computed(() =>
  ([1, 2] as const).map((side) => {
    const id = side === 1 ? props.node.team1_id : props.node.team2_id;
    const team = props.teams.find((entry) => entry.id === id);
    const decided =
      props.node.winner_id != null && (props.node.status === "done" || props.node.status === "bye");
    return {
      side,
      team,
      score: props.node.score ? props.node.score[side - 1] : null,
      won: decided && id != null && props.node.winner_id === id,
      lost: decided && id != null && props.node.winner_id !== id
    };
  })
);
</script>

<style scoped>
.node {
  width: 220px;
  overflow: hidden;
}
.node--live {
  border-color: rgb(var(--v-theme-error));
}
.node--empty {
  opacity: 0.4;
}
.slot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.slot-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slot-score {
  font-weight: 700;
  min-width: 14px;
  text-align: right;
}
.slot--won {
  font-weight: 700;
}
.slot--won .slot-score {
  color: rgb(var(--v-theme-success));
}
.slot--lost {
  opacity: 0.55;
}
.node-footer {
  display: flex;
  align-items: center;
  padding: 2px 4px 2px 8px;
  min-height: 28px;
}
</style>
