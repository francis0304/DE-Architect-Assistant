import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { DeRequestState, ChatMessage, DataSource, DataTarget, Connection, TransformationNode } from "../types";

const DEFAULT_MODEL = "gemini-2.5-flash";

export const generateSolution = async (data: DeRequestState, includeDiagram: boolean): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("System Configuration Error: API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = `You are a World-Class Senior Data Engineer and Solution Architect. 
Your goal is to design robust, scalable, and maintainable data architectures based on user requirements.
You must distinguish between Technical Requirements (Mandatory) and Product Requirements (Optional/Nice-to-have).
You must provide actionable advice, identifying potential pitfalls (e.g., skew, latency, cost).`;

  if (includeDiagram) {
    systemInstruction += `
You MUST include a Mermaid diagram that strictly visualizes the flow described in the "Data Flow / Connections" section.

CRITICAL MERMAID DIAGRAM RULES:
1. Use "graph TD" or "flowchart TD".
2. Do NOT add spaces between the node ID and the label brackets. (Correct: id["Label"], Incorrect: id ["Label"])
3. ALWAYS wrap node labels in double quotes, especially if they contain parentheses or special characters. (Correct: id["My System (Production)"])
4. Ensure the graph syntax is valid and clean.`;
  } else {
    systemInstruction += `
Do NOT generate any Mermaid diagrams, charts, or visual graphs. Focus solely on the text description and implementation steps.`;
  }

  // Helper to find node name by ID
  const getNodeName = (id: string) => {
    const source = data.dataSources.find(s => s.id === id);
    if (source) return `Source: ${source.name}`;
    const target = data.dataTargets.find(t => t.id === id);
    if (target) return `Target: ${target.name}`;
    const trans = data.transformationNodes.find(t => t.id === id);
    if (trans) return `Transform: ${trans.name}`;
    return "Unknown Node";
  };

  const connectionDescription = data.connections.length > 0 
    ? data.connections.map(c => `- ${getNodeName(c.sourceId)} connects to ${getNodeName(c.targetId)}`).join("\n")
    : "No explicit connections defined. Please infer logical flow from Sources to Targets.";

  const prompt = `
Please design a Data Engineering solution for the following request:

### 1. Requirements
**Technical Requirements (Mandatory):**
${data.techRequirements || "None provided"}

**Optional Product Requirements:**
${data.productRequirements || "None provided"}

### 2. Environment
**Existing Tools/System:**
${data.existingTools.length > 0 ? data.existingTools.join(", ") : "None specified"}

### 3. Data Sources (Nodes)
${data.dataSources.map((s, i) => `
- **Node ${i + 1}**: ${s.name} (ID: ${s.id})
  - Database: ${s.database || "N/A"}
  - Schema: ${s.schema || "N/A"}
  - Tables/Fields: ${s.tables}
  - Type: ${s.dataType}
  - Volume: ${s.volume}
  - Frequency: ${s.frequency || "N/A"}
`).join("")}

### 4. Transformation / Processing Nodes
${data.transformationNodes.map((t, i) => `
- **Process ${i + 1}**: ${t.name} (ID: ${t.id})
  - Engine/Type: ${t.processingType}
  - Logic: ${t.description}
`).join("")}

### 5. Data Targets
${data.dataTargets.map((t, i) => `
- **Target ${i + 1}**: ${t.name} (ID: ${t.id})
  - Storage: ${t.storageFormat}
  - Partitioning: ${t.partitioning}
`).join("")}

### 6. Data Flow / Connections
${connectionDescription}

---

**OUTPUT FORMAT:**
Please provide the response in Markdown format with the following structure:

# Requirement Breakdown
(Analyze the complexity, data volumes, and key constraints)

# Solution Options
(Provide 2-3 distinct architectural options. For each, list Pros and Cons. Clearly indicate if it satisfies the Optional Requirements.)

# Implementation Steps
(Step-by-step guide for the recommended approach. Distinguish between Data Engineer tasks and DBA tasks.)

# Clarifying Questions
(What else do we need to know?)

${includeDiagram ? `# Architecture Diagram
(Render a Mermaid flowchart using \`\`\`mermaid code block. Ensure clear directionality based on the Data Flow connections provided above. Label edges with protocols or frequencies if applicable. REMEMBER: Quote all node labels!)` : ''}
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
      },
    });

    if (!response || !response.text) {
        throw new Error("The AI model returned an empty response. Please try again.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(formatError(error));
  }
};

export const generatePipelineLayout = async (requirements: string, existingTools: string[]): Promise<{
  dataSources: DataSource[];
  transformationNodes: TransformationNode[];
  dataTargets: DataTarget[];
  connections: Connection[];
}> => {
  if (!process.env.API_KEY) {
    throw new Error("System Configuration Error: API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `You are a Data Engineering Architect helper. Analyze the following requirements and existing environment to create a preliminary pipeline structure.

**Input Context:**
- Requirements: "${requirements}"
- Existing Tools/Systems: ${existingTools.length > 0 ? existingTools.join(", ") : "None provided"}

**Task:**
1. Identify appropriate **Data Sources** (input systems).
2. Identify **Transformation Nodes** (intermediate processing steps like "Join Tables", "Clean Data", "Aggregate", "dbt Model").
3. Identify **Data Targets** (output systems).
4. If "Existing Tools" are listed and relevant, prioritize using them.
5. Define logical connections between them (Source -> Transform -> Target).

**Output Schema:**
Return a JSON object strictly following the schema below.
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dataSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING, description: "Name of the system or DB" },
                  database: { type: Type.STRING },
                  schema: { type: Type.STRING },
                  tables: { type: Type.STRING },
                  dataType: { type: Type.STRING, description: "e.g. Relational, JSON, CSV" },
                  volume: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                },
                required: ["id", "name"]
              }
            },
            transformationNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING, description: "Step Name e.g. 'Clean Customer Data'" },
                  processingType: { type: Type.STRING, description: "e.g. dbt, Spark, SQL" },
                  description: { type: Type.STRING, description: "What logic is applied here?" },
                },
                required: ["id", "name"]
              }
            },
            dataTargets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  storageFormat: { type: Type.STRING, description: "e.g. Parquet, Iceberg" },
                  partitioning: { type: Type.STRING },
                },
                required: ["id", "name"]
              }
            },
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                },
                required: ["sourceId", "targetId"]
              }
            }
          },
          required: ["dataSources", "dataTargets", "connections"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(response.text);
    
    const safeSources: DataSource[] = (result.dataSources || []).map((s: any) => ({
      id: s.id || crypto.randomUUID(),
      name: s.name || "Unknown Source",
      database: s.database || "",
      schema: s.schema || "",
      tables: s.tables || "",
      dataType: s.dataType || "",
      volume: s.volume || "",
      frequency: s.frequency || "Daily",
    }));

    const safeTransforms: TransformationNode[] = (result.transformationNodes || []).map((t: any) => ({
      id: t.id || crypto.randomUUID(),
      name: t.name || "Processing Step",
      processingType: t.processingType || "SQL",
      description: t.description || ""
    }));

    const safeTargets: DataTarget[] = (result.dataTargets || []).map((t: any) => ({
      id: t.id || crypto.randomUUID(),
      name: t.name || "Unknown Target",
      storageFormat: t.storageFormat || "",
      partitioning: t.partitioning || "",
    }));

    const safeConnections: Connection[] = (result.connections || []).map((c: any) => ({
      id: crypto.randomUUID(),
      sourceId: c.sourceId,
      targetId: c.targetId
    }));

    return {
      dataSources: safeSources,
      transformationNodes: safeTransforms,
      dataTargets: safeTargets,
      connections: safeConnections
    };

  } catch (error: any) {
    console.error("Gemini Auto-Pipeline Error:", error);
    throw new Error(formatError(error));
  }
};

export const getChatStream = async function* (
  model: string,
  history: ChatMessage[],
  message: string,
  context: string
) {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are a helpful Data Engineering Architect Assistant. 
The user is asking follow-up questions about a specific solution design.
Here is the CONTEXT of the current request and the generated solution:
---
${context}
---
Answer the user's questions based on this context. Be concise, technical, and helpful.`;

  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));

  const chat: Chat = ai.chats.create({
    model: model,
    history: chatHistory,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  const result = await chat.sendMessageStream({ message });

  for await (const chunk of result) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      yield c.text;
    }
  }
};

const formatError = (error: any): string => {
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes("401") || errorMessage.includes("UNAUTHENTICATED")) return "Authentication Failed: Invalid API Key.";
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) return "Rate Limit Exceeded: Please wait a moment.";
    if (errorMessage.includes("SAFETY") || errorMessage.includes("blocked")) return "Content Error: Request blocked by safety filters.";
    return `Generation Failed: ${errorMessage}`;
};