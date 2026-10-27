<template>
  <v-card>
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <span>{{ $t("Admin.TabUsers") }}</span>
      <v-chip size="small" variant="tonal">{{ users.length }}</v-chip>
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
    </v-card-title>
    <v-data-table
      :headers="headers"
      :items="users"
      :search="search"
      :loading="loading"
      :loading-text="$t('misc.LoadText')"
      item-value="id"
      density="comfortable"
    >
      <template #[`item.name`]="{ item }">
        <div class="d-flex align-center ga-2">
          <v-avatar size="28" color="surface-variant">
            <v-img v-if="item.small_image" :src="item.small_image" alt="" />
            <v-icon v-else size="18">mdi-account</v-icon>
          </v-avatar>
          <router-link :to="`/user/${item.id}`" class="app-link">{{
            item.name || `#${item.id}`
          }}</router-link>
          <v-chip
            v-if="item.username"
            size="x-small"
            variant="tonal"
            label
            :title="$t('Admin.LocalLogin')"
          >
            {{ item.username }}
          </v-chip>
        </div>
      </template>
      <template #[`item.steam_id`]="{ item }">
        <span>{{ item.steam_id }}</span>
        <v-chip
          v-if="item.steam_id && !item.steam_verified"
          size="x-small"
          color="warning"
          variant="tonal"
          label
          class="ml-1"
          :title="$t('Admin.UnverifiedHint')"
        >
          {{ $t("Admin.Unverified") }}
        </v-chip>
      </template>
      <template #[`item.role`]="{ item }">
        <div class="d-flex align-center ga-2">
          <v-select
            :model-value="roleOf(item)"
            :items="roleItems"
            :disabled="
              (item.steam_id && !item.steam_verified) ||
              (!auth.isSuperAdmin && Number(item.super_admin) > 0) ||
              savingId === item.id
            "
            :loading="savingId === item.id"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 160px; max-width: 180px"
            @update:model-value="(role) => setRole(item, role)"
          />
          <v-chip
            v-if="item.roles_from_config && (item.admin || item.super_admin)"
            size="x-small"
            variant="tonal"
            label
            :title="$t('Admin.FromConfigHint')"
          >
            {{ $t("Admin.FromConfig") }}
          </v-chip>
        </div>
      </template>
      <template #[`item.counts`]="{ item }">
        <span class="text-medium-emphasis"
          >{{ item.matches }} / {{ item.teams }} / {{ item.servers }}</span
        >
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { admin, users as usersApi } from "@/api";
import type { AdminUser } from "@/api/types";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

type Role = "user" | "admin" | "super_admin";

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();
const users = ref<AdminUser[]>([]);
const loading = ref(true);
const search = ref("");
const savingId = ref<number | null>(null);

const headers = computed(() => [
  { title: t("User.Name"), key: "name" },
  { title: t("Team.SteamIDTitle"), key: "steam_id" },
  { title: t("Admin.Role"), key: "role", sortable: false },
  { title: t("Admin.Counts"), key: "counts", sortable: false, align: "end" as const }
]);
// Only super admins hand out the super admin role (the API refuses it from admins).
const roleItems = computed(() => [
  { value: "user", title: t("Admin.RoleUser") },
  { value: "admin", title: t("Admin.RoleAdmin") },
  {
    value: "super_admin",
    title: t("Admin.RoleSuperAdmin"),
    props: { disabled: !auth.isSuperAdmin }
  }
]);

const roleOf = (user: AdminUser): Role =>
  Number(user.super_admin) ? "super_admin" : Number(user.admin) ? "admin" : "user";

async function load() {
  loading.value = true;
  try {
    users.value = await admin.users();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    loading.value = false;
  }
}

async function setRole(user: AdminUser, role: Role | null) {
  if (!role || role === roleOf(user)) return;
  savingId.value = user.id;
  try {
    await usersApi.update({
      id: user.id,
      admin: role === "admin" ? 1 : 0,
      super_admin: role === "super_admin" ? 1 : 0
    });
    ui.notify(t("Admin.RoleSaved"), "success");
    // Your own role is in the session; refresh it.
    if (user.id === auth.user?.id) await auth.load(true);
    await load();
  } catch (error) {
    ui.notifyError(error);
  } finally {
    savingId.value = null;
  }
}

onMounted(load);
</script>
