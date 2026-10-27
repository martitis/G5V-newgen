<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <span>{{ $t("MyServers.Title") }}</span>
        <v-spacer />
        <v-text-field
          v-model="search"
          :label="$t('misc.Search')"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
          style="max-width: 280px"
        />
        <template v-if="auth.loggedIn">
          <v-switch
            v-model="mine"
            :label="$t('misc.OnlyMine')"
            color="primary"
            density="compact"
            hide-details
          />
        </template>
        <v-btn
          v-if="auth.isAdmin"
          variant="tonal"
          prepend-icon="mdi-heart-pulse"
          :loading="checkingAll"
          :disabled="!servers.length"
          @click="checkAll"
        >
          {{ $t("MyServers.CheckAll") }}
        </v-btn>
        <v-btn
          v-if="auth.isSuperAdmin"
          color="primary"
          prepend-icon="mdi-server-plus"
          @click="openDialog(null)"
        >
          {{ $t("MyServers.New") }}
        </v-btn>
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="servers"
        :search="search"
        :loading="loading"
        :loading-text="$t('misc.LoadText')"
        :no-data-text="$t('MyServers.NoServersFound')"
        item-value="id"
        density="comfortable"
      >
        <template #[`item.display_name`]="{ item }">
          <img
            v-if="item.flag"
            :src="flagUrl(item.flag)"
            alt=""
            class="mr-2"
            style="border-radius: 3px; vertical-align: middle"
          />
          {{ item.display_name }}
        </template>
        <template #[`item.address`]="{ item }">
          <span v-if="item.ip_string">{{ item.ip_string }}:{{ item.port }}</span>
        </template>
        <template #[`item.in_use`]="{ item }">
          <v-chip v-if="item.practice_mode" color="info" size="small" variant="tonal" label>
            {{ $t("MyServers.Practice") }}
          </v-chip>
          <v-chip
            v-else
            :color="item.in_use ? 'warning' : 'success'"
            size="small"
            variant="tonal"
            label
          >
            {{ item.in_use ? $t("MyServers.InUse") : $t("MyServers.Free") }}
          </v-chip>
        </template>
        <template #[`item.last_seen`]="{ item }">
          <v-chip
            :color="seen(item).color"
            size="small"
            variant="tonal"
            label
            :prepend-icon="seen(item).icon"
          >
            {{ seen(item).text }}
          </v-chip>
          <div
            v-if="seen(item).online && item.last_gamestate && item.last_gamestate !== 'none'"
            class="text-body-small text-medium-emphasis mt-1"
          >
            MatchZy: {{ item.last_gamestate }}
          </div>
        </template>
        <template #[`item.public_server`]="{ item }">
          <v-icon :color="item.public_server ? 'success' : undefined">
            {{ item.public_server ? "mdi-earth" : "mdi-lock" }}
          </v-icon>
        </template>
        <template #[`item.rcon`]="{ item }">
          <template v-if="auth.isSuperAdmin">
            <code v-if="rcon[item.id] !== undefined" class="mr-1">{{ rcon[item.id] }}</code>
            <v-btn
              :icon="rcon[item.id] !== undefined ? 'mdi-eye-off' : 'mdi-eye'"
              size="small"
              variant="text"
              :title="$t('MyServers.RCONPass')"
              @click="toggleRcon(item.id)"
            />
          </template>
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex ga-1 justify-end">
            <v-btn
              v-if="auth.isAdmin"
              size="small"
              variant="tonal"
              :color="statusColor[item.id] ?? 'grey'"
              :loading="checking[item.id]"
              prepend-icon="mdi-heart-pulse"
              @click="checkStatus(item.id)"
            >
              {{ $t("MyServers.Status") }}
            </v-btn>
            <v-btn
              v-if="auth.isAdmin && (item.practice_mode || !item.in_use)"
              size="small"
              variant="tonal"
              :color="item.practice_mode ? 'info' : undefined"
              :loading="practicing[item.id]"
              :prepend-icon="item.practice_mode ? 'mdi-stop' : 'mdi-target'"
              @click="togglePractice(item)"
            >
              {{
                item.practice_mode ? $t("MyServers.PracticeStop") : $t("MyServers.PracticeStart")
              }}
            </v-btn>
            <template v-if="auth.isSuperAdmin">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="openDialog(item)" />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="toDelete = item"
              />
            </template>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <ServerDialog v-model="dialog" :server="editing" @saved="load" />

    <v-dialog v-model="resultsOpen" max-width="640">
      <v-card :title="$t('MyServers.CheckAllTitle')">
        <v-card-subtitle v-if="results.length" class="pb-2">
          {{ $t("MyServers.CheckAllSummary", { ok: resultsOk, total: results.length }) }}
        </v-card-subtitle>
        <v-list density="compact">
          <v-list-item v-for="result in results" :key="result.id">
            <template #prepend>
              <v-progress-circular v-if="result.pending" indeterminate size="20" width="2" />
              <v-icon v-else :color="result.ok ? 'success' : 'error'">
                {{ result.ok ? "mdi-check-circle" : "mdi-alert-circle" }}
              </v-icon>
            </template>
            <v-list-item-title>{{ result.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap">
              {{ result.pending ? $t("MyServers.Checking") : result.message }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :loading="checkingAll" @click="checkAll">
            {{ $t("MyServers.CheckAgain") }}
          </v-btn>
          <v-btn color="primary" @click="resultsOpen = false">{{ $t("misc.Close") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="toDelete !== null"
      max-width="480"
      @update:model-value="toDelete = null"
    >
      <v-card :title="$t('MyServers.DeleteConfirmation')" :text="toDelete?.display_name">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="toDelete = null">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">{{
            $t("misc.Delete")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { servers as serversApi } from "@/api";
import type { Server } from "@/api/types";
import ServerDialog from "@/components/ServerDialog.vue";
import { useOnlyMine } from "@/composables/useOnlyMine";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { flagUrl, secondsSince } from "@/utils/format";

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

const servers = ref<Server[]>([]);
const loading = ref(true);
const mine = useOnlyMine("servers");
const search = ref("");
const dialog = ref(false);
const editing = ref<Server | null>(null);
const toDelete = ref<Server | null>(null);
const deleting = ref(false);
/** Revealed RCON passwords, by server id (fetched on demand, never part of the list). */
const rcon = reactive<Record<number, string>>({});
const checking = reactive<Record<number, boolean>>({});
const statusColor = reactive<Record<number, string>>({});
const practicing = reactive<Record<number, boolean>>({});

/** "Check all": every listed server's status (RCON answers, game up to date), shown in a dialog. */
interface CheckResult {
  id: number;
  name: string;
  pending: boolean;
  ok: boolean;
  message: string;
}
const results = ref<CheckResult[]>([]);
const resultsOpen = ref(false);
const checkingAll = ref(false);
const resultsOk = computed(() => results.value.filter((result) => result.ok).length);
async function checkAll() {
  checkingAll.value = true;
  resultsOpen.value = true;
  results.value = servers.value.map((server) => ({
    id: server.id,
    name: server.display_name,
    pending: true,
    ok: false,
    message: ""
  }));
  await Promise.all(
    results.value.map(async (result, index) => {
      let entry: CheckResult;
      try {
        const reply = await serversApi.status(result.id);
        entry = { ...result, pending: false, ok: true, message: reply.message };
      } catch (error) {
        entry = {
          ...result,
          pending: false,
          ok: false,
          message: error instanceof Error ? error.message : String(error)
        };
      }
      results.value[index] = entry;
      statusColor[result.id] = entry.ok ? "success" : "error";
    })
  );
  checkingAll.value = false;
}

const headers = computed(() => [
  { title: t("MyServers.ID"), key: "id" },
  { title: t("MyServers.Name"), key: "display_name" },
  { title: t("MyServers.Host"), key: "address", sortable: false },
  { title: t("MyServers.InUse"), key: "in_use" },
  { title: t("MyServers.LastSeen"), key: "last_seen", sortable: false },
  { title: t("MyServers.IsPublic"), key: "public_server" },
  { title: t("MyServers.Owner"), key: "name" },
  { title: t("MyServers.RCONPass"), key: "rcon", sortable: false },
  { title: "", key: "actions", sortable: false, align: "end" as const }
]);

async function fetchServers() {
  await auth.load();
  servers.value = mine.value && auth.loggedIn ? await serversApi.mine() : await serversApi.all();
}

async function load() {
  loading.value = true;
  try {
    await fetchServers();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loading.value = false;
  }
}

/** The API probes every server every 10 s; seen within 30 s counts as online. */
const ONLINE_S = 30;
const now = ref(Date.now());
function seen(server: Server) {
  const age = secondsSince(server.last_seen, now.value);
  if (age != null && age <= ONLINE_S)
    return {
      online: true,
      color: "success",
      icon: "mdi-circle",
      text: t("MyServers.OnlineSince", { ago: agoText(age) })
    };
  if (age == null)
    return {
      online: false,
      color: "grey",
      icon: "mdi-help-circle-outline",
      text: server.last_checked ? t("MyServers.NeverSeen") : t("MyServers.NotChecked")
    };
  return {
    online: false,
    color: "error",
    icon: "mdi-circle-outline",
    text: t("MyServers.OfflineSince", { ago: agoText(age) })
  };
}
function agoText(seconds: number) {
  if (seconds < 90) return t("MyServers.AgoSeconds", { n: seconds });
  if (seconds < 5400) return t("MyServers.AgoMinutes", { n: Math.round(seconds / 60) });
  if (seconds < 129600) return t("MyServers.AgoHours", { n: Math.round(seconds / 3600) });
  return t("MyServers.AgoDays", { n: Math.round(seconds / 86400) });
}

// The "seen … ago" texts count every second; the list itself refreshes quietly every 10 s while the page
// is visible (no spinner, errors ignored until the next try).
const clock = setInterval(() => (now.value = Date.now()), 1000);
const timer = setInterval(() => {
  if (document.visibilityState === "visible" && !loading.value)
    fetchServers().catch(() => undefined);
}, 10000);
onBeforeUnmount(() => {
  clearInterval(clock);
  clearInterval(timer);
});

function openDialog(server: Server | null) {
  editing.value = server;
  dialog.value = true;
}

async function toggleRcon(id: number) {
  if (rcon[id] !== undefined) {
    delete rcon[id];
    return;
  }
  try {
    rcon[id] = await serversApi.rconPassword(id);
  } catch (error) {
    ui.notifyError(error);
  }
}

async function checkStatus(id: number) {
  checking[id] = true;
  try {
    const result = await serversApi.status(id);
    statusColor[id] = "success";
    ui.notify(result.message, "success");
  } catch (error) {
    statusColor[id] = "error";
    ui.notifyError(error);
  } finally {
    checking[id] = false;
  }
}

async function togglePractice(server: Server) {
  practicing[server.id] = true;
  try {
    const result = await serversApi.practice(server.id, server.practice_mode ? "stop" : "start");
    ui.notify(result.message, "success");
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    practicing[server.id] = false;
  }
}

async function confirmDelete() {
  if (!toDelete.value) return;
  deleting.value = true;
  try {
    const result = await serversApi.remove(toDelete.value.id);
    ui.notify(result.message, "success");
    toDelete.value = null;
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    deleting.value = false;
  }
}

watch(mine, load);
onMounted(load);
</script>
