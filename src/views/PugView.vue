<template>
  <v-container fluid style="max-width: 1100px">
    <v-skeleton-loader v-if="!data" type="card, card" />
    <template v-else>
      <PugStream :queue-id="data.queue.id" @queue="(next) => (data = next)" />

      <v-card class="mb-4">
        <v-card-text class="d-flex align-center flex-wrap ga-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap ga-2">
              <span class="text-headline-small">{{ data.queue.title || $t("Pug.Queue") }}</span>
              <v-chip :color="STATUS[data.queue.status].color" size="small" variant="tonal" label>
                {{ $t(STATUS[data.queue.status].key) }}
              </v-chip>
            </div>
            <div class="text-body-medium text-medium-emphasis mt-1">
              {{ $t("Pug.Players", { n: data.players.length, size: data.queue.size }) }} ·
              {{ data.queue.settings.players_per_team }}v{{
                data.queue.settings.players_per_team
              }}
              · BO{{ data.queue.settings.max_maps }} ·
              {{ $t(`Pug.${data.queue.settings.formation}`) }}
            </div>
          </div>
          <template v-if="data.queue.status === 'open'">
            <v-btn
              v-if="!me"
              color="primary"
              size="large"
              prepend-icon="mdi-account-plus"
              :loading="busy"
              :disabled="!auth.loggedIn"
              @click="join"
            >
              {{ $t("Pug.Join") }}
            </v-btn>
            <v-btn
              v-else
              variant="tonal"
              prepend-icon="mdi-exit-run"
              :loading="busy"
              @click="leave"
            >
              {{ $t("Pug.Leave") }}
            </v-btn>
          </template>
          <v-btn
            v-if="owner && ['open', 'ready_check', 'picking', 'failed'].includes(data.queue.status)"
            variant="text"
            color="error"
            :loading="busy"
            @click="cancel"
          >
            {{ $t("Pug.Cancel") }}
          </v-btn>
        </v-card-text>
        <v-progress-linear
          :model-value="(data.players.length / data.queue.size) * 100"
          :color="data.players.length === data.queue.size ? 'success' : 'primary'"
          height="6"
        />
      </v-card>

      <!-- What the queue is doing right now -->
      <v-alert
        v-if="data.queue.status === 'open' && !auth.loggedIn"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ $t("Pug.SteamRequired") }}
      </v-alert>
      <v-alert
        v-if="data.queue.status === 'ready_check'"
        type="warning"
        variant="tonal"
        prominent
        icon="mdi-bell-ring"
        class="mb-4"
      >
        <div class="d-flex align-center flex-wrap ga-3">
          <span class="flex-grow-1">
            {{ me?.ready ? $t("Pug.WaitingOthers") : $t("Pug.ReadyCheck", { s: secondsLeft }) }}
          </span>
          <v-btn
            v-if="me && !me.ready"
            color="success"
            size="large"
            prepend-icon="mdi-check-bold"
            :loading="busy"
            @click="ready"
          >
            {{ $t("Pug.Ready") }}
          </v-btn>
        </div>
      </v-alert>
      <v-alert v-if="data.queue.status === 'picking'" type="info" variant="tonal" class="mb-4">
        {{
          myTurn
            ? $t("Pug.YourPick")
            : $t("Pug.Picking", { captain: pickingCaptainName, team: data.queue.picking_team })
        }}
      </v-alert>
      <v-alert v-if="data.queue.status === 'loading'" type="info" variant="tonal" class="mb-4">
        <v-progress-circular indeterminate size="18" width="2" class="mr-2" />
        {{ $t("Pug.Loading") }}
      </v-alert>
      <v-alert v-if="data.queue.status === 'loaded'" type="success" variant="tonal" class="mb-4">
        <div class="d-flex align-center flex-wrap ga-3">
          <span class="flex-grow-1">{{ $t("Pug.Loaded") }}</span>
          <v-btn
            color="success"
            :to="`/match/${data.queue.match_id}`"
            append-icon="mdi-arrow-right"
          >
            {{ $t("Pug.GoToMatch") }}
          </v-btn>
        </div>
      </v-alert>
      <v-alert v-if="data.queue.status === 'failed'" type="error" variant="tonal" class="mb-4">
        <div class="d-flex align-center flex-wrap ga-3">
          <span class="flex-grow-1">{{ $t("Pug.Failed", { error: data.queue.error ?? "" }) }}</span>
          <v-btn v-if="owner" :loading="busy" @click="retry">{{ $t("Pug.Retry") }}</v-btn>
        </div>
      </v-alert>
      <v-alert v-if="data.queue.status === 'cancelled'" type="warning" variant="tonal" class="mb-4">
        {{ $t("Pug.Cancelled") }}
      </v-alert>

      <!-- Teams once formed (or being picked), otherwise the queue -->
      <v-row v-if="formed">
        <v-col v-for="team in [1, 2] as const" :key="team" cols="12" md="4">
          <v-card :title="$t('Pug.Team', { n: team })">
            <v-list density="compact">
              <PugPlayerItem
                v-for="player in teamPlayers(team)"
                :key="player.user_id"
                :player="player"
              />
            </v-list>
          </v-card>
        </v-col>
        <v-col v-if="data.queue.status === 'picking'" cols="12" md="4">
          <v-card :title="$t('Pug.Available')">
            <v-list density="compact">
              <PugPlayerItem v-for="player in available" :key="player.user_id" :player="player">
                <v-btn
                  v-if="myTurn"
                  size="small"
                  color="primary"
                  variant="tonal"
                  :loading="busy"
                  @click="pick(player.user_id)"
                >
                  {{ $t("Pug.Pick") }}
                </v-btn>
              </PugPlayerItem>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
      <v-card v-else>
        <v-list density="compact">
          <PugPlayerItem
            v-for="player in data.players"
            :key="player.user_id"
            :player="player"
            :show-ready="data.queue.status === 'ready_check'"
          />
          <v-list-item
            v-for="n in data.queue.size - data.players.length"
            :key="`empty-${n}`"
            class="text-medium-emphasis"
          >
            <template #prepend>
              <v-avatar size="32" color="surface-variant"
                ><v-icon>mdi-account-clock</v-icon></v-avatar
              >
            </template>
            <v-list-item-title>{{ $t("Pug.Waiting") }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { pugs } from "@/api";
import type { PugPlayer, PugQueue, PugStatus } from "@/api/types";
import PugPlayerItem from "@/components/pug/PugPlayerItem.vue";
import PugStream from "@/components/pug/PugStream.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const STATUS: Record<PugStatus, { key: string; color: string }> = {
  open: { key: "Pug.StatusOpen", color: "info" },
  ready_check: { key: "Pug.StatusReady", color: "warning" },
  picking: { key: "Pug.StatusPicking", color: "warning" },
  loading: { key: "Pug.StatusLoading", color: "info" },
  loaded: { key: "Pug.StatusLoaded", color: "success" },
  failed: { key: "Pug.StatusFailed", color: "error" },
  cancelled: { key: "Pug.StatusCancelled", color: "grey" }
};

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

const data = ref<{ queue: PugQueue; players: PugPlayer[] } | null>(null);
const busy = ref(false);
const now = ref(Date.now());

const me = computed(() => data.value?.players.find((player) => player.user_id === auth.user?.id));
const owner = computed(() => data.value != null && auth.isAdmin);
const formed = computed(() =>
  ["picking", "loading", "loaded", "failed"].includes(data.value?.queue.status ?? "")
);
const myTurn = computed(
  () => data.value?.queue.status === "picking" && data.value.queue.picking_captain === auth.user?.id
);
const pickingCaptainName = computed(
  () =>
    data.value?.players.find((player) => player.user_id === data.value?.queue.picking_captain)
      ?.name ?? ""
);
const available = computed(() => data.value?.players.filter((player) => player.team == null) ?? []);
const teamPlayers = (team: 1 | 2) =>
  (data.value?.players ?? [])
    .filter((player) => player.team === team)
    .sort((a, b) => Number(b.captain) - Number(a.captain));
const secondsLeft = computed(() => {
  const deadline = data.value?.queue.ready_deadline;
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now.value) / 1000));
});

async function load() {
  try {
    await auth.load();
    data.value = await pugs.get(String(route.params.id));
  } catch (error) {
    ui.notifyError(error);
  }
}

async function act(action: () => Promise<unknown>) {
  busy.value = true;
  try {
    await action();
    // The stream brings the new state; load once more in case it reconnects.
    data.value = await pugs.get(String(route.params.id));
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

const queueId = () => data.value!.queue.id;
const join = () => act(() => pugs.join(queueId()));
const leave = () => act(() => pugs.leave(queueId()));
const ready = () => act(() => pugs.ready(queueId()));
const pick = (userId: number) => act(() => pugs.pick(queueId(), userId));
const retry = () => act(() => pugs.retry(queueId()));
const cancel = () => act(() => pugs.cancel(queueId()));

// Countdown of the ready check.
let clock: ReturnType<typeof setInterval> | null = null;
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 500)));
onBeforeUnmount(() => clock && clearInterval(clock));
watch(() => route.params.id, load, { immediate: true });
</script>
