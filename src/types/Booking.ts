export interface BookingBody {
  query: Query;
}

export interface Query {
  filter: Filter;
}

export interface Filter {
  location_id?: string;
  segment_filters: SegmentFilter[];
  start_at_range: StartAtRange;
}

export interface SegmentFilter {
  service_variation_id: string;
  team_member_id_filter: TeamMemberIDFilter | Record<string, never>;
}

export interface TeamMemberIDFilter {
  any: string[];
}

export interface StartAtRange {
  end_at: string;
  start_at: string;
}
