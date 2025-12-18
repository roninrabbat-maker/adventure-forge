
import { GoogleGenAI, Type } from "@google/genai";
import { Character, CharacterCreatorOptions, CustomizationArea, Message, VisualTheme } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const visualThemeSchema = {
    type: Type.OBJECT,
    properties: {
        mainBackgroundColor: { type: Type.STRING, description: "A dark hex color code for the main background (e.g., #0f172a)." },
        textColor: { type: Type.STRING, description: "A light hex color code for the main text (e.g., #e2e8f0)." },
        accentColor: { type: Type.STRING, description: "A vibrant hex color code for headers and highlights (e.g., #22d3ee)." },
        buttonColor: { type: Type.STRING, description: "A hex color code for primary buttons (e.g., #4f46e5)." },
        borderColor: { type: Type.STRING, description: "A hex color code for borders (e.g., #334155)." },
        font: { type: Type.STRING, description: "The font family style. Must be one of: 'serif', 'sans-serif', 'mono'." }
    },
    required: ["mainBackgroundColor", "textColor", "accentColor", "buttonColor", "borderColor", "font"]
};

const creatorScaffoldSchema = {
  type: Type.OBJECT,
  properties: {
    theme: { type: Type.STRING, description: "The overall theme/universe." },
    description: { type: Type.STRING, description: "One-sentence character concept." },
    backstory: {
      type: Type.STRING,
      description: "A compelling backstory."
    },
    alignments: {
      type: Type.ARRAY,
      description: "5-7 thematic alignment choices.",
      items: { type: Type.STRING }
    },
    customizationTabs: {
        type: Type.ARRAY,
        description: "8-10 distinct customization tabs (e.g. 'Human Form', 'Wolf Form'). Items must have 'tabName' and 'areas'.",
        items: {
            type: Type.OBJECT,
            properties: {
                tabName: { type: Type.STRING },
                areas: {
                    type: Type.ARRAY,
                    description: "4-6 specific customization areas (name only).",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            areaName: { type: Type.STRING },
                        },
                        required: ["areaName"]
                    }
                }
            },
            required: ["tabName", "areas"]
        }
    },
    startingInventory: {
      type: Type.ARRAY,
      description: "2-4 starting items.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          type: { type: Type.STRING, description: "'weapon', 'armor', or 'item'"}
        },
        required: ["name", "description", "quantity", "type"]
      }
    },
    startingHealth: { type: Type.INTEGER },
    startingCompanions: {
        type: Type.ARRAY,
        description: "1-2 companion suggestions.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                kind: { type: Type.STRING }
            },
            required: ["name", "kind"]
        }
    }
  },
  required: ["theme", "description", "backstory", "alignments", "customizationTabs", "startingInventory", "startingHealth"]
};

const simpleCharacterSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        theme: { type: Type.STRING },
        description: { type: Type.STRING },
        backstory: { type: Type.STRING },
        alignment: { type: Type.STRING },
        health: { type: Type.INTEGER },
        maxHealth: { type: Type.INTEGER },
        customizations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    area: { type: Type.STRING },
                    selection: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["area", "selection"]
            }
        },
        inventory: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    type: { type: Type.STRING }
                },
                required: ["name", "description", "quantity", "type"]
            }
        },
        companions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    kind: { type: Type.STRING },
                    backstory: { type: Type.STRING },
                    relationship: { type: Type.STRING }
                },
                required: ["id", "name", "kind", "backstory", "relationship"]
            }
        },
        visualTheme: visualThemeSchema
    },
    required: ["name", "theme", "description", "backstory", "alignment", "health", "maxHealth", "customizations", "inventory", "visualTheme"]
};

const tabOptionsSchema = {
    type: Type.ARRAY,
    description: "An array of customization areas, each populated with a name and a list of options.",
    items: {
        type: Type.OBJECT,
        properties: {
            areaName: { type: Type.STRING, description: "The name of the customization area." },
            options: {
                type: Type.ARRAY,
                description: "An array of 20-30 creative, thematic string options for this area.",
                items: { type: Type.STRING }
            }
        },
        required: ["areaName", "options"]
    }
};

const gameTurnSchema = {
  type: Type.OBJECT,
  properties: {
    sceneDescription: { type: Type.STRING, description: "The resulting story text from the player's action." },
    choices: {
      type: Type.ARRAY,
      description: "3-4 distinct choices for the player.",
      items: { type: Type.STRING }
    },
    isCombat: { type: Type.BOOLEAN },
    attackOptions: {
      type: Type.ARRAY,
      description: "3-4 attack options if combat.",
      items: { type: Type.STRING }
    },
    updatedHealth: { type: Type.INTEGER },
    inventoryChange: {
      type: Type.OBJECT,
      description: "Add/remove item. Null if no change.",
      properties: {
        action: { type: Type.STRING },
        item: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                type: { type: Type.STRING }
            },
            required: ["name", "description", "quantity", "type"]
        }
      }
    },
    isGameOver: { type: Type.BOOLEAN },
    newCharacters: {
        type: Type.ARRAY,
        description: "List of new, distinct characters introduced in this turn who could be companions. Null if none.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                kind: { type: Type.STRING, description: "Species or role (e.g. 'Elven Ranger')"},
                description: { type: Type.STRING, description: "Brief visual description"}
            },
            required: ["name", "kind", "description"]
        }
    }
  },
  required: ["sceneDescription", "choices", "isCombat", "attackOptions", "updatedHealth", "isGameOver"]
};

const buildBasePrompt = (characterName: string, worldName?: string, backstory?: string, worldDetails?: string) => {
  const backstoryInstruction = backstory
    ? `\n\nThe player has provided a custom backstory which MUST be the primary foundation for the character. Weave this into the world and use it to inspire the alignment options and other details. The generated backstory in the final JSON should be a polished, slightly expanded version of the player's input.
    --- PLAYER'S BACKSTORY ---
    ${backstory}
    --------------------------\n\n`
    : "";
  
  const worldDetailsInstruction = worldDetails
    ? `\n\nThe player has provided specific cultural and historical details for the world. You MUST incorporate these elements deeply into the world building, theme, and character backstory.
    --- WORLD HISTORY & CULTURE ---
    ${worldDetails}
    ------------------------------\n\n`
    : "";

  let promptSegment = '';
  if (worldName) {
    promptSegment = `The game's world/theme is "${worldName}". ${worldDetailsInstruction} The character's name is "${characterName}".${backstoryInstruction} The goal is to create a unique fusion of the character concept and the chosen world. The generated "theme" must be the specified world: "${worldName}". Create a unique, compelling backstory for this character.`;
  } else {
    promptSegment = `The game is based on the character name: "${characterName}".${backstoryInstruction} ${worldDetailsInstruction} If the name is from a known universe, create a theme based on that universe. If not, invent a creative and compelling theme. Create a unique, compelling backstory for this character.`;
  }

  return promptSegment;
};

// Use gemini-3-flash-preview for initial scaffold generation
export const generateCreatorScaffold = async (characterName: string, worldName?: string, backstory?: string, worldDetails?: string): Promise<CharacterCreatorOptions> => {
  const companionInstruction = " Also, suggest 1-2 thematically appropriate companions for the character to have, including a name and a brief description of their 'kind' (e.g., species, appearance).";
  const customizationInstruction = "Provide 8-10 distinct, thematic customization tabs (like 'Physical Traits', 'Attire', 'Core Abilities'). If the character concept implies multiple forms (e.g., Werewolf, Mech Pilot, Disguise Master), YOU MUST generate separate customization tabs for each form (e.g., 'Human Form', 'Wolf Form', 'Mech Chassis', 'Pilot Gear'). CRITICAL: For each of these form-specific tabs, you must include specific appearance-related areas (e.g. 'Fur Color', 'Chassis Plating') so the player can explicitly define how that form looks. For each tab, provide 4-6 specific areas of customization. IMPORTANT: DO NOT generate the list of options for these areas, only the area names.";
  const inventoryInstruction = "For each inventory item, be sure to specify its type as 'weapon', 'armor', or 'item'.";
  
  const basePrompt = buildBasePrompt(characterName, worldName, backstory, worldDetails);
  const prompt = `Generate a hyper-detailed, massively customizable character creator SCAFFOLD for a text adventure game. ${basePrompt} Provide 5-7 thematic alignments. ${customizationInstruction} ${companionInstruction} ${inventoryInstruction}`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: creatorScaffoldSchema,
        temperature: 0.7,
      }
    });
    const text = response.text;
    if (!text) {
      throw new Error("API returned an empty text response.");
    }
    const jsonText = text.trim();
    return JSON.parse(jsonText) as CharacterCreatorOptions;
  } catch (error) {
    console.error("Error generating character creator scaffold:", error);
    throw new Error("Failed to generate character theme. Please try again or simplify your request.");
  }
};

// Use gemini-3-flash-preview for visual theme generation
export const generateVisualTheme = async (characterName: string, theme: string, description: string): Promise<VisualTheme> => {
    const prompt = `Generate a UI color theme and font style for a text adventure game.
    Character Name: "${characterName}"
    World Theme: "${theme}"
    Character Description: "${description}"
    
    The theme should capture the essence of the world and character.
    - mainBackgroundColor: Dark and atmospheric.
    - textColor: Readable and contrasting (light).
    - accentColor: Vibrant and thematic.
    - buttonColor: Distinct and interactive.
    - borderColor: Subtle but visible.
    - font: 'serif', 'sans-serif', or 'mono' based on the era/vibe.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: visualThemeSchema,
                temperature: 0.7,
            }
        });
        const text = response.text;
        if (!text) throw new Error("Empty response");
        return JSON.parse(text.trim()) as VisualTheme;
    } catch (error) {
        console.error("Error generating visual theme:", error);
        return {
            mainBackgroundColor: "#2b3626",
            textColor: "#f0fdf4",
            accentColor: "#fbbf24",
            buttonColor: "#14532d",
            borderColor: "#ca8a04",
            font: "serif"
        };
    }
};

// Use gemini-3-flash-preview for character generation
export const generateSimpleCharacter = async (characterName: string, worldName?: string, backstory?: string, worldDetails?: string): Promise<Omit<Character, 'id' | 'isFromKnownWorld'>> => {
    const inventoryInstruction = "For each inventory item, be sure to specify its type as 'weapon', 'armor', or 'item'.";
    const companionInstruction = "If companions are suitable, generate 0-2 fully detailed companions, including how they met the main character and the nature of their bond. Each companion needs a unique ID.";
    const customizationsInstruction = "Generate a rich set of 8-10 varied customizations. Each customization should be an object with an 'area' (e.g., 'Hairstyle') and a 'selection' which is an array of strings (e.g., ['Braided, Fiery Red']).";

    const basePrompt = buildBasePrompt(characterName, worldName, backstory, worldDetails);
    const prompt = `Generate a COMPLETE, ready-to-play character for a text adventure game. ${basePrompt} Provide a single thematic alignment. ${customizationsInstruction} ${inventoryInstruction} ${companionInstruction} Also generate a fitting 'visualTheme' for the UI colors based on this character/world. The final output MUST be a single JSON object matching the provided schema. Set health and maxHealth to 100. The character name in the JSON must be "${characterName}".`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: simpleCharacterSchema,
                temperature: 0.8,
            }
        });
        const text = response.text;
        if (!text) {
            throw new Error("API returned an empty text response.");
        }
        const jsonText = text.trim();
        const parsedCharacter = JSON.parse(jsonText);
        parsedCharacter.name = characterName;
        return parsedCharacter;
    } catch (error) {
        console.error("Error generating simple character:", error);
        throw new Error("Failed to generate a character with Quick Start. Please try a different name or add more detail.");
    }
};

// Use gemini-3-flash-preview for generating customization options
export const generateTabOptions = async (theme: string, characterName: string, tabName: string, areaNames: string[]): Promise<CustomizationArea[]> => {
    const prompt = `For a character named "${characterName}" in a "${theme}" world, generate detailed options for the customization tab "${tabName}". The areas to generate for are: ${areaNames.join(', ')}. For each area, provide a rich list of 20-30 creative, thematic options.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: tabOptionsSchema,
                temperature: 0.7,
            }
        });
        const text = response.text;
        if (!text) {
          throw new Error("API returned an empty text response.");
        }
        const jsonText = text.trim();
        return JSON.parse(jsonText) as CustomizationArea[];
    } catch (error) {
        console.error(`Error generating options for tab ${tabName}:`, error);
        throw new Error(`Failed to load options for ${tabName}.`);
    }
}

// Use gemini-3-flash-preview for canon events summary
export const generateCanonEvents = async (theme: string): Promise<string> => {
    const prompt = `The text adventure game is set in the world of "${theme}". Briefly summarize 3-5 key plot points, character arcs, or "canon events" that are central to the original story of this world. Present this as an intriguing, concise summary for the player. If the theme is not a known fictional universe, state that the character's fate is entirely unwritten.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating canon events:", error);
        return "The threads of fate are tangled and unclear at this moment.";
    }
}

// Use gemini-3-pro-preview for complex reasoning and creative storytelling during game turns
export const generateGameTurn = async (character: Character, history: Message[], playerChoice: string) => {
  const prompt = `
    Character State: ${JSON.stringify(character)}
    Game History (recent history): ${JSON.stringify(history.slice(-250))}
    Player's Latest Input:
    ---
    ${playerChoice}
    ---

    Continue the story. The player's input might be a pre-defined choice, a simple action ("Action"), a line of dialogue ("Dialogue"), a desired story outcome ("Story Event"), or a combination. Interpret these inputs to describe the outcome. 
    
    CRITICAL: If a "Story Event" is provided, treat it as the player attempting to exert narrative control (like a Dungeon Master). Unless it completely breaks the fundamental laws of the current reality or is nonsensical, YOU SHOULD MAKE IT HAPPEN, or at least attempt to weave it into the immediate narrative flow. Adapt the world to fit this player-driven plot point.

    **Story Pacing:** It is crucial to vary the pacing. Not every situation needs to be a life-or-death struggle. Weave in moments of calm, exploration, social interaction with non-hostile characters, and opportunities for reflection. The world should feel alive, not just like a series of combat encounters. For example, if a player decides to "rest at an inn," describe the atmosphere, the other patrons, and offer choices related to conversation or gathering information, rather than defaulting to an ambush. Let the player's choices guide the tone.

    - If the character has companions, try to incorporate them into the scene description naturally.
    - **Companion Rules:** Do NOT generate new companions automatically in the UI. However, if a DISTINCT, NAMED character is introduced in this specific scene who is friendly or neutral and *could* potentially join the party (now or later), list them in the 'newCharacters' field with their name, kind, and visual description. Do not list generic enemies or unnamed crowd members.
    - If the action *inevitably* leads to a fight, set isCombat to true. Avoid forcing combat unnecessarily.
    - **Inventory Rules:** If an item is gained or lost, describe it in inventoryChange, making sure to include its type ('weapon', 'armor', or 'item'). IMPORTANT: Only generate an 'add' action if the player explicitly acquires a NEW copy of an item they did not have, or a new distinct item. Do NOT generate an 'add' action if the player is simply inspecting, holding, or using an item they already possess in their inventory.
    - If the character takes damage or heals, reflect it in updatedHealth.
    - If the character dies or wins, set isGameOver to true.
    - Provide new choices or attack options that are contextually appropriate. Choices can be about investigation, conversation, or using an item, not just moving to the next fight.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: gameTurnSchema,
        temperature: 0.7,
        systemInstruction: `You are a world-class dungeon master for a dynamic text adventure game. Your goal is to create a compelling, coherent, and reactive story based on the player's choices and character profile. The theme is "${character.theme}". Masterfully balance action and adventure with periods of calm, mystery, and role-playing to create a rich and immersive world.`
      },
    });
    const text = response.text;
    if (!text) {
      throw new Error("API returned an empty text response.");
    }
    const jsonText = text.trim();
    return JSON.parse(jsonText);
  } catch(error) {
    console.error("Error generating game turn:", error);
    throw new Error("The story could not continue. The fabric of reality seems to have frayed.");
  }
};
