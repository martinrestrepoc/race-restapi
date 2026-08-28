import type {
  AppRole,
  AuthenticatedUser,
  UserProfile,
  UserProfileStatus,
} from '@/auth/auth.types';

export type { AppRole, AuthenticatedUser, UserProfile, UserProfileStatus };

export type SortOrder = 'asc' | 'desc';
export type CompetitorStatus = 'ACTIVE' | 'SUSPENDED' | 'RETIRED';
export type CompetitorType = 'DWARF' | 'CAMEL' | 'MEDIUM' | 'OTHER';
export type TeamStatus = 'ACTIVE' | 'INACTIVE';
export type RaceType = 'INDIVIDUAL' | 'TEAM' | 'MIXED';
export type RaceStatus =
  | 'DRAFT'
  | 'OPEN_FOR_REGISTRATION'
  | 'CLOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type RegistrationStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ResultStatus =
  'FINISHED' | 'DISQUALIFIED' | 'DID_NOT_FINISH' | 'DID_NOT_START';

export interface PaginationQuery {
  limit?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  limit: number;
  page: number;
  totalItems: number;
  totalPages: number;
}

export interface Competitor {
  dateOfBirth: string;
  height: number;
  id: string;
  name: string;
  nickname: string;
  origin: string;
  registeredAt: string;
  status: CompetitorStatus;
  type: CompetitorType;
  updatedAt: string;
  weight: number;
}

export interface CreateCompetitorInput {
  dateOfBirth: string;
  height: number;
  name: string;
  nickname: string;
  origin: string;
  status: CompetitorStatus;
  type: CompetitorType;
  weight: number;
}

export type UpdateCompetitorInput = Omit<CreateCompetitorInput, 'status'>;

export interface CompetitorQuery extends PaginationQuery {
  search?: string;
  sortBy?: 'name' | 'nickname' | 'type' | 'status' | 'registeredAt';
  sortOrder?: SortOrder;
  status?: CompetitorStatus;
  type?: CompetitorType;
}

export interface Team {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  responsiblePerson: string;
  status: TeamStatus;
  updatedAt: string;
}

export interface TeamMember {
  competitor: Competitor;
  id: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface CreateTeamInput {
  description?: string;
  name: string;
  responsiblePerson: string;
  status: TeamStatus;
}

export type UpdateTeamInput = Omit<CreateTeamInput, 'status'>;

export interface TeamQuery extends PaginationQuery {
  search?: string;
  sortBy?: 'name' | 'responsiblePerson' | 'status' | 'createdAt';
  sortOrder?: SortOrder;
  status?: TeamStatus;
}

export interface Race {
  createdAt: string;
  description: string | null;
  distanceMeters: number;
  finishLocation: string;
  id: string;
  maxParticipants: number;
  name: string;
  organizerUserProfileId: string | null;
  registrationDeadline: string;
  scheduledAt: string;
  startLocation: string;
  status: RaceStatus;
  type: RaceType;
  updatedAt: string;
}

export interface RaceInput {
  description?: string;
  distanceMeters: number;
  finishLocation: string;
  maxParticipants: number;
  name: string;
  registrationDeadline: string;
  scheduledAt: string;
  startLocation: string;
  type: RaceType;
}

export interface RaceQuery extends PaginationQuery {
  search?: string;
  sortBy?:
    'name' | 'scheduledAt' | 'registrationDeadline' | 'status' | 'createdAt';
  sortOrder?: SortOrder;
  status?: RaceStatus;
  type?: RaceType;
}

export interface Registration {
  competitorId: string | null;
  id: string;
  performedByUserProfileId: string | null;
  raceId: string;
  registeredAt: string;
  startingPosition: number | null;
  status: RegistrationStatus;
  teamId: string | null;
  updatedAt: string;
  validationNotes: string | null;
}

export interface CreateRegistrationInput {
  competitorId?: string;
  teamId?: string;
}

export interface RegistrationQuery extends PaginationQuery {
  status?: RegistrationStatus;
}

export interface RaceResult {
  finalPosition: number | null;
  finalTimeMs: number | null;
  id: string;
  notes: string | null;
  penaltyTimeMs: number;
  raceId: string;
  rawTimeMs: number | null;
  recordedAt: string;
  recordedByUserProfileId: string | null;
  registrationId: string;
  startingPosition: number;
  status: ResultStatus;
  updatedAt: string;
}

export interface ResultInput {
  finalPosition?: number;
  notes?: string;
  penaltyTimeMs: number;
  rawTimeMs?: number;
  status: ResultStatus;
}

export interface CreateResultInput extends ResultInput {
  registrationId: string;
}

export interface ResultQuery extends PaginationQuery {
  status?: ResultStatus;
}

export interface StandingBase {
  bestFinalTimeMs: number | null;
  name: string;
  position: number;
  racesCompleted: number;
  secondPlaces: number;
  totalPoints: number;
  wins: number;
}

export interface CompetitorStanding extends StandingBase {
  competitorId: string;
  nickname: string;
  status: CompetitorStatus;
  type: CompetitorType;
}

export interface TeamStanding extends StandingBase {
  status: TeamStatus;
  teamId: string;
}

export interface PointsTableEntry {
  points: number;
  position: number;
}

export interface OverallStandings {
  competitors: PaginatedResponse<CompetitorStanding>;
  pointsTable: PointsTableEntry[];
  teams: PaginatedResponse<TeamStanding>;
  zeroPointResultStatuses: ResultStatus[];
}

export interface StandingsQuery extends PaginationQuery {
  search?: string;
  sortBy?:
    | 'position'
    | 'name'
    | 'totalPoints'
    | 'wins'
    | 'secondPlaces'
    | 'racesCompleted'
    | 'bestFinalTimeMs';
  sortOrder?: SortOrder;
}

export interface CompetitorStandingsQuery extends StandingsQuery {
  status?: CompetitorStatus;
  type?: CompetitorType;
}

export interface TeamStandingsQuery extends StandingsQuery {
  status?: TeamStatus;
}

export interface UserProfileQuery extends PaginationQuery {
  search?: string;
  sortBy?: 'displayName' | 'status' | 'createdAt';
  sortOrder?: SortOrder;
  status?: UserProfileStatus;
}

export interface AuditLog {
  action: string;
  actorUserProfileId: string | null;
  description: string | null;
  entityId: string;
  entityType: string;
  id: string;
  newValues: Record<string, unknown> | null;
  occurredAt: string;
  previousValues: Record<string, unknown> | null;
}

export interface AuditLogQuery extends PaginationQuery {
  action?: string;
  actorUserProfileId?: string;
  entityId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}
