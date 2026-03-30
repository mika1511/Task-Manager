// taskflow-api/services/task-service/src/services/ai.service.ts
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export const parseTaskWithAI = async (text: string) => {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `
                You are a task management assistant.
                Extract task details from the sentence provided.
                YOU MUST RETURN ONLY A JSON OBJECT.
                
                RULES:
                1. Extract the main action as "title".
                2. Extract context as "description".
                3. If the user mentions a specific person (e.g., "to Alice", "assign to Bob"), put that name in "assignedToName".
                4. "dueDate" must be ISO 8601 or null.
                
                JSON SCHEMA:
                {
                  "title": "string",
                  "description": "string",
                  "dueDate": "string or null",
                  "assignedToName": "string or null"
                }

                Current context: Today is ${new Date().toLocaleString()}.
                `
            },
            {
                role: "user",
                content: `Task sentence: "${text}"`
            }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" } 
    });

    const content = chatCompletion.choices[0].message.content;
    if (!content) throw new Error("Groq returned empty content");
    
    console.log("DEBUG GROQ OUTPUT:", content);
    return JSON.parse(content);
};
