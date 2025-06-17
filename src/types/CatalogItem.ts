export interface ItemData {
  name: string;
  is_taxable: boolean;
  variations: CatalogItem[];
  product_type: string;
  skip_modifier_screen?: boolean;
  location_overrides: LocationOverride[];
  is_archived: boolean;
  is_alcoholic?: boolean;
  description?: string;
  description_html?: string;
  description_plaintext?: string;
}

export interface CatalogItem {
  type: Type;
  id: string;
  updated_at: Date;
  created_at: Date;
  version: number;
  is_deleted: boolean;
  present_at_all_locations: boolean;
  item_data?: ItemData;
  item_variation_data?: ItemVariationData;
}

export interface LocationOverride {
  location_id: string;
  ordinal: number;
}

export interface ItemVariationData {
  item_id: string;
  name: string;
  ordinal: number;
  pricing_type: string;
  price_money: PriceMoney;
  service_duration: number;
  available_for_booking: boolean;
  sellable: boolean;
  stockable: boolean;
  team_member_ids: string[];
  transition_time?: number;
}

export interface PriceMoney {
  amount: number;
  currency: string;
}

export enum Type {
  Item = 'ITEM',
  ItemVariation = 'ITEM_VARIATION',
}
