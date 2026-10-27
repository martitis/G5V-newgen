import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import i18n from "@/plugins/i18n";

declare module "vue-router" {
  interface RouteMeta {
    /** Only for logged-in users; others are sent to the home page. */
    requiresAuth?: boolean;
    /** Only for admins and super admins. */
    requiresAdmin?: boolean;
    /** Only for super admins. */
    requiresSuperAdmin?: boolean;
    /** Lists only the user's own items ("My ..." pages). */
    mine?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  { path: "/", name: "Home", component: () => import("@/views/HomeView.vue") },
  { path: "/matches", name: "Matches", component: () => import("@/views/MatchesView.vue") },
  // The old "My …" pages are the lists with "Only mine" on.
  { path: "/mymatches", redirect: { path: "/matches", query: { mine: "1" } } },
  {
    path: "/match/create",
    name: "CreateMatch",
    component: () => import("@/views/CreateMatchView.vue"),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { path: "/match/:id(\\d+)", name: "Match", component: () => import("@/views/MatchView.vue") },
  { path: "/teams", name: "Teams", component: () => import("@/views/TeamsView.vue") },
  { path: "/myteams", redirect: { path: "/teams", query: { mine: "1" } } },
  // Teams are created in a dialog on the teams list now; keep the old URL working.
  { path: "/teams/create", redirect: { path: "/teams", query: { create: "1" } } },
  { path: "/teams/:id(\\d+)", name: "Team", component: () => import("@/views/TeamView.vue") },
  { path: "/servers", name: "Servers", component: () => import("@/views/ServersView.vue") },
  { path: "/myservers", redirect: { path: "/servers", query: { mine: "1" } } },
  { path: "/seasons", name: "Seasons", component: () => import("@/views/SeasonsView.vue") },
  { path: "/myseasons", redirect: { path: "/seasons", query: { mine: "1" } } },
  { path: "/season/:id(\\d+)", name: "Season", component: () => import("@/views/SeasonView.vue") },
  {
    path: "/user",
    name: "MyUser",
    component: () => import("@/views/UserView.vue"),
    meta: { requiresAuth: true }
  },
  { path: "/user/:id", name: "User", component: () => import("@/views/UserView.vue") },
  { path: "/pugs", name: "Pugs", component: () => import("@/views/PugsView.vue") },
  { path: "/pug/:id(\\d+)", name: "Pug", component: () => import("@/views/PugView.vue") },
  {
    path: "/tournaments",
    name: "Tournaments",
    component: () => import("@/views/TournamentsView.vue")
  },
  {
    path: "/tournament/:id(\\d+)",
    name: "Tournament",
    component: () => import("@/views/TournamentView.vue")
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/views/AdminView.vue"),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { path: "/metrics", name: "Metrics", component: () => import("@/views/MetricsView.vue") },
  {
    path: "/leaderboard",
    name: "Leaderboard",
    component: () => import("@/views/PlayerLeaderboardView.vue")
  },
  {
    path: "/leaderboard/teams",
    name: "TeamLeaderboard",
    component: () => import("@/views/TeamLeaderboardView.vue")
  },
  {
    path: "/leaderboard/teams/:seasonid(\\d+)",
    name: "SeasonTeamLeaderboard",
    component: () => import("@/views/TeamLeaderboardView.vue")
  },
  {
    path: "/leaderboard/:seasonid(\\d+)",
    name: "SeasonPlayerLeaderboard",
    component: () => import("@/views/PlayerLeaderboardView.vue")
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFoundView.vue")
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 }
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin) return true;
  const auth = useAuthStore();
  await auth.load();
  if (!auth.loggedIn) {
    useUiStore().notify(i18n.global.t("misc.LoginRequired"), "warning");
    return { name: "Home" };
  }
  // The API refuses these actions too; this only keeps users off pages they can't use.
  if (
    (to.meta.requiresAdmin && !auth.isAdmin) ||
    (to.meta.requiresSuperAdmin && !auth.isSuperAdmin)
  ) {
    useUiStore().notify(i18n.global.t("misc.AdminRequired"), "warning");
    return { name: "Home" };
  }
  return true;
});

export default router;
