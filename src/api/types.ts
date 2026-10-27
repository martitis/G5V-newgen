/** Shapes returned by G5API. Fields the panel doesn't use are reachable through the index signature. */

export interface User {
  id: number | null;
  steam_id: string;
  name: string;
  admin: boolean | number;
  super_admin: boolean | number;
  small_image: string;
  medium_image: string;
  large_image: string;
  /** Only for the logged-in user's own profile. */
  api_key?: string;
  challonge_api_key?: string;
  username?: string;
  [key: string]: unknown;
}

export interface TeamMember {
  name: string;
  captain: number | boolean;
  coach: number | boolean;
  image?: string;
}

export interface Team {
  id: number;
  user_id: number;
  name: string;
  tag: string;
  flag: string;
  logo: string | null;
  public_team: number | boolean;
  challonge_team_id?: number | null;
  /** steam id -> member */
  auth_name?: Record<string, TeamMember>;
  [key: string]: unknown;
}

export interface Match {
  id: number;
  user_id: number;
  server_id: number | null;
  team1_id: number | null;
  team2_id: number | null;
  winner: number | null;
  team1_score: number;
  team2_score: number;
  team1_series_score?: number;
  team2_series_score?: number;
  team1_string: string;
  team2_string: string;
  cancelled: number | null;
  forfeit: number | null;
  start_time: string | null;
  end_time: string | null;
  max_maps: number;
  title?: string;
  skip_veto?: number | boolean;
  season_id?: number | null;
  is_pug?: number | boolean;
  owner?: string;
  team1_mapscore?: number | null;
  team2_mapscore?: number | null;
  /** Only on /matches/mymatches. */
  server_name?: string | null;
  ip_string?: string | null;
  port?: number | null;
  api_key?: string;
  [key: string]: unknown;
}

export interface MapStat {
  id: number;
  match_id: number;
  winner: number | null;
  map_number: number;
  map_name: string | null;
  team1_score: number;
  team2_score: number;
  start_time: string | null;
  end_time: string | null;
  demoFile?: string | null;
  /** "failed" when MatchZy reported a failed demo upload. */
  demo_status?: string | null;
  /** Scores were resynced from the game server after missed events; player stats are incomplete. */
  stats_incomplete?: number | boolean;
  [key: string]: unknown;
}

/** The API's heartbeat for a running match (GET /matches/:id/server/state). */
export interface ServerState {
  state: "ok" | "offline" | "interrupted";
  reason: string | null;
  checked_at: string | null;
  last_seen: string | null;
  gamestate: string | null;
  server_matchid: string | null;
  interrupted_at: string | null;
  dismissed: boolean;
  resynced_at: string | null;
}

export interface PlayerStat {
  id: number;
  match_id: number;
  map_id: number;
  team_id: number | null;
  steam_id: string;
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  roundsplayed: number;
  damage: number;
  headshot_kills: number;
  [key: string]: unknown;
}

/** MatchZy's per-team ready state (get5_status); there is no per-player ready state. */
export interface ReadyState {
  gamestate: string;
  team1: { ready: boolean; connected_clients: number } | null;
  team2: { ready: boolean; connected_clients: number } | null;
}

/** A row of CS2's `status` players section; `userid` is what kickid takes. */
export interface StatusPlayer {
  userid: number;
  name: string;
  ping: number | null;
  state: string;
  bot: boolean;
}

export interface Server {
  id: number;
  user_id?: number;
  name?: string;
  display_name: string;
  ip_string?: string;
  port?: number;
  gotv_port?: number | null;
  /** sv_password; only returned to those who may connect. */
  join_password?: string | null;
  public_server: number | boolean;
  in_use?: number | boolean;
  /** In use by MatchZy practice mode, not a match. */
  practice_mode?: number | boolean;
  /** When the API's 10 s probe last got an RCON answer / last tried (UTC). */
  last_seen?: string | null;
  last_checked?: string | null;
  /** MatchZy's game state at the last answer ("none" when no match is loaded). */
  last_gamestate?: string | null;
  flag?: string;
  [key: string]: unknown;
}

export interface Season {
  id: number;
  user_id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  challonge_url?: string | null;
  cvars?: Record<string, string>;
  [key: string]: unknown;
}

export interface Veto {
  id: number;
  match_id: number;
  team_name: string;
  map: string;
  pick_or_veto: "pick" | "veto" | string;
  [key: string]: unknown;
}

export interface VetoSide {
  id: number;
  match_id: number;
  veto_id: number;
  team_name: string;
  map: string;
  side: string;
  [key: string]: unknown;
}

export interface MapListEntry {
  id: number;
  user_id: number;
  map_name: string;
  map_display_name: string;
  enabled: number | boolean;
  inserted_at?: string;
}

export interface LeaderboardPlayer {
  steamId: string;
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
  v5: number;
  trp: number;
  fba: number;
  total_damage: number;
  hsk: number;
  hsp: number;
  average_rating: number;
  wins: number;
  total_maps: number;
  enemies_flashed?: number;
  friendlies_flashed?: number;
  util_damage?: number;
}

export interface TeamStanding {
  id?: number;
  name: string;
  wins: number;
  losses: number;
  rounddiff: number;
}

export interface BackupEntry {
  file: string;
  map_number: number;
  round: number;
  info: string;
}

/** GET /matches/summary: one match list entry. */
export type MatchSummaryStatus =
  "pending" | "warmup" | "live" | "paused" | "finished" | "cancelled";

export interface SummaryTeam {
  id: number | null;
  name: string;
  tag: string | null;
  logo: string | null;
  flag: string | null;
  /** Maps won. */
  score: number;
}

export interface MatchSummary {
  id: number;
  title: string | null;
  status: MatchSummaryStatus;
  winner: 1 | 2 | null;
  forfeit: boolean;
  max_maps: number;
  season_id: number | null;
  is_pug: boolean;
  private_match: boolean;
  owner: { id: number; name: string | null };
  start_time: string | null;
  end_time: string | null;
  team1: SummaryTeam;
  team2: SummaryTeam;
  maps: {
    number: number;
    name: string | null;
    team1_score: number;
    team2_score: number;
    winner: 1 | 2 | null;
    finished: boolean;
  }[];
  current_map: {
    number: number;
    name: string | null;
    team1_score: number;
    team2_score: number;
    /** Rounds played; the current round is round + 1. */
    round: number;
    team1_side: "ct" | "t" | null;
  } | null;
  pause: { type: string | null; team: string | null } | null;
  /** Minutes since the match was loaded while its first map hasn't gone live. */
  waiting_minutes: number | null;
  /** Set while the heartbeat sees the game server offline or the match interrupted. */
  server_state: { state: "offline" | "interrupted"; dismissed: boolean } | null;
  server: {
    name: string | null;
    ip: string;
    port: number;
    gotv_port: number | null;
    /** The join password, if the server has one. */
    password: string | null;
  } | null;
}

export interface SummaryQuery {
  status?: "active" | "finished" | "cancelled" | "all";
  season_id?: number;
  team_id?: number;
  server_id?: number;
  mine?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

/** POST /teams/members/resolve: one entry per identifier sent. */
export interface ResolvedMember {
  input: string;
  steam_id: string | null;
  name: string | null;
  image: string | null;
}

/** GET /matches/:id/timeline and the live stream's rounds/kills/bombs/pause events. */
export interface MatchRound {
  map_id: number;
  /** Rounds played after this round (1 for the first round). */
  round_number: number;
  /** MatchZy's round_number (0 for the first round); kills and bombs carry this one. */
  event_round: number | null;
  winner: "team1" | "team2" | null;
  winner_side: "ct" | "t" | null;
  /** CS2 round end reason (1 bomb exploded, 7 defused, 8/9 elimination, 12 time ran out, ...). */
  reason: number | null;
  team1_score: number;
  team2_score: number;
  round_time: number | null;
}

export interface KillEvent {
  id: number;
  map_id: number;
  round_number: number;
  round_time: number;
  player_steam_id: string;
  player_name: string;
  player_side: string;
  attacker_steam_id: string | null;
  attacker_name: string | null;
  attacker_side: string | null;
  weapon: string;
  headshot: number | boolean;
  thru_smoke: number | boolean;
  attacker_blind: number | boolean;
  no_scope: number | boolean;
  suicide: number | boolean;
  friendly_fire: number | boolean;
  assister_name: string | null;
  flash_assist: number | boolean | null;
  bomb: number | boolean | null;
}

export interface BombEvent {
  id: number;
  map_id: number;
  round_number: number;
  round_time: number | null;
  site: string | null;
  defused: number | boolean;
  bomb_time_remaining: number | null;
  player_name: string | null;
}

export interface PauseState {
  paused: number | boolean;
  pause_type: string | null;
  team_paused: string | null;
}

export interface MatchTimeline {
  rounds: MatchRound[];
  kills: KillEvent[];
  bombs: BombEvent[];
  pause: PauseState | null;
}

/** GET /admin/users */
export interface AdminUser {
  id: number;
  name: string;
  /** null for accounts registered without Steam. */
  steam_id: string | null;
  small_image: string | null;
  admin: number;
  super_admin: number;
  /** 0 for local accounts; with an unproven Steam ID they can't be admins (without one they can). */
  steam_verified: number;
  /** 1 when the roles come from the config lists (the next Steam login sets them again). */
  roles_from_config: number;
  /** Local login name, if the account has one. */
  username: string | null;
  created_at: string | null;
  matches: number;
  teams: number;
  servers: number;
}

/** GET /admin/audit */
export interface AuditEntry {
  id: number;
  time: string;
  user_id: number | null;
  user_name: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  status_code: number | null;
  detail: string | null;
}

export type TournamentFormat =
  "single_elim" | "double_elim" | "round_robin" | "swiss" | "groups_playoff";

export interface TournamentSettings {
  best_of: number;
  final_best_of: number;
  swiss_rounds?: number;
  /** Groups + playoff: number of round robin groups, and teams of each that go to the playoff. */
  group_count?: number;
  group_advance?: number;
  map_pool: string[];
  players_per_team: number;
  min_players_to_ready: number;
  side_type: string;
  skip_veto: boolean;
  /** Challonge tournament id that results are reported to. */
  challonge_url?: string;
}

export interface TournamentSummary {
  id: number;
  name: string;
  format: TournamentFormat;
  status: "draft" | "running" | "finished";
  season_id: number | null;
  user_id: number | null;
  owner: string | null;
  created_at: string;
  team_count: number;
}

export interface TournamentNode {
  id: number;
  key: string;
  bracket: "upper" | "lower" | "grand_final" | "round_robin" | "swiss" | "group";
  /** Groups + playoff: the group (1 = A) of a group stage node. */
  group?: number | null;
  round: number;
  position: number;
  final: boolean;
  team1_id: number | null;
  team2_id: number | null;
  winner_id: number | null;
  status: "pending" | "ready" | "live" | "done" | "bye" | "empty";
  match_id: number | null;
  best_of: number;
  /** Series score of the linked match, in the node's team order. */
  score: [number, number] | null;
}

export interface TournamentStanding {
  team_id: number;
  played: number;
  wins: number;
  losses: number;
  maps_won: number;
  maps_lost: number;
  buchholz: number;
}

export interface TournamentDetail {
  tournament: Omit<TournamentSummary, "team_count"> & { settings: TournamentSettings };
  teams: {
    seed: number;
    id: number;
    name: string;
    tag: string | null;
    logo: string | null;
    flag: string | null;
  }[];
  nodes: TournamentNode[];
  standings: TournamentStanding[] | null;
  /** Groups + playoff: each group's table. */
  groups?: { group: number; standings: TournamentStanding[] }[] | null;
}

export type PugFormation = "random" | "balanced" | "captains";
export type PugStatus =
  "open" | "ready_check" | "picking" | "loading" | "loaded" | "failed" | "cancelled";

export interface PugSettings {
  players_per_team: number;
  formation: PugFormation;
  max_maps: number;
  map_pool: string[];
  side_type: string;
  skip_veto: boolean;
  ready_seconds: number;
}

export interface PugQueue {
  id: number;
  user_id: number | null;
  title: string | null;
  status: PugStatus;
  server_id: number | null;
  season_id: number | null;
  match_id: number | null;
  error: string | null;
  ready_deadline: string | null;
  expires_at: string | null;
  created_at: string;
  settings: PugSettings;
  size: number;
  /** While captains pick: whose turn it is. */
  picking_team: 1 | 2 | null;
  picking_captain: number | null;
}

export interface PugPlayer {
  user_id: number;
  steam_id: string;
  name: string | null;
  image: string | null;
  ready: boolean;
  team: 1 | 2 | null;
  captain: boolean;
  rating: number;
}

export interface OpenPugQueue {
  id: number;
  title: string | null;
  status: PugStatus;
  created_at: string;
  joined: number;
  size: number;
}

/** GET /search */
export interface SearchResults {
  teams: { id: number; name: string; tag: string | null; logo: string | null }[];
  players: {
    user_id: number | null;
    steam_id: string;
    name: string | null;
    image: string | null;
  }[];
  matches: {
    id: number;
    team1_string: string;
    team2_string: string;
    title: string | null;
    start_time: string | null;
    end_time: string | null;
    cancelled: number | null;
  }[];
  tournaments: { id: number; name: string; format: string; status: string }[];
}

/** GET /scheduled */
export interface ScheduledMatch {
  id: number;
  user_id: number;
  owner: string | null;
  /** ISO time in UTC. */
  run_at: string;
  status: "pending" | "running" | "loaded" | "failed" | "cancelled";
  match_id: number | null;
  error: string | null;
  title: string | null;
  team1_id: number | null;
  team2_id: number | null;
  server_id: number | null;
  max_maps: number | null;
}
