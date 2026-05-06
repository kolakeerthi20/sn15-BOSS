// ============================================================
// BOSS Platform — Core Type Definitions
// Enterprise Project Management System
// ============================================================

export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'CLIENT_VIEWER';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'AT_RISK';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type LogStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'IN_REVIEW';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  department: string;
  designation: string;
  skills: string[];
  joinedAt: string;
  isActive: boolean;
  utilization: number; // 0-100%
  billableRate?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  budget: number;
  spentBudget: number;
  completionPercent: number;
  healthScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  managerId: string;
  manager: User;
  members: ProjectMember[];
  tasks: Task[];
  milestones: Milestone[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  user: User;
  projectId: string;
  role: 'LEAD' | 'MEMBER' | 'REVIEWER';
  allocation: number; // % of time allocated
  joinedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project?: Project;
  assigneeId: string;
  assignee: User;
  reporterId: string;
  reporter: User;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  progressPercent: number;
  labels: string[];
  subtasks: SubTask[];
  comments: Comment[];
  attachments: Attachment[];
  dependencies: string[]; // task IDs
  watchers: string[]; // user IDs
  sprintId?: string;
  milestoneId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  completedAt?: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  velocity: number;
  tasks: Task[];
}

export interface DailyLog {
  id: string;
  userId: string;
  user: User;
  projectId: string;
  project?: Project;
  taskId?: string;
  task?: Task;
  date: string;
  status: LogStatus;
  summary: string;
  hoursWorked: number;
  deliverablesCompleted: string[];
  blockers: string;
  tomorrowPlan: string;
  progressPercent: number;
  attachments: Attachment[];
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  taskId?: string;
  projectId?: string;
  mentions: string[]; // user IDs
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedById: string;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'TASK_ASSIGNED' | 'COMMENT_MENTION' | 'TASK_OVERDUE' | 'DAILY_LOG_REMINDER' | 'PROJECT_UPDATE' | 'BLOCKER_ESCALATION' | 'APPROVAL_NEEDED';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface ResourceUtilization {
  userId: string;
  user: User;
  weeklyHours: number;
  utilizationPercent: number;
  billableHours: number;
  nonBillableHours: number;
  projectBreakdown: { projectId: string; projectName: string; hours: number; percent: number }[];
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface AnalyticsData {
  projectHealth: { name: string; score: number; status: ProjectStatus }[];
  teamProductivity: { date: string; tasksCompleted: number; hoursLogged: number }[];
  resourceUtilization: ResourceUtilization[];
  burndownData: { date: string; remaining: number; ideal: number }[];
  velocityData: { sprint: string; committed: number; completed: number }[];
  statusDistribution: { status: TaskStatus; count: number }[];
  delayedTasks: Task[];
  topPerformers: { user: User; score: number; tasksCompleted: number }[];
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  totalResources: number;
  activeResources: number;
  avgUtilization: number;
  tasksCompletedToday: number;
  upcomingDeadlines: number;
  overdueTasks: number;
  productivityScore: number;
  burnRate: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  isActive: boolean;
  projectId?: string;
  lastTriggered?: string;
}
