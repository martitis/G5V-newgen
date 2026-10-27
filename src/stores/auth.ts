import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { auth } from "@/api";
import type { User } from "@/api/types";

/** The logged-in user, loaded once for the whole app (the old panel asked the API on every component). */
export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  /** False until the first /isLoggedIn answer (or failure); pages can wait for it. */
  const loaded = ref(false);
  /** Whether username/password accounts are enabled, and the password length limits (GET /auth/options). */
  const localLogin = ref(false);
  const passwordMin = ref(8);
  let pending: Promise<void> | null = null;

  const loggedIn = computed(() => user.value?.id != null);
  const isSuperAdmin = computed(() => Boolean(user.value?.super_admin));
  const isAdmin = computed(() => Boolean(user.value?.admin) || isSuperAdmin.value);

  function load(force = false): Promise<void> {
    if (pending && !force) return pending;
    pending = (async () => {
      try {
        const [me, options] = await Promise.all([auth.me(), auth.options().catch(() => null)]);
        user.value = me;
        if (options) {
          localLogin.value = options.local_login;
          passwordMin.value = options.password_min;
        }
      } catch (error) {
        // API unreachable: behave as logged out.
        console.error(error);
        user.value = null;
      } finally {
        loaded.value = true;
      }
    })();
    return pending;
  }

  async function logout() {
    try {
      await auth.logout();
    } finally {
      user.value = null;
    }
  }

  /**
   * May change something: any admin (game servers are the exception, managed by super admins only; the servers
   * page checks isSuperAdmin). Other users only read. The owner argument is kept for the callers.
   */
  function canEdit(ownerId?: number | null) {
    void ownerId;
    return isAdmin.value;
  }

  return {
    user,
    loaded,
    localLogin,
    passwordMin,
    loggedIn,
    isAdmin,
    isSuperAdmin,
    load,
    logout,
    canEdit
  };
});
