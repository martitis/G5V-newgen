<template>
  <div>
    <v-expansion-panels v-model="openPanels" variant="accordion" multiple>
      <v-expansion-panel value="control">
        <v-expansion-panel-title color="accent">
          <v-icon class="mr-2">mdi-shield-crown</v-icon>
          <span class="font-weight-medium">{{ $t("Control.Title") }}</span>
          <v-spacer />
          <v-chip
            v-if="health"
            :color="health.reachable ? 'success' : 'error'"
            size="x-small"
            variant="flat"
            label
            class="mr-2"
          >
            {{ health.reachable ? $t("Control.Reachable") : $t("Control.Unreachable") }}
          </v-chip>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-tabs v-model="tab" density="comfortable" show-arrows class="mb-4">
            <v-tab value="match" prepend-icon="mdi-flag-checkered">{{
              $t("Control.TabMatch")
            }}</v-tab>
            <v-tab value="players" prepend-icon="mdi-account-group">
              {{ $t("Control.TabPlayers") }}
            </v-tab>
            <v-tab value="server" prepend-icon="mdi-server">{{ $t("Control.TabServer") }}</v-tab>
            <v-tab value="chat" prepend-icon="mdi-message-cog">{{ $t("Control.TabChat") }}</v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <!-- Match: pause, flow, ready, map, ending the match -->
            <v-window-item value="match">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-title-small mb-2">{{ $t("Control.Flow") }}</div>
                  <div class="d-flex flex-wrap ga-2 mb-3">
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="warning"
                      prepend-icon="mdi-pause"
                      :loading="actions?.busy"
                      @click="actions?.pause()"
                    >
                      {{ $t("MatchAdmin.PauseMatch") }}
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="flat"
                      color="success"
                      prepend-icon="mdi-play"
                      :loading="actions?.busy"
                      @click="actions?.unpause()"
                    >
                      {{ $t("MatchAdmin.UnpauseMatch") }}
                    </v-btn>
                    <v-btn
                      v-for="button in flowButtons"
                      :key="button.action"
                      size="small"
                      :variant="button.variant"
                      :color="button.color"
                      :prepend-icon="button.icon"
                      :loading="busy === button.action"
                      @click="
                        button.confirm ? ask(button.action, {}, button.label) : send(button.action)
                      "
                    >
                      {{ button.label }}
                    </v-btn>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center ga-2">
                    <v-select
                      v-model="mapChoice"
                      :items="mapItems"
                      :label="$t('Control.ChangeMap')"
                      density="compact"
                      hide-details
                      style="max-width: 280px"
                    />
                    <v-btn
                      size="small"
                      color="warning"
                      variant="tonal"
                      :disabled="!mapChoice"
                      @click="
                        ask(
                          'change_map',
                          { map: mapChoice },
                          `${$t('Control.ChangeMap')}: ${mapChoice}`
                        )
                      "
                    >
                      {{ $t("Control.Set") }}
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
              <v-divider class="my-4" />
              <div class="text-title-small mb-2">{{ $t("Control.EndSection") }}</div>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  size="small"
                  variant="tonal"
                  color="warning"
                  prepend-icon="mdi-flag"
                  @click="actions?.open('forfeit')"
                >
                  {{ $t("MatchAdmin.ForfeitMatch") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="warning"
                  prepend-icon="mdi-restart"
                  @click="actions?.open('restart')"
                >
                  {{ $t("MatchAdmin.MatchRestart") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="error"
                  prepend-icon="mdi-cancel"
                  @click="actions?.open('cancel')"
                >
                  {{ $t("MatchAdmin.CancelMatch") }}
                </v-btn>
              </div>
            </v-window-item>

            <!-- Players: who is connected (kick), add / remove from the match -->
            <v-window-item value="players">
              <div class="d-flex align-center flex-wrap ga-2 mb-2">
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  prepend-icon="mdi-account-plus"
                  @click="actions?.open('add')"
                >
                  {{ $t("MatchAdmin.AddPlayerToServer") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-account-remove"
                  @click="actions?.open('remove')"
                >
                  {{ $t("MatchAdmin.RemovePlayer") }}
                </v-btn>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-refresh"
                  :loading="loadingPlayers"
                  @click="loadPlayers"
                >
                  {{ $t("Control.Refresh") }}
                </v-btn>
              </div>
              <div class="text-body-small text-medium-emphasis mb-2">
                {{ $t("Control.PlayersHint") }}
              </div>
              <v-alert
                v-if="playersReachable === false"
                type="error"
                variant="tonal"
                density="compact"
              >
                {{ $t("Control.Unreachable") }}
              </v-alert>
              <v-table v-else-if="players?.length" density="compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ $t("Control.PlayerName") }}</th>
                    <th>{{ $t("Control.Ping") }}</th>
                    <th>{{ $t("Control.State") }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="player in players" :key="player.userid">
                    <td>{{ player.userid }}</td>
                    <td>
                      {{ player.name }}
                      <v-chip v-if="player.bot" size="x-small" label class="ml-1">BOT</v-chip>
                    </td>
                    <td>{{ player.ping ?? "–" }}</td>
                    <td>{{ player.state }}</td>
                    <td class="text-right">
                      <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        prepend-icon="mdi-account-remove"
                        :loading="busy === `kick${player.userid}`"
                        @click="askKick(player)"
                      >
                        {{ $t("Control.Kick") }}
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div v-else-if="players" class="text-body-medium text-medium-emphasis">
                {{ $t("Control.NoPlayers") }}
              </div>
            </v-window-item>

            <!-- Server: health, backups, server change, callbacks, RCON, config -->
            <v-window-item value="server">
              <div class="d-flex flex-wrap ga-2 mb-4">
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  prepend-icon="mdi-backup-restore"
                  @click="actions?.openBackups()"
                >
                  {{ $t("MatchAdmin.ListBackups") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-server-network"
                  @click="actions?.openServerChange()"
                >
                  {{ $t("MatchAdmin.ChangeServer") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="info"
                  prepend-icon="mdi-link-variant"
                  @click="actions?.updateCallbacks()"
                >
                  {{ $t("MatchAdmin.UpdateCallbacks") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-console"
                  @click="actions?.open('rcon')"
                >
                  {{ $t("MatchAdmin.SendRCON") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-code-json"
                  @click="actions?.showConfig()"
                >
                  {{ $t("MatchAdmin.ConfigPreview") }}
                </v-btn>
              </div>
              <div class="d-flex align-center mb-2">
                <span class="text-title-small">{{ $t("Control.Server") }}</span>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-refresh"
                  :loading="checking"
                  @click="checkHealth"
                >
                  {{ $t("Control.Refresh") }}
                </v-btn>
              </div>
              <v-table v-if="health?.status" density="compact">
                <tbody>
                  <tr v-for="[key, value] in statusRows" :key="key">
                    <td class="text-medium-emphasis">{{ key }}</td>
                    <td>{{ value }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- Chat and settings: team names, messages, live cvars -->
            <v-window-item value="chat">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-title-small mb-2">{{ $t("Control.TeamNames") }}</div>
                  <div
                    v-for="team in [1, 2] as const"
                    :key="team"
                    class="d-flex align-center ga-2 mb-2"
                  >
                    <v-text-field
                      v-model="teamNames[team]"
                      :label="team === 1 ? match.team1_string : match.team2_string"
                      density="compact"
                      hide-details
                      counter="32"
                      maxlength="32"
                    />
                    <v-btn
                      size="small"
                      color="primary"
                      variant="tonal"
                      :disabled="!teamNames[team]?.trim()"
                      :loading="busy === `team_name${team}`"
                      @click="
                        send('team_name', { team, name: teamNames[team] }, `team_name${team}`)
                      "
                    >
                      {{ $t("Control.Rename") }}
                    </v-btn>
                  </div>

                  <div class="text-title-small mt-4 mb-2">{{ $t("Control.LiveCvars") }}</div>
                  <div class="d-flex align-center ga-2">
                    <v-select
                      v-model="cvar"
                      :items="CVARS"
                      item-title="name"
                      item-value="name"
                      density="compact"
                      hide-details
                      style="max-width: 280px"
                    />
                    <v-text-field
                      v-model="cvarValue"
                      :label="$t('Control.Value')"
                      type="number"
                      :hint="cvarHint"
                      persistent-hint
                      density="compact"
                      style="max-width: 140px"
                    />
                    <v-btn
                      size="small"
                      color="primary"
                      variant="tonal"
                      :disabled="cvarValue === ''"
                      :loading="busy === 'cvar'"
                      @click="send('cvar', { cvar, value: Number(cvarValue) })"
                    >
                      {{ $t("Control.Set") }}
                    </v-btn>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-title-small mb-2">{{ $t("Control.Messages") }}</div>
                  <div class="d-flex flex-wrap ga-1 mb-2">
                    <v-chip
                      v-for="template in templates"
                      :key="template"
                      size="small"
                      variant="outlined"
                      @click="message = template"
                    >
                      {{ template }}
                    </v-chip>
                  </div>
                  <div class="d-flex align-center ga-2">
                    <v-text-field
                      v-model="message"
                      density="compact"
                      hide-details
                      counter="120"
                      maxlength="120"
                      @keydown.enter="sendMessage"
                    />
                    <v-btn
                      size="small"
                      color="primary"
                      variant="flat"
                      prepend-icon="mdi-send"
                      :disabled="!message.trim()"
                      :loading="busy === 'say'"
                      @click="sendMessage"
                    >
                      {{ $t("Control.Send") }}
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>

          <pre v-if="reply" class="console mt-3">{{ reply }}</pre>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- The admin menu's dialogs (players, backups, server, RCON, config, restart, cancel, forfeit). -->
    <MatchAdminDialogs ref="actions" :match="match" @changed="emit('changed')" />

    <v-dialog :model-value="pending !== null" max-width="440" @update:model-value="pending = null">
      <v-card :title="$t('Control.ConfirmTitle')" :text="pending?.label">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="pending = null">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="warning" @click="confirmPending">{{ $t("misc.Confirm") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { matches } from "@/api";
import type { Match, StatusPlayer } from "@/api/types";
import { useUiStore } from "@/stores/ui";
import { mapDisplayName } from "@/utils/format";
import MatchAdminDialogs from "@/components/match/MatchAdminDialogs.vue";

/** Live cvars the API accepts (same list and limits as utility/matchcontrol.ts). */
const CVARS = [
  { name: "mp_maxrounds", min: 2, max: 60 },
  { name: "mp_overtime_enable", min: 0, max: 1 },
  { name: "mp_overtime_maxrounds", min: 2, max: 12 },
  { name: "mp_freezetime", min: 0, max: 60 },
  { name: "mp_team_timeout_max", min: 0, max: 10 },
  { name: "mp_team_timeout_time", min: 10, max: 300 },
  { name: "matchzy_enable_tech_pause", min: 0, max: 1 },
  { name: "matchzy_stop_command_available", min: 0, max: 1 },
  { name: "matchzy_pause_after_restore", min: 0, max: 1 }
];

/**
 * Everything an owner or admin can do to a running match, in one place: match flow, players, the game server,
 * and chat/settings. MatchZy commands go through POST /matches/:id/control; the rest opens the admin menu's dialogs.
 * The API checks and audits every action.
 */
const props = defineProps<{ match: Match }>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const ui = useUiStore();
// Collapsed by default; admins open it when they need it.
const openPanels = ref<string[]>([]);
const tab = ref<"match" | "players" | "server" | "chat">("match");
const actions = ref<InstanceType<typeof MatchAdminDialogs> | null>(null);
const busy = ref<string | null>(null);
const reply = ref("");
const mapChoice = ref<string | null>(null);
const teamNames = reactive<Record<1 | 2, string>>({ 1: "", 2: "" });
const message = ref("");
const cvar = ref(CVARS[0].name);
const cvarValue = ref<string>("");
const pending = ref<{
  action: string;
  args: Record<string, unknown>;
  label: string;
  kick?: StatusPlayer;
} | null>(null);
const health = ref<{ reachable: boolean; status: Record<string, unknown> | null } | null>(null);
const checking = ref(false);
const players = ref<StatusPlayer[] | null>(null);
const playersReachable = ref<boolean | null>(null);
const loadingPlayers = ref(false);

/** Match flow buttons; the often used ones are coloured, toggles stay neutral. */
const flowButtons = computed(() => [
  {
    action: "start",
    label: t("Control.ForceStart"),
    icon: "mdi-play-circle",
    confirm: true,
    color: "success",
    variant: "flat" as const
  },
  {
    action: "skip_veto",
    label: t("Control.SkipVeto"),
    icon: "mdi-debug-step-over",
    confirm: true,
    color: "primary",
    variant: "tonal" as const
  },
  {
    action: "toggle_knife",
    label: t("Control.ToggleKnife"),
    icon: "mdi-knife",
    confirm: false,
    color: undefined,
    variant: "tonal" as const
  },
  {
    action: "toggle_playout",
    label: t("Control.TogglePlayout"),
    icon: "mdi-format-list-numbered",
    confirm: false,
    color: undefined,
    variant: "tonal" as const
  },
  {
    action: "toggle_whitelist",
    label: t("Control.ToggleWhitelist"),
    icon: "mdi-account-lock",
    confirm: false,
    color: undefined,
    variant: "tonal" as const
  }
]);
const templates = computed(() => [
  t("Control.TemplateTech"),
  t("Control.TemplateStart"),
  t("Control.TemplateReady"),
  t("Control.TemplateRestore")
]);
/** The match's map pool. */
const mapItems = computed(() =>
  String(props.match.veto_mappool ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((map) => ({ value: map, title: mapDisplayName(map) }))
);
const cvarHint = computed(() => {
  const limits = CVARS.find((entry) => entry.name === cvar.value);
  return limits ? `${limits.min}–${limits.max}` : "";
});
const statusRows = computed(() =>
  Object.entries(health.value?.status ?? {})
    .filter(([, value]) => value == null || typeof value !== "object")
    .map(([key, value]) => [key, String(value ?? "")])
);

async function send(action: string, args: Record<string, unknown> = {}, busyKey = action) {
  busy.value = busyKey;
  try {
    const result = await matches.control(props.match.id, { action, ...args });
    reply.value = result.response ? String(result.response) : "";
    ui.notify(t("Control.Sent"), "success");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = null;
  }
}

function ask(action: string, args: Record<string, unknown>, label: string) {
  pending.value = { action, args, label };
}
async function confirmPending() {
  const next = pending.value;
  pending.value = null;
  if (next?.kick) await kick(next.kick);
  else if (next) await send(next.action, next.args);
}

async function loadPlayers() {
  loadingPlayers.value = true;
  try {
    const result = await matches.serverPlayers(props.match.id);
    playersReachable.value = result.reachable;
    players.value = result.players;
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loadingPlayers.value = false;
  }
}

function askKick(player: StatusPlayer) {
  pending.value = {
    action: "kick",
    args: {},
    label: `${t("Control.Kick")}: ${player.name}`,
    kick: player
  };
}
async function kick(player: StatusPlayer) {
  busy.value = `kick${player.userid}`;
  try {
    const result = await matches.kick(props.match.id, player.userid, player.name);
    ui.notify(result.message, "success");
    await loadPlayers();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = null;
  }
}

// Loaded the first time the Players tab is opened.
watch(tab, (current) => {
  if (current === "players" && players.value === null) void loadPlayers();
});

// The server state banner opens the same dialogs (restore, restart, forfeit, cancel).
defineExpose({
  open: (dialog: "restart" | "forfeit" | "cancel") => actions.value?.open(dialog),
  openBackups: () => actions.value?.openBackups()
});

async function sendMessage() {
  if (!message.value.trim()) return;
  await send("say", { message: message.value });
  message.value = "";
}

async function checkHealth() {
  checking.value = true;
  try {
    health.value = await matches.serverStatus(props.match.id);
  } catch (error) {
    ui.notifyError(error);
  } finally {
    checking.value = false;
  }
}

void checkHealth();
</script>

<style scoped>
.console {
  background: #111;
  color: #d6d6d6;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  padding: 12px;
  border-radius: 6px;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
