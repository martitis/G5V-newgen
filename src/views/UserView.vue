<template>
  <v-container fluid>
    <v-skeleton-loader v-if="loading && !profile" type="card, card" />
    <v-alert v-else-if="!profile" type="warning" variant="tonal">{{
      $t("misc.NotFoundText")
    }}</v-alert>

    <template v-else>
      <v-card class="mb-4">
        <v-card-text class="d-flex align-center flex-wrap ga-4">
          <v-avatar size="72" color="surface-variant">
            <v-img v-if="profile.medium_image" :src="profile.medium_image" alt="" />
            <v-icon v-else size="40">mdi-account</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap ga-2">
              <span class="text-headline-small">{{ profile.name || profile.steam_id }}</span>
              <v-chip v-if="profile.super_admin" color="primary" size="small" label>{{
                $t("User.SuperAdmin")
              }}</v-chip>
              <v-chip v-else-if="profile.admin" color="orange" size="small" label>{{
                $t("User.Admin")
              }}</v-chip>
            </div>
            <div v-if="profile.steam_id" class="text-body-medium text-medium-emphasis mt-1">
              <a
                :href="steamProfileUrl(profile.steam_id)"
                target="_blank"
                rel="noopener"
                class="app-link"
              >
                <v-icon size="small">mdi-steam</v-icon> {{ profile.steam_id }}
              </a>
            </div>
            <div v-if="profile.id == null" class="text-body-medium text-medium-emphasis mt-1">
              {{ $t("User.ClaimUser") }}
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" :title="$t('User.Stats')">
        <v-card-text>
          <PlayerStatsSummary v-if="playerStats.length" :stats="playerStats" />
          <div v-else class="text-medium-emphasis">{{ $t("User.NoStats") }}</div>
        </v-card-text>
      </v-card>

      <MatchesTable :load="loadRecent" :title="$t('User.RecentMatches')" class="mb-4" />

      <v-card v-if="isSelf" class="mb-4" :title="$t('User.Settings')">
        <v-card-text>
          <div class="text-title-small mb-1">{{ $t("User.API") }}</div>
          <div class="text-body-small text-medium-emphasis mb-2">{{ $t("User.ApiHint") }}</div>
          <div class="d-flex flex-wrap align-center ga-2 mb-6">
            <v-text-field
              :model-value="profile.api_key ?? ''"
              :type="showApi ? 'text' : 'password'"
              :append-inner-icon="showApi ? 'mdi-eye' : 'mdi-eye-off'"
              readonly
              hide-details
              density="compact"
              style="min-width: 260px; max-width: 640px"
              @click:append-inner="showApi = !showApi"
            />
            <v-btn
              variant="tonal"
              prepend-icon="mdi-content-copy"
              :disabled="!profile.api_key"
              @click="copyApiKey"
            >
              {{ $t("User.Copy") }}
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              @click="confirmApiReset = true"
            >
              {{ $t("User.ResetAPI") }}
            </v-btn>
          </div>

          <div class="text-title-small mb-2">{{ $t("User.Challonge") }}</div>
          <div class="d-flex flex-wrap align-center ga-2 mb-6">
            <v-text-field
              v-model="challongeKey"
              :type="showChallonge ? 'text' : 'password'"
              :append-inner-icon="showChallonge ? 'mdi-eye' : 'mdi-eye-off'"
              autocomplete="off"
              hide-details
              density="compact"
              style="min-width: 260px; max-width: 640px"
              @click:append-inner="showChallonge = !showChallonge"
            />
            <v-btn color="secondary" variant="tonal" :loading="busy" @click="saveChallongeKey">
              {{ $t("User.ChallongeSave") }}
            </v-btn>
          </div>

          <!-- Accounts with a username can change their password; Steam-only accounts can add one. -->
          <v-btn
            v-if="profile.username"
            variant="tonal"
            prepend-icon="mdi-lock-reset"
            @click="passwordDialog = true"
          >
            {{ $t("User.ResetPass") }}
          </v-btn>
          <v-btn
            v-else-if="auth.localLogin"
            variant="tonal"
            prepend-icon="mdi-account-key"
            @click="passwordDialog = true"
          >
            {{ $t("User.AddLogin") }}
          </v-btn>
        </v-card-text>
      </v-card>

      <UserMapList
        v-if="profile.id != null && (isSelf || auth.isAdmin)"
        :user-id="profile.id"
        :title="$t('User.UserMaps', { players: profile.name })"
        :editable="isSelf && auth.isAdmin"
      />
    </template>

    <PasswordDialog
      v-if="profile?.id != null"
      v-model="passwordDialog"
      :user-id="profile.id"
      :add-login="!profile.username"
      @saved="load"
    />

    <v-dialog v-model="confirmApiReset" max-width="480">
      <v-card :title="$t('User.ResetAPI')" :text="$t('User.ApiResetConfirm')">
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmApiReset = false">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn color="error" :loading="busy" @click="resetApiKey">{{ $t("misc.Confirm") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { stats, users } from "@/api";
import { ApiError } from "@/api/http";
import type { PlayerStat, User } from "@/api/types";
import MatchesTable from "@/components/MatchesTable.vue";
import PasswordDialog from "@/components/PasswordDialog.vue";
import PlayerStatsSummary from "@/components/PlayerStatsSummary.vue";
import UserMapList from "@/components/UserMapList.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { copyText } from "@/utils/clipboard";
import { isSteamId64, steamProfileUrl } from "@/utils/format";

const route = useRoute();
const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

/** A panel account, or (id null) a player who only appears in match stats. */
const profile = ref<User | null>(null);
const playerStats = ref<PlayerStat[]>([]);
const loading = ref(true);
const busy = ref(false);
const showApi = ref(false);
const showChallonge = ref(false);
const challongeKey = ref("");
const passwordDialog = ref(false);
const confirmApiReset = ref(false);

const isSelf = computed(() => profile.value?.id != null && profile.value.id === auth.user?.id);

const loadRecent = computed(() => {
  const user = profile.value;
  return () => {
    if (!user) return Promise.resolve([]);
    return user.id != null
      ? users.recentMatches(user.id)
      : stats.playerRecentMatches(user.steam_id);
  };
});

/** /user/:id takes a user id or a SteamID64; /user is the logged-in user. */
async function findProfile(param: string | undefined): Promise<User | null> {
  if (!param) return auth.user?.id != null ? users.get(auth.user.id) : null;
  try {
    return await users.get(param);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404 && isSteamId64(param))) throw error;
    return {
      id: null,
      steam_id: param,
      name: "",
      admin: false,
      super_admin: false,
      small_image: "",
      medium_image: "",
      large_image: ""
    };
  }
}

async function load() {
  loading.value = true;
  try {
    await auth.load();
    const found = await findProfile(route.params.id as string | undefined);
    profile.value = found;
    challongeKey.value = found?.challonge_api_key ?? "";
    playerStats.value = found?.steam_id ? await stats.player(found.steam_id) : [];
    // Players without an account: show the name they played under.
    if (found && found.id == null && !found.name) found.name = playerStats.value.at(-1)?.name ?? "";
  } catch (error) {
    profile.value = null;
    ui.notifyError(error);
  } finally {
    loading.value = false;
  }
}

async function copyApiKey() {
  if (await copyText(profile.value?.api_key ?? "")) ui.notify(t("User.Copied"), "success");
  else ui.notify(t("misc.CopyFailed"), "warning");
}

async function resetApiKey() {
  if (!profile.value?.id) return;
  busy.value = true;
  try {
    await users.update({ id: profile.value.id, new_api: 1 });
    const updated = await users.get(profile.value.id);
    profile.value.api_key = updated.api_key;
    showApi.value = true;
    confirmApiReset.value = false;
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

async function saveChallongeKey() {
  if (!profile.value?.id) return;
  busy.value = true;
  try {
    const result = await users.update({
      id: profile.value.id,
      challonge_api_key: challongeKey.value
    });
    ui.notify(result.message, "success");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busy.value = false;
  }
}

watch(() => route.params.id, load, { immediate: true });
</script>
