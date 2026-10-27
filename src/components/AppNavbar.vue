<template>
  <v-app-bar color="appbar" density="comfortable" flat border="b">
    <v-app-bar-nav-icon v-if="!mdAndUp" @click.stop="drawer = !drawer" />
    <v-app-bar-title>{{ appTitle() }}</v-app-bar-title>
    <GlobalSearch class="mx-2" />
    <template #append>
      <!-- Nothing until the login check has answered, so logged-in users don't see the login buttons flash. -->
      <template v-if="auth.loaded && !auth.loggedIn">
        <!-- With panel accounts enabled, one button opens the choice (Steam first); otherwise Steam is one click. -->
        <template v-if="auth.localLogin">
          <!-- Icon only on narrow screens, so it never crowds the search field. -->
          <v-btn
            v-if="smAndDown"
            icon="mdi-login-variant"
            variant="tonal"
            class="ml-2 mr-1"
            :aria-label="$t('Login.SignIn')"
            @click="loginDialog = true"
          />
          <v-btn
            v-else
            variant="tonal"
            prepend-icon="mdi-login-variant"
            class="ml-4 mr-2"
            @click="loginDialog = true"
          >
            {{ $t("Login.SignIn") }}
          </v-btn>
        </template>
        <v-btn v-else :href="apiUrl('/auth/steam')" class="ml-4 mr-2" variant="text" rounded>
          <img :src="`${base}img/login_small.png`" :alt="$t('Login.WithSteam')" />
        </v-btn>
      </template>
      <template v-else-if="auth.loggedIn">
        <v-btn :to="`/user/${auth.user?.id}`" icon variant="text" class="mr-1">
          <v-avatar size="32" :image="auth.user?.small_image || undefined" icon="mdi-account" />
        </v-btn>
        <v-btn icon variant="text" @click="logout">
          <v-icon>mdi-logout-variant</v-icon>
          <v-tooltip activator="parent" location="bottom">{{ $t("Navbar.Logout") }}</v-tooltip>
        </v-btn>
      </template>
    </template>
  </v-app-bar>

  <!-- Always open on wide screens; a slide-out drawer on phones so it doesn't cover the page. -->
  <v-navigation-drawer v-model="drawer" :permanent="mdAndUp">
    <!-- One entry per area; create/add actions and the "Only mine" toggle live on the lists. -->
    <v-list nav density="comfortable" color="primary">
      <v-list-item to="/" exact :title="$t('Navbar.Home')" prepend-icon="mdi-home" />
      <v-list-subheader>{{ $t("Navbar.SectionPlay") }}</v-list-subheader>
      <v-list-item to="/matches" :title="$t('Navbar.Matches')" prepend-icon="mdi-sword-cross" />
      <v-list-item
        to="/tournaments"
        :title="$t('Navbar.Tournaments')"
        prepend-icon="mdi-tournament"
      />
      <v-list-item to="/pugs" :title="$t('Navbar.Pugs')" prepend-icon="mdi-account-multiple-plus" />
      <v-list-item to="/seasons" :title="$t('Navbar.Seasons')" prepend-icon="mdi-trophy" />
      <v-list-subheader>{{ $t("Navbar.SectionManage") }}</v-list-subheader>
      <v-list-item to="/teams" :title="$t('Navbar.Teams')" prepend-icon="mdi-account-group" />
      <v-list-item to="/servers" :title="$t('Navbar.Servers')" prepend-icon="mdi-server" />
      <v-list-subheader>{{ $t("Navbar.SectionStats") }}</v-list-subheader>
      <v-list-item to="/leaderboard" :title="$t('Navbar.Leaderboards')" prepend-icon="mdi-podium" />
      <v-list-item to="/metrics" :title="$t('Navbar.Stats')" prepend-icon="mdi-chart-box" />
      <template v-if="auth.isAdmin">
        <v-divider class="my-2" />
        <v-list-item to="/admin" :title="$t('Navbar.Admin')" prepend-icon="mdi-shield-crown" />
      </template>
    </v-list>
  </v-navigation-drawer>

  <LoginDialog v-model="loginDialog" />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { apiUrl, appTitle } from "@/config";
import { useAuthStore } from "@/stores/auth";
import GlobalSearch from "@/components/GlobalSearch.vue";
import LoginDialog from "@/components/LoginDialog.vue";

const base = import.meta.env.BASE_URL;
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { mdAndUp, smAndDown } = useDisplay();

const drawer = ref(mdAndUp.value);
const loginDialog = ref(false);

// On phones, close the drawer after navigating.
watch(
  () => route.fullPath,
  () => {
    if (!mdAndUp.value) drawer.value = false;
  }
);

async function logout() {
  await auth.logout();
  router.push("/");
}
</script>
