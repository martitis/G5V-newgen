<template>
  <v-dialog v-model="show" max-width="480">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>{{ $t("Login.title") }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="show = false" />
      </v-card-title>

      <v-card-text>
        <v-btn
          :href="apiUrl('/auth/steam')"
          color="primary"
          size="large"
          prepend-icon="mdi-steam"
          block
        >
          {{ $t("Login.WithSteam") }}
        </v-btn>
        <div class="text-body-small text-medium-emphasis text-center mt-2">
          {{ $t("Login.SteamHint") }}
        </div>

        <template v-if="auth.localLogin">
          <div class="d-flex align-center ga-3 my-5">
            <v-divider />
            <span class="text-body-small text-medium-emphasis text-no-wrap">
              {{ $t("Login.OrPanelAccount") }}
            </span>
            <v-divider />
          </div>

          <v-tabs v-model="tab" grow density="comfortable" class="mb-4">
            <v-tab value="login">{{ $t("Login.Login") }}</v-tab>
            <v-tab value="register">{{ $t("Login.Register") }}</v-tab>
          </v-tabs>

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <v-form v-if="tab === 'login'" ref="loginForm" @submit.prevent="login">
            <v-text-field
              v-model="username"
              :label="$t('Login.UsernameLabel')"
              autocomplete="username"
              prepend-inner-icon="mdi-account"
              :rules="[required]"
              autofocus
            />
            <v-text-field
              v-model="password"
              :label="$t('Login.PasswordLabel')"
              :type="showPass ? 'text' : 'password'"
              :append-inner-icon="showPass ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock"
              :rules="[required]"
              @click:append-inner="showPass = !showPass"
            />
            <v-btn type="submit" color="primary" variant="tonal" :loading="busy" block>
              {{ $t("Login.Login") }}
            </v-btn>
          </v-form>

          <v-form v-else ref="registerForm" @submit.prevent="register">
            <v-text-field
              v-model="steamId"
              :label="$t('Login.SteamIdLabel')"
              :hint="$t('Login.SteamIdHint')"
              persistent-hint
              prepend-inner-icon="mdi-steam"
              class="mb-3"
              autofocus
            />
            <v-text-field
              v-model="username"
              :label="$t('Login.UsernameLabel')"
              :hint="$t('Login.UsernameHint')"
              autocomplete="username"
              prepend-inner-icon="mdi-account"
              :rules="[required, usernameRule]"
              class="mb-1"
            />
            <v-text-field
              v-model="password"
              :label="$t('Login.PasswordLabel')"
              :hint="$t('Login.PasswordHint', { n: auth.passwordMin })"
              :type="showPass ? 'text' : 'password'"
              :append-inner-icon="showPass ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock"
              :rules="[required, passwordRule]"
              class="mb-1"
              @click:append-inner="showPass = !showPass"
            />
            <v-text-field
              v-model="password2"
              :label="$t('Login.RepeatPassword')"
              :type="showPass ? 'text' : 'password'"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock-check"
              :rules="[required, sameRule]"
            />
            <div class="text-body-small text-medium-emphasis mb-3">
              {{ $t("Login.AdminNote") }}
            </div>
            <v-btn type="submit" color="primary" variant="tonal" :loading="busy" block>
              {{ $t("Login.CreateAccount") }}
            </v-btn>
          </v-form>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { auth as authApi } from "@/api";
import { apiUrl } from "@/config";
import { useAuthStore } from "@/stores/auth";
import { usernameRule as usernameValid } from "@/utils/credentials";

/** Sign in with Steam, or with a panel account (sign in / create account) when the panel allows local logins. */
const show = defineModel<boolean>({ default: false });
const { t } = useI18n();
const auth = useAuthStore();

type Form = { validate: () => Promise<{ valid: boolean }> } | null;
const loginForm = ref<Form>(null);
const registerForm = ref<Form>(null);
const tab = ref<"login" | "register">("login");
const steamId = ref("");
const username = ref("");
const password = ref("");
const password2 = ref("");
const showPass = ref(false);
const busy = ref(false);
const error = ref("");

const required = (value: string) => !!value?.trim() || t("misc.Required");
const usernameRule = (value: string) => usernameValid(value) || t("Login.UsernameHint");
const passwordRule = (value: string) =>
  (value?.length ?? 0) >= auth.passwordMin || t("Login.PasswordHint", { n: auth.passwordMin });
const sameRule = (value: string) => value === password.value || t("Login.PasswordsDiffer");

// A fresh form each time, and the error belongs to the tab it came from.
watch(show, (open) => {
  if (!open) return;
  password.value = "";
  password2.value = "";
  error.value = "";
});
watch(tab, () => (error.value = ""));

async function submit(form: Form, action: () => Promise<unknown>) {
  if (!(await form?.validate())?.valid) return;
  busy.value = true;
  error.value = "";
  try {
    await action();
    await auth.load(true);
    show.value = false;
    password.value = "";
    password2.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

const login = () =>
  submit(loginForm.value, () => authApi.login(username.value.trim(), password.value));
const register = () =>
  submit(registerForm.value, () =>
    authApi.register(username.value.trim(), password.value, steamId.value.trim())
  );
</script>
