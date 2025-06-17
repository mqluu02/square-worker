export interface DetailedObjectData {
  object: CatalogObject;
  related_objects: CatalogObject[];
}

export interface ItemData {
  name: string;
  is_taxable: boolean;
  variations: CatalogObject[];
  product_type: string;
  skip_modifier_screen: boolean;
  image_ids: string[];
  location_overrides: LocationOverride[];
  is_archived: boolean;
  is_alcoholic: boolean;
}

export interface CatalogObject {
  type: string;
  id: string;
  updated_at: Date;
  created_at: Date;
  version: number;
  is_deleted: boolean;
  present_at_all_locations: boolean;
  item_data?: ItemData;
  item_variation_data?: ItemVariationData;
  image_data?: ImageData;
}

export interface LocationOverride {
  location_id: string;
  ordinal: number;
}

export interface ImageData {
  name: string;
  url: string;
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
}

export interface PriceMoney {
  amount: number;
  currency: string;
}
