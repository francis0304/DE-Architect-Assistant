export interface NodePosition {
  x: number;
  y: number;
}

export interface DataSource {
  id: string;
  name: string;
  database: string;
  schema: string;
  tables: string;
  dataType: string;
  volume: string;
  frequency: string;
  position?: NodePosition;
}

export interface TransformationNode {
  id: string;
  name: string;
  processingType: string; // e.g. "dbt", "Spark", "SQL View"
  description: string; // e.g. "Join users and orders", "Filter PII"
  position?: NodePosition;
}

export interface DataTarget {
  id: string;
  name: string;
  storageFormat: string;
  partitioning: string;
  position?: NodePosition;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface DeRequestState {
  techRequirements: string;
  productRequirements: string;
  existingTools: string[];
  dataSources: DataSource[];
  transformationNodes: TransformationNode[];
  dataTargets: DataTarget[];
  connections: Connection[];
}

export interface GeminiResponse {
  markdown: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}