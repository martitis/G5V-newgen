/**
 * Typed G5API calls. Every function returns the payload or throws an ApiError (see ./http).
 * Write endpoints read `req.body[0]` on the API, so bodies are sent as a one-element array.
 */
import { del, get, orEmpty, post, put, type MessageResponse } from "./http";
import type { MatchTemplateSettings } from "@/utils/matchPresets";
import type {
  AdminUser,
  AuditEntry,
  BackupEntry,
  LeaderboardPlayer,
  MapListEntry,
  MapStat,
  Match,
  MatchSummary,
  MatchTimeline,
  OpenPugQueue,
  PlayerStat,
  PugPlayer,
  PugQueue,
  ReadyState,
  ResolvedMember,
  ScheduledMatch,
  SearchResults,
  Season,
  Server,
  ServerState,
  StatusPlayer,
  SummaryQuery,
  Team,
  TeamStanding,
  TournamentDetail,
  TournamentSummary,
  User,
  Veto,
  VetoSide
} from "./types";

type Body = Record<string, unknown>;
const wrap = (body: Body) => [body];

export const auth = {
  /** The logged-in user, or null when logged out. */
  async me(): Promise<User | null> {
    const data = await get<User | false>("/isLoggedIn");
    return data || null;
  },
  login: (username: string, password: string) =>
    post<MessageResponse>("/login", { username, password }),
  /** steam_id may be a SteamID64, a profile link or a custom profile name. */
  register: (username: string, password: string, steam_id: string) =>
    post<MessageResponse>("/register", { username, password, steam_id }),
  /** How users can sign in on this panel. */
  options: () =>
    get<{ steam: boolean; local_login: boolean; password_min: number; password_max: number }>(
      "/auth/options"
    ),
  logout: () => post<MessageResponse>("/logout")
};

export const users = {
  get: async (id: number | string) => (await get<{ user: User }>(`/users/${id}`)).user,
  all: async () => (await orEmpty(get<{ users: User[] }>("/users"), { users: [] })).users,
  update: (body: Body) => put<MessageResponse>("/users", wrap(body)),
  recentMatches: async (id: number | string) =>
    (await orEmpty(get<{ matches: Match[] }>(`/users/${id}/recent`), { matches: [] })).matches
};

export const maps = {
  list: async (userId: number) =>
    (await orEmpty(get<{ maplist: MapListEntry[] }>(`/maps/${userId}`), { maplist: [] })).maplist,
  enabled: async (userId: number) =>
    (await orEmpty(get<{ maplist: MapListEntry[] }>(`/maps/${userId}/enabled`), { maplist: [] }))
      .maplist,
  create: (body: Body) => post<MessageResponse>("/maps", wrap(body)),
  update: (body: Body) => put<MessageResponse>("/maps", wrap(body)),
  remove: (body: Body) => del<MessageResponse>("/maps", wrap(body))
};

export const teams = {
  get: async (id: number | string) => (await get<{ team: Team }>(`/teams/${id}`)).team,
  basic: async (id: number | string) => (await get<{ team: Team }>(`/teams/${id}/basic`)).team,
  all: async () => (await orEmpty(get<{ teams: Team[] }>("/teams"), { teams: [] })).teams,
  mine: async () => (await orEmpty(get<{ teams: Team[] }>("/teams/myteams"), { teams: [] })).teams,
  recentMatches: async (id: number | string) =>
    (await orEmpty(get<{ matches: Match[] }>(`/teams/${id}/recent`), { matches: [] })).matches,
  result: async (teamId: number | string, matchId: number | string) =>
    (await get<{ result: string }>(`/teams/${teamId}/result/${matchId}`)).result,
  create: (body: Body) => post<MessageResponse & { id: number }>("/teams", wrap(body)),
  update: (body: Body) => put<MessageResponse>("/teams", wrap(body)),
  /** Deletes the team, or only one member when `steam_id` is given. */
  remove: (body: Body) => del<MessageResponse>("/teams", wrap(body)),
  importChallonge: (tournament_id: string) =>
    post<MessageResponse>("/teams/challonge", wrap({ tournament_id })),
  /** SteamID64, Steam name and avatar for any Steam identifiers (max 50); steam_id null when invalid. */
  resolveMembers: async (ids: string[]) =>
    (await post<{ members: ResolvedMember[] }>("/teams/members/resolve", wrap({ ids }))).members
};

export const matches = {
  get: async (id: number | string) => (await get<{ match: Match }>(`/matches/${id}`)).match,
  all: async () => (await orEmpty(get<{ matches: Match[] }>("/matches"), { matches: [] })).matches,
  mine: async () =>
    (await orEmpty(get<{ matches: Match[] }>("/matches/mymatches"), { matches: [] })).matches,
  limit: async (limit: number) =>
    (await orEmpty(get<{ matches: Match[] }>(`/matches/limit/${limit}`), { matches: [] })).matches,
  create: (body: Body) => post<MessageResponse & { id: number }>("/matches", wrap(body)),
  update: (body: Body) => put<MessageResponse>("/matches", wrap(body)),
  /** `{ match_id }` deletes one finished match, `{ all_cancelled: true }` all of the user's cancelled ones. */
  remove: (body: Body) => del<MessageResponse>("/matches", wrap(body)),
  /** The MatchZy config JSON (owner or super admin). */
  config: (id: number | string) => get<Record<string, unknown>>(`/matches/${id}/config`),
  streamUrl: (id: number | string) => `/matches/${id}/stream`,
  /** One page of the match list (live and upcoming first). */
  summary: (query: SummaryQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "" && value !== false)
        params.set(key, String(value));
    }
    return get<{ matches: MatchSummary[]; total: number }>(`/matches/summary?${params.toString()}`);
  },
  /** "summaries" events with the given and all active matches. */
  summaryStreamUrl: (ids: number[]) => `/matches/summary/stream?ids=${ids.join(",")}`,
  /** One stream with match, mapstats, playerstats, vetodata and vetosidedata events. */
  liveStreamUrl: (id: number | string) => `/matches/${id}/live/stream`,
  // Admin actions (RCON).
  pause: (id: number) => post<MessageResponse>(`/matches/${id}/pause`),
  unpause: (id: number) => post<MessageResponse>(`/matches/${id}/unpause`),
  cancel: (id: number) => post<MessageResponse>(`/matches/${id}/cancel`),
  restart: (id: number) => post<MessageResponse>(`/matches/${id}/restart`),
  forfeit: (id: number, winner: 1 | 2) => post<MessageResponse>(`/matches/${id}/forfeit/${winner}`),
  addPlayer: (id: number, body: Body) =>
    put<MessageResponse & { response?: string }>(`/matches/${id}/adduser`, wrap(body)),
  removePlayer: (id: number, steam_id: string) =>
    put<MessageResponse & { response?: string }>(`/matches/${id}/removeuser`, wrap({ steam_id })),
  addSpectator: (id: number, body: Body) =>
    put<MessageResponse & { response?: string }>(`/matches/${id}/addspec`, wrap(body)),
  rcon: (id: number, rcon_command: string) =>
    put<MessageResponse & { response?: string }>(`/matches/${id}/rcon`, wrap({ rcon_command })),
  backups: async (id: number) =>
    (await get<{ response: BackupEntry[] }>(`/matches/${id}/backup`)).response ?? [],
  /** Rounds, kills (newest 500), bombs and pause state. */
  timeline: (id: number | string) => get<MatchTimeline>(`/matches/${id}/timeline`),
  /** Admin match control (MatchZy command over RCON); `response` is the server's reply. */
  control: (id: number, body: Body) =>
    post<MessageResponse & { response?: string }>(`/matches/${id}/control`, wrap(body)),
  /** RCON reachability and MatchZy's get5_status. */
  serverStatus: (id: number) =>
    get<{ reachable: boolean; status: Record<string, unknown> | null }>(
      `/matches/${id}/server/status`
    ),
  /** Team ready state, null unless the match is running on its server. */
  ready: async (id: number) =>
    (await get<{ ready: ReadyState | null }>(`/matches/${id}/ready`)).ready,
  /** The heartbeat's last check of the match's game server (public). */
  serverState: async (id: number) =>
    (await get<{ server_state: ServerState | null }>(`/matches/${id}/server/state`)).server_state,
  /** Checks the server now and resyncs missed scores (owner/admin). */
  serverCheck: (id: number) => post<MessageResponse>(`/matches/${id}/server/check`),
  /** Loads the match onto its server again without wiping stats (owner/admin). */
  serverReload: (id: number) => post<MessageResponse>(`/matches/${id}/server/reload`),
  serverDismiss: (id: number) => post<MessageResponse>(`/matches/${id}/server/dismiss`),
  /** Players on the match's server, from CS2's status (no Steam IDs there). */
  serverPlayers: (id: number) =>
    get<{ reachable: boolean; players: StatusPlayer[] }>(`/matches/${id}/server/players`),
  kick: (id: number, userid: number, name: string) =>
    post<MessageResponse & { response?: string }>(
      `/matches/${id}/server/kick`,
      wrap({ userid, name })
    ),
  /** Re-sends the API's event/backup/demo URLs to the server (after the API's address changed). */
  updateCallbacks: (id: number) =>
    post<MessageResponse & { response?: string }>(`/matches/${id}/callbacks`),
  restoreBackup: (id: number, backup_name: string) =>
    post<MessageResponse & { response?: string }>(`/matches/${id}/backup`, wrap({ backup_name })),
  remoteBackups: async (id: number) =>
    (await orEmpty(get<{ response: string[] }>(`/matches/${id}/backup/remote`), { response: [] }))
      .response ?? [],
  restoreRemoteBackup: (id: number, server_id: number, backup_file: string) =>
    post<MessageResponse & { response?: string }>(
      `/matches/${id}/backup/remote`,
      wrap({ server_id, backup_file })
    )
};

export const servers = {
  get: async (id: number | string) => (await get<{ server: Server }>(`/servers/${id}`)).server,
  all: async () => (await orEmpty(get<{ servers: Server[] }>("/servers"), { servers: [] })).servers,
  mine: async () =>
    (await orEmpty(get<{ servers: Server[] }>("/servers/myservers"), { servers: [] })).servers,
  available: async () =>
    (await orEmpty(get<{ servers: Server[] }>("/servers/available"), { servers: [] })).servers,
  publicCount: async () => (await get<{ servers: number }>("/servers/publiccount")).servers,
  status: (id: number) => get<MessageResponse>(`/servers/${id}/status`),
  /** The RCON password (owner or super admin only). */
  rconPassword: async (id: number) =>
    (await get<{ rcon_password: string }>(`/servers/${id}/rcon`)).rcon_password,
  /** Starts or stops MatchZy practice mode (css_prac / css_exitprac) on a free server. */
  practice: (id: number, action: "start" | "stop") =>
    post<MessageResponse>(`/servers/${id}/practice`, wrap({ action })),
  create: (body: Body) => post<MessageResponse>("/servers", wrap(body)),
  update: (body: Body) => put<MessageResponse>("/servers", wrap(body)),
  remove: (server_id: number) => del<MessageResponse>("/servers", wrap({ server_id }))
};

export const seasons = {
  all: async () => (await orEmpty(get<{ seasons: Season[] }>("/seasons"), { seasons: [] })).seasons,
  mine: async () =>
    (await orEmpty(get<{ seasons: Season[] }>("/seasons/myseasons"), { seasons: [] })).seasons,
  available: async () =>
    (await orEmpty(get<{ seasons: Season[] }>("/seasons/myseasons/available"), { seasons: [] }))
      .seasons,
  get: (id: number | string) => get<{ season: Season; matches: Match[] }>(`/seasons/${id}`),
  cvars: async (id: number | string) =>
    (await orEmpty(get<{ cvars: Record<string, string> }>(`/seasons/${id}/cvar`), { cvars: {} }))
      .cvars,
  create: (body: Body) => post<MessageResponse & { id: number }>("/seasons", wrap(body)),
  update: (body: Body) => put<MessageResponse>("/seasons", wrap(body)),
  remove: (season_id: number) => del<MessageResponse>("/seasons", wrap({ season_id })),
  importChallonge: (body: Body) => post<MessageResponse>("/seasons/challonge", wrap(body))
};

export const stats = {
  /** Totals of a player (by Steam ID), optionally per season. */
  player: async (steamId: string) =>
    (
      await orEmpty(get<{ playerstats: PlayerStat[] }>(`/playerstats/${steamId}`), {
        playerstats: []
      })
    ).playerstats,
  uniquePlayers: async () => (await get<{ count: number }>("/playerstats/unique")).count,
  /** Site-wide counters (users, teams, matches, ...). */
  metrics: async () => (await get<{ metrics: Record<string, number> }>("/metrics")).metrics,
  ofMatch: async (matchId: number | string) =>
    (
      await orEmpty(get<{ playerstats: PlayerStat[] }>(`/playerstats/match/${matchId}`), {
        playerstats: []
      })
    ).playerstats,
  matchStreamUrl: (matchId: number | string) => `/playerstats/match/${matchId}/stream`,
  playerRecentMatches: async (steamId: string) =>
    (await orEmpty(get<{ matches: Match[] }>(`/playerstats/${steamId}/recent`), { matches: [] }))
      .matches,
  maps: async (matchId: number | string) =>
    (await orEmpty(get<{ mapstats: MapStat[] }>(`/mapstats/${matchId}`), { mapstats: [] }))
      .mapstats,
  allMaps: async () =>
    (await orEmpty(get<{ mapstats: MapStat[] }>("/mapstats"), { mapstats: [] })).mapstats,
  map: async (matchId: number | string, mapNumber: number) =>
    (await get<{ mapstat: MapStat }>(`/mapstats/${matchId}/${mapNumber}`)).mapstat,
  mapStreamUrl: (matchId: number | string) => `/mapstats/${matchId}/stream`
};

export const vetoes = {
  ofMatch: async (matchId: number | string) =>
    (await orEmpty(get<{ vetoes: Veto[] }>(`/vetoes/${matchId}`), { vetoes: [] })).vetoes,
  sidesOfMatch: async (matchId: number | string) =>
    (await orEmpty(get<{ vetoes: VetoSide[] }>(`/vetosides/${matchId}`), { vetoes: [] })).vetoes,
  streamUrl: (matchId: number | string) => `/vetoes/${matchId}/stream`,
  sidesStreamUrl: (matchId: number | string) => `/vetosides/${matchId}/stream`
};

export const leaderboard = {
  teams: async (seasonId?: number | string) =>
    (
      await orEmpty(
        get<{ leaderboard: TeamStanding[] }>(
          seasonId ? `/leaderboard/${seasonId}` : "/leaderboard"
        ),
        { leaderboard: [] }
      )
    ).leaderboard,
  players: async (seasonId?: number | string, pug = false) =>
    (
      await orEmpty(
        get<{ leaderboard: LeaderboardPlayer[] }>(
          pug
            ? "/leaderboard/players/pug"
            : seasonId
              ? `/leaderboard/players/${seasonId}`
              : "/leaderboard/players"
        ),
        { leaderboard: [] }
      )
    ).leaderboard
};

/** Super admins only. */
export const admin = {
  users: async () => (await get<{ users: AdminUser[] }>("/admin/users")).users,
  audit: (query: {
    action?: string;
    q?: string;
    user_id?: number;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    return get<{ entries: AuditEntry[]; total: number }>(`/admin/audit?${params.toString()}`);
  }
};

export const tournaments = {
  all: async () => (await get<{ tournaments: TournamentSummary[] }>("/tournaments")).tournaments,
  get: (id: number | string) => get<TournamentDetail>(`/tournaments/${id}`),
  /** SSE: "tournament" (same data as get) on every bracket or match change. */
  streamUrl: (id: number | string) => `/tournaments/${id}/stream`,
  /** Admins only. team_ids in seed order. */
  create: (body: Body) => post<MessageResponse & { id: number }>("/tournaments", wrap(body)),
  update: (id: number, body: Body) => put<MessageResponse>(`/tournaments/${id}`, wrap(body)),
  remove: (id: number) => del<MessageResponse>(`/tournaments/${id}`),
  start: (id: number) => post<MessageResponse>(`/tournaments/${id}/start`),
  refresh: (id: number) => post<MessageResponse>(`/tournaments/${id}/refresh`),
  /** Disqualifies a team (or reinstates it); returns the unfinished matches unlinked from its slots. */
  setDisqualified: (id: number, teamId: number, disqualified: boolean) =>
    put<MessageResponse & { unlinked_match_ids: number[] }>(
      `/tournaments/${id}/teams/${teamId}`,
      wrap({ disqualified })
    ),
  /** Sets a slot's teams (null = bye), or `{ reset: true }` for the generated ones. */
  setNodeTeams: (
    id: number,
    nodeId: number,
    body: { team1_id: number | null; team2_id: number | null } | { reset: true }
  ) => put<MessageResponse>(`/tournaments/${id}/nodes/${nodeId}`, wrap(body)),
  /** Links an existing match to a ready slot, or unlinks it with null. */
  setNodeMatch: (id: number, nodeId: number, matchId: number | null) =>
    put<MessageResponse>(`/tournaments/${id}/nodes/${nodeId}/match`, wrap({ match_id: matchId }))
};

export const pugs = {
  open: async () => (await get<{ queues: OpenPugQueue[] }>("/pugs")).queues,
  get: (id: number | string) => get<{ queue: PugQueue; players: PugPlayer[] }>(`/pugs/${id}`),
  /** "queue" events with the same data as get(). */
  streamUrl: (id: number | string) => `/pugs/${id}/stream`,
  /** Admins only. */
  create: (body: Body) => post<MessageResponse & { id: number }>("/pugs", wrap(body)),
  join: (id: number) => post<MessageResponse>(`/pugs/${id}/join`),
  leave: (id: number) => post<MessageResponse>(`/pugs/${id}/leave`),
  ready: (id: number) => post<MessageResponse>(`/pugs/${id}/ready`),
  pick: (id: number, user_id: number) =>
    post<MessageResponse>(`/pugs/${id}/pick`, wrap({ user_id })),
  retry: (id: number) => post<MessageResponse>(`/pugs/${id}/retry`),
  cancel: (id: number) => post<MessageResponse>(`/pugs/${id}/cancel`)
};

/** Teams, players, matches and tournaments whose name contains q (2+ characters). */
export const search = (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);

/** The logged-in user's saved create-match settings. */
export const templates = {
  mine: async () =>
    (
      await get<{
        templates: { id: number; name: string; settings: MatchTemplateSettings | null }[];
      }>("/templates")
    ).templates,
  /** Same name replaces the saved one. */
  save: (name: string, settings: MatchTemplateSettings) =>
    post<MessageResponse & { id: number }>("/templates", wrap({ name, settings })),
  remove: (id: number) => del<MessageResponse>(`/templates/${id}`)
};

/** Matches the API creates at a set time. */
export const scheduled = {
  list: async () => (await get<{ scheduled: ScheduledMatch[] }>("/scheduled")).scheduled,
  /** match: the create-match body (server_id empty = first free server at that time). */
  create: (run_at: string, match: Body) =>
    post<MessageResponse & { id: number }>("/scheduled", wrap({ run_at, match })),
  cancel: (id: number) => post<MessageResponse>(`/scheduled/${id}/cancel`),
  run: (id: number) => post<MessageResponse & { scheduled: ScheduledMatch }>(`/scheduled/${id}/run`)
};
