
export enum GameState {
  CHARACTER_CREATION_START,
  CHARACTER_CREATION_FINALIZE,
  GAMEPLAY,
  COMBAT,
  GAME_OVER,
}

export interface InventoryItem {
  name: string;
  description: string;
  quantity: number;
  type: 'item' | 'weapon' | 'armor';
}

export interface Companion {
  id: string;
  name: string;
  kind: string; // What the companion is, e.g., "A spectral wolf"
  backstory: string; // How they met
  relationship: string; // Their bond
}

export interface Customization {
  area: string;
  selection: string[];
}

export interface VisualTheme {
  mainBackgroundColor: string;
  textColor: string;
  accentColor: string;
  buttonColor: string;
  borderColor: string;
  font: 'serif' | 'sans-serif' | 'mono';
}

export interface Character {
  id: string;
  name: string;
  theme: string;
  isFromKnownWorld: boolean; // Flag to check if we should fetch canon events
  description: string;
  alignment: string;
  backstory: string;
  health: number;
  maxHealth: number;
  customizations: Customization[];
  inventory: InventoryItem[];
  companions?: Companion[];
  canonEvents?: string;
  visualTheme?: VisualTheme;
}

export interface Message {
  speaker: 'game' | 'player' | 'system';
  text: string;
}

export interface CustomizationArea {
    areaName: string;
    options: string[];
}

export interface CustomizationTab {
    tabName: string;
    areas: CustomizationArea[];
}

export interface CompanionSuggestion {
    name: string;
    kind: string;
}

export interface CharacterCreatorOptions {
    theme: string;
    description: string;
    backstory: string;
    alignments: string[];
    customizationTabs: CustomizationTab[];
    startingInventory: InventoryItem[];
    startingHealth: number;
    startingCompanions?: CompanionSuggestion[];
}

export interface GameTurnResult {
  sceneDescription: string;
  choices: string[];
  isCombat: boolean;
  attackOptions: string[];
  updatedHealth: number;
  inventoryChange?: {
    action: 'add' | 'remove';
    item: InventoryItem;
  };
  isGameOver: boolean;
}

export interface SaveData {
  id: string;
  lastSaved: string;
  gameState: GameState;
  character: Character;
  messages: Message[];
  choices: string[];
  attackOptions: string[];
}
