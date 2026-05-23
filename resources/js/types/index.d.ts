export interface User {
	id: number;
	name: string;
	email: string;
	email_verified_at?: string;
	is_platform_admin?: boolean;
}

export type WorkspaceRole =
	| "owner"
	| "admin"
	| "accountant"
	| "branch_manager"
	| "cashier"
	| "warehouse_staff";

export interface Workspace {
	id: number;
	name: string;
	slug: string;
	role: WorkspaceRole;
	is_active: boolean;
	branch: {
		id: number;
		name: string;
		code: string | null;
	} | null;
	subscription: {
		plan_code: string;
		plan_name: string;
		status: string;
	} | null;
}

export interface WorkspaceOption {
	id: number;
	name: string;
	slug: string;
	role: WorkspaceRole;
	is_default: boolean;
	branch: string | null;
}

export type PageProps<
	T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
	auth: {
		user: User;
		workspace: Workspace | null;
		workspaces: WorkspaceOption[];
	};
};
