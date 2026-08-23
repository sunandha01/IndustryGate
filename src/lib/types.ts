export type UserRole = "student" | "faculty";
export type RequirementStatus = "open" | "fulfilled" | "closed";
export type RequestStatus = "sent" | "accepted" | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  linkedin_url: string | null;
  phone: string | null;
  domain: string | null;
  department: string | null;
  experience: string | null;
  is_club_authorized: boolean;
  authorized_by: string | null;
  created_at: string;
}

export interface IndustryProfile {
  id: string;
  user_id: string | null; // set once the professional signs in themselves
  full_name: string;
  designation: string | null;
  company: string | null;
  education: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  domains: string[];
  min_cost: number | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
}

export interface IndustryRequest {
  id: string;
  industry_id: string;
  logged_by: string;
  domain: string;
  event_name: string | null;
  amount: number | null;
  notes: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface PastEvent {
  id: string;
  posted_by: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  domain: string;
  prize_pool: number | null;
  sponsorship_details: string | null;
  industry_id: string | null;
  industry_role: string | null;
  industry_person_name: string | null;
  industry_company: string | null;
  notes: string | null;
  created_at: string;
}

export interface Requirement {
  id: string;
  posted_by: string;
  domain: string;
  start_date: string | null;
  end_date: string | null;
  sponsorship_needed: string | null;
  prize_pool: number | null;
  offer_amount: number | null;
  description: string | null;
  status: RequirementStatus;
  fulfilled_by: string | null;
  created_at: string;
}

// These interfaces are hand-written stand-ins for `supabase gen types
// typescript`. Regenerate with the Supabase CLI once the project is linked
// for full end-to-end type safety on `.from(...)` calls.
