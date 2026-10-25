<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <span>{{ $t("Seasons.Title") }}</span>
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
        <template v-if="auth.isAdmin">
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-import"
            @click="importDialog = true"
          >
            {{ $t("Seasons.ImportSeason") }}
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog(null)">{{
            $t("Seasons.New")
          }}</v-btn>
        </template>
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="rows"
        :search="search"
        :loading="loading"
        :loading-text="$t('misc.LoadText')"
        :no-data-text="$t('misc.NoData')"
        :sort-by="[{ key: 'id', order: 'desc' }]"
        item-value="id"
        density="comfortable"
      >
        <template #[`item.name`]="{ item }">
          <router-link :to="`/season/${item.id}`" class="app-link">{{ item.name }}</router-link>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip :color="STATUS_COLORS[item.status]" size="small" variant="tonal" label>
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>
        <template #[`item.start_date`]="{ item }">{{ formatDate(item.start_date) }}</template>
        <template #[`item.end_date`]="{ item }">
          {{ item.end_date ? formatDate(item.end_date) : $t("Seasons.NotFinished") }}
        </template>
        <template #[`item.owner`]="{ item }">
          <router-link :to="`/user/${item.user_id}`" class="app-link">
            {{ item.owner || `#${item.user_id}` }}
          </router-link>
        </template>
        <template #[`item.actions`]="{ item }">
          <div v-if="auth.canEdit(item.user_id)" class="d-flex justify-end">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openDialog(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="toDelete = item"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <SeasonDialog v-model="dialog" :season="editing" @saved="load" />

    <v-dialog
      :model-value="toDelete !== null"
      max-width="480"
      @update:model-value="toDelete = null"
    >
      <v-card :title="$t('Seasons.DeleteConfirmation')" :text="$t('Seasons.DeleteExplain')">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="toDelete = null">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="error" :loading="busy" @click="confirmDelete">{{
            $t("misc.Delete")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="importDialog" max-width="560">
      <v-card :title="$t('Seasons.Import')">
        <v-card-text>
          <v-text-field
            v-model.trim="challonge.tournament_id"
            :label="$t('Seasons.ImportUrl')"
            :hint="$t('Seasons.ImportExplanation')"
            persistent-hint
            @keyup.enter="importSeason"
          />
          <v-switch
            v-model="challonge.import_teams"
            :label="$t('Seasons.ImportTeams')"
            color="primary"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="busy" @click="importDialog = false">{{
            $t("misc.Cancel")
          }}</v-btn>
          <v-btn
            color="primary"
            :loading="busy"
            :disabled="!challonge.tournament_id"
            @click="importSeason"
          >
            {{ $t("misc.Import") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { seasons as seasonsApi } from "@/api";
import type { Season } from "@/api/types";
import SeasonDialog from "@/components/SeasonDialog.vue";
import { useOnlyMine } from "@/composables/useOnlyMine";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { formatDate, seasonStatus, type SeasonStatus } from "@/utils/format";

const STATUS_COLORS: Record<SeasonStatus, string> = {
  upcoming: "info",
  active: "success",
  ended: "grey"
};

const mine = useOnlyMine("seasons");
const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

const seasons = ref<(Season & { owner?: string })[]>([]);
const loading = ref(true);
const busy = ref(false);
const search = ref("");
const dialog = ref(false);
const editing = ref<Season | null>(null);
const toDelete = ref<Season | null>(null);
const importDialog = ref(false);
const challonge = reactive({ tournament_id: "", import_teams: true });

const rows = computed(() =>
  seasons.value.map((season) => ({ ...season, status: seasonStatus(season) }))
);

const headers = computed(() => [
  { title: t("Seasons.ID"), key: "id" },
  { title: t("Seasons.Name"), key: "name" },
  { title: "", key: "status", sortable: false },
  { title: t("Seasons.StartDate"), key: "start_date" },
  { title: t("Seasons.EndDate"), key: "end_date" },
  { title: t("Matches.Owner"), key: "owner" },
  { title: "", key: "actions", sortable: false, align: "end" as const }
]);

function statusLabel(status: SeasonStatus) {
  return {
    upcoming: t("Seasons.StatusUpcoming"),
    active: t("Seasons.StatusActive"),
    ended: t("Seasons.StatusEnded")
  }[status];
}

async function load() {
  loading.value = true;
  try {
    await auth.load();
    seasons.value = mine.value && auth.loggedIn ? await seasonsApi.mine() : await seasonsApi.all();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loading.value = false;
  }
}

function openDialog(season: Season | null) {
  editing.value = season;
  dialog.value = true;
}

async function confirmDelete() {
  if (!toDelete.value) return;
  busy.value = true;
  try {
    await seasonsApi.remove(toDelete.value.id);
    ui.notify(t("Seasons.SeasonDeleted"), "success");
    toDelete.value = null;
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

async function importSeason() {
  if (!challonge.tournament_id || busy.value) return;
  busy.value = true;
  try {
    const result = await seasonsApi.importChallonge({ ...challonge });
    ui.notify(result.message, "success");
    importDialog.value = false;
    challonge.tournament_id = "";
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

watch(mine, load);
onMounted(load);
</script>
