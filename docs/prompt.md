# 🧩 Task

You are an AI software architect. Using the **rave_web_services.pdf** file as the input,  
your job is to **analyze it** and produce an **AI-ready Markdown file** that describes the API in a **normalized YAML format**,  
including **instructions** and **mock implementation code**.

---

## 📘 Output Format

Produce one YAML file with the following structure:

```yaml
api_name: <string>
version: <string>
base_url: <string>
auth:
  type: <none|basic|bearer|apiKey>
  example_token: <string>
endpoints:
  - path: <string>
    method: <GET|POST|PUT|DELETE>
    summary: <string>
    parameters:
      - name: <string>
        in: <path|query|header|body>
        type: <string>
        required: <bool>
        example: <any>
    responses:
      200:
        content_type: <mime-type>
        example: <JSON or XML snippet>
instructions:
  goal: "Generate a mock/test API harness."
  framework: "Node.js (TypeScript, Express or Fastify)"
  rules:
    - Mock all endpoints locally with static data.
    - Accept a dummy token (e.g. 'TEST_TOKEN').
    - Return example payloads as JSON or XML as indicated.
    - Include 404 and 500 error routes.
  output_files:
    - index.ts
    - mockData/
    - README.md
mapping:
  error_responses:
    404: { message: "Not found" }
    500: { message: "Internal test error" }
```

---

## 🧠 Usage Context

This prompt can be used in two modes:

| Mode | Target | Description |
|------|---------|-------------|
| **YAML (prompt.yaml)** | Configuration-Oriented Agents | For direct ingestion into pipelines such as LangChain, CrewAI, or OpenDevin. |
| **Markdown (prompt.md)** | Prompt-Oriented Agents | For conversational LLMs like ChatGPT, Claude, or Gemini Pro, preserving rich formatting and hierarchy. |

---

## 🎯 Goal

Produce a **single Markdown file** that includes:
1. The **YAML API specification**,  
2. Implementation **instructions**, and  
3. Example **mock service code** suitable for automated generation of test harnesses.

---

### ✅ Output Summary

- **prompt.yaml** → For structured ingestion by pipeline agents.  
- **prompt.md** → For human-readable and conversational LLMs.
