/** A single entry in the metadata catalog listing */
export interface MetadataCatalogEntry {
  name: string;
  href: string;
  mediaType: string[];
}

/** Response from GET /metadata-catalog (application/json) */
export interface MetadataCatalogResponse {
  links: Array<{ rel: string; href: string }>;
  items: MetadataCatalogEntry[];
}

/** Options for fetching the metadata catalog */
export interface MetadataCatalogOptions {
  /** Filter to specific record types */
  select?: string[];
}

/** Options for fetching a record's OpenAPI or JSON Schema metadata */
export interface RecordMetadataOptions {
  /** 'openapi' for OpenAPI 3.0 spec, 'jsonschema' for JSON Schema */
  format?: 'openapi' | 'jsonschema';
}
