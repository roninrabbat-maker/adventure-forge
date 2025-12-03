
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Character, Message, CharacterCreatorOptions, SaveData, CustomizationArea } from './types';
import { generateCreatorScaffold, generateTabOptions, generateGameTurn, generateCanonEvents, generateSimpleCharacter, generateVisualTheme } from './services/geminiService';
import CharacterCreator from './components/CharacterCreator';
import GameScreen from './components/GameScreen';
import SwitchPerspectiveModal from './components/SwitchPerspectiveModal';

const SAVES_KEY = 'geminiAdventureSaves';

interface TurnState {
  gameState: GameState;
  character: Character;
  messages: Message[];
  choices: string[];
  attackOptions: string[];
}

interface ProtagonistContext {
    name: string;
    status: 'dead' | 'alive';
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.CHARACTER_CREATION_START);
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [attackOptions, setAttackOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorOptions, setCreatorOptions] = useState<CharacterCreatorOptions | null>(null);
  const [savedGames, setSavedGames] = useState<SaveData[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ text: string, isError: boolean } | null>(null);
  const [hasInitiatedOptionsFetch, setHasInitiatedOptionsFetch] = useState(false);
  const [previousTurnState, setPreviousTurnState] = useState<TurnState | null>(null);

  // State for continuing the game in the same world
  const [worldThemeForContinuation, setWorldThemeForContinuation] = useState<string | null>(null);
  const [previousProtagonist, setPreviousProtagonist] = useState<ProtagonistContext | null>(null);
  const [worldHistoryForContinuation, setWorldHistoryForContinuation] = useState<Message[] | null>(null);

  // Switching Perspective State
  const [isSwitchingPerspective, setIsSwitchingPerspective] = useState(false);


  useEffect(() => {
    // Check for save files on initial load
    try {
      const savedDataString = localStorage.getItem(SAVES_KEY);
      if (savedDataString) {
        try {
          const allSaves: SaveData[] = JSON.parse(savedDataString);
          setSavedGames(allSaves);
        } catch (e) {
          console.error("Failed to parse save data. Archiving corrupted data.", e);
          try {
            // Archive corrupted data instead of deleting it.
            localStorage.setItem(`${SAVES_KEY}_corrupted_${Date.now()}`, savedDataString);
            localStorage.removeItem(SAVES_KEY);
            setError("Your save file was corrupted and has been archived. A new save file has been started.");
          } catch (archiveError) {
            console.error("Failed to archive corrupted save data.", archiveError);
            setError("Your save file was corrupted and could not be archived. You may need to clear your browser's site data to continue.");
          }
        }
      }
    } catch (storageError) {
        console.error("Could not access localStorage. Saves will not be available.", storageError);
        setError("Your browser's storage is disabled or full. Saved games cannot be loaded or saved.");
    }
  }, []);
  
  const handleNameSubmit = useCallback(async (name: string, creationMode: 'detailed' | 'simple', world?: string, backstory?: string, worldDetails?: string) => {
    setIsLoading(true);
    setError(null);
    const finalWorld = worldThemeForContinuation || world;

    if (creationMode === 'detailed') {
      try {
        const optionsScaffold = await generateCreatorScaffold(name, finalWorld, backstory, worldDetails);
        
        if (finalWorld) {
          optionsScaffold.theme = finalWorld;
        }
        
        // Hydrate the scaffold with empty options arrays to maintain type consistency
        const hydratedOptions: CharacterCreatorOptions = {
            ...optionsScaffold,
            customizationTabs: optionsScaffold.customizationTabs.map(tab => ({
                ...tab,
                areas: tab.areas.map(area => ({
                    ...area,
                    options: [] // Ensure options array exists
                }))
            }))
        };

        setCreatorOptions(hydratedOptions);
        setGameState(GameState.CHARACTER_CREATION_FINALIZE);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    } else { // Simple creation
        try {
            const simpleCharacterData = await generateSimpleCharacter(name, finalWorld, backstory, worldDetails);
            // The API returns a complete character object, ready for finalization.
            // We pass it directly to the next step, skipping the manual creator.
            await handleCharacterFinalize(simpleCharacterData, !!finalWorld);
        } catch (e) {
            setError((e as Error).message);
            setIsLoading(false); // Make sure loading stops on error
        }
    }
  }, [worldThemeForContinuation]);

  const handleFetchTabOptions = useCallback(async (tabIndex: number) => {
    if (!creatorOptions) return;

    const { theme } = creatorOptions;
    const characterName = "User's Character"; // Name is not finalized yet
    const tabToLoad = creatorOptions.customizationTabs[tabIndex];
    const areaNames = tabToLoad.areas.map(a => a.areaName);

    try {
        const populatedAreas: CustomizationArea[] = await generateTabOptions(theme, characterName, tabToLoad.tabName, areaNames);
        
        setCreatorOptions(prev => {
            if (!prev) return null;

            const newTabs = [...prev.customizationTabs];
            const oldTab = newTabs[tabIndex];

            // Merge new areas with old ones to preserve order and handle potential API mismatches
            const updatedAreas = oldTab.areas.map(oldArea => {
                const newAreaData = populatedAreas.find(p => p.areaName === oldArea.areaName);
                return newAreaData ? newAreaData : oldArea; // Use new data if found, else keep old
            });

            newTabs[tabIndex] = { ...oldTab, areas: updatedAreas };

            return { ...prev, customizationTabs: newTabs };
        });

    } catch (e) {
        setError((e as Error).message);
        // Re-throw to be caught in the component
        throw e;
    }
  }, [creatorOptions]);

  useEffect(() => {
    // This effect runs once when the character finalization screen is loaded.
    // It sequentially fetches all tab options in the background to avoid rate-limiting.
    if (gameState === GameState.CHARACTER_CREATION_FINALIZE && creatorOptions && !hasInitiatedOptionsFetch) {
      const fetchAllTabOptionsInBackground = async () => {
        setHasInitiatedOptionsFetch(true); // Mark that we've started fetching
        for (let i = 0; i < creatorOptions.customizationTabs.length; i++) {
          const tab = creatorOptions.customizationTabs[i];
          // Check if the tab needs fetching (i.e., its first area has no options)
          if (tab.areas.length > 0 && tab.areas[0].options.length === 0) {
            try {
              // We don't need to do anything with the result here, as the handler updates state
              await handleFetchTabOptions(i);
               // Add a delay to avoid hitting rate limits
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (e) {
              console.error(`Background fetch for tab "${tab.tabName}" failed. It can be retried by clicking the tab.`, e);
              // If one fails, wait a bit before trying the next to handle transient errors
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }
      };

      fetchAllTabOptionsInBackground();
    }
  }, [gameState, creatorOptions, hasInitiatedOptionsFetch, handleFetchTabOptions]);

  const handleCharacterFinalize = useCallback(async (finalizedCharacter: Omit<Character, 'id'>, isFromKnownWorld: boolean) => {
    setIsLoading(true);
    setError(null);
    setPreviousTurnState(null);

    let canonEvents: string | undefined = undefined;
    if (isFromKnownWorld) {
        canonEvents = await generateCanonEvents(finalizedCharacter.theme);
    }
    
    let visualTheme = finalizedCharacter.visualTheme;
    // If coming from detailed creation, we need to generate the theme separately
    if (!visualTheme) {
        visualTheme = await generateVisualTheme(finalizedCharacter.name, finalizedCharacter.theme, finalizedCharacter.description);
    }

    const characterWithId: Character = {
        ...finalizedCharacter,
        id: `${Date.now()}-${finalizedCharacter.name.replace(/\s/g, '')}`,
        isFromKnownWorld,
        canonEvents,
        visualTheme,
    };
    setCharacter(characterWithId);
    
    let initialPrompt: string;
    let gameHistory: Message[];

    if (worldHistoryForContinuation && previousProtagonist) {
        if (previousProtagonist.status === 'dead') {
             // This is a continued game after death
            initialPrompt = `The hero named "${previousProtagonist.name}" has fallen. A new character, "${characterWithId.name}", now enters the world of "${characterWithId.theme}". Describe their arrival and what they see first, taking into account the events that just transpired in the history.`;
             const systemMessage: Message = { speaker: 'system', text: `The tale of ${previousProtagonist.name} has ended. A new story begins...` };
             gameHistory = worldHistoryForContinuation; // Use old history but it might be too long to send all, geminiService handles slice
             setMessages([systemMessage]);
        } else {
             // This is a perspective switch to NEW character
             initialPrompt = `The story continues in the world of "${characterWithId.theme}". The previous protagonist, "${previousProtagonist.name}", is still active in the world. However, the perspective now shifts to a NEW character, "${characterWithId.name}". Describe where this new character is and what they are doing, potentially reacting to the ripples caused by the previous character's recent actions.`;
             const systemMessage: Message = { speaker: 'system', text: `The perspective shifts...` };
             gameHistory = worldHistoryForContinuation;
             setMessages([systemMessage]);
        }

        // Reset continuation state
        setWorldThemeForContinuation(null);
        setPreviousProtagonist(null);
        setWorldHistoryForContinuation(null);
    } else {
        // This is a fresh game
        initialPrompt = "The adventure begins.";
        const initialMessage: Message = { speaker: 'system', text: `Your adventure in the world of ${characterWithId.theme} begins...` };
        gameHistory = [initialMessage];
        setMessages(gameHistory);
    }


    try {
      const turnResult = await generateGameTurn(characterWithId, gameHistory, initialPrompt);
      
      setMessages(prev => [...prev, { speaker: 'game', text: turnResult.sceneDescription }]);
      setChoices(turnResult.choices);
      setAttackOptions(turnResult.attackOptions);
      
      setGameState(turnResult.isCombat ? GameState.COMBAT : GameState.GAMEPLAY);
      
    } catch (e) {
      setError((e as Error).message);
      setMessages(prev => [...prev, { speaker: 'system', text: `Error: ${(e as Error).message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [worldHistoryForContinuation, previousProtagonist]);

  const processTurnResult = (turnResult: any, newCharacterState: Character) => {
    // Handle inventory changes
    if(turnResult.inventoryChange) {
        let updatedInventory = [...newCharacterState.inventory];
        const { action, item } = turnResult.inventoryChange;
        const existingItemIndex = updatedInventory.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());

        if (action === 'add') {
            if (existingItemIndex > -1) {
                updatedInventory[existingItemIndex].quantity += item.quantity;
            } else {
                updatedInventory.push(item);
            }
        } else if (action === 'remove') {
            if (existingItemIndex > -1) {
                updatedInventory[existingItemIndex].quantity -= item.quantity;
                if (updatedInventory[existingItemIndex].quantity <= 0) {
                    updatedInventory.splice(existingItemIndex, 1);
                }
            }
        }
        newCharacterState.inventory = updatedInventory;
    }
    
    // Auto-companion logic removed. Companions are now only added if logic explicitly handles it,
    // which has been removed from the backend service to prevent duplicates.

    setCharacter(newCharacterState);
    setMessages(prev => [...prev, { speaker: 'game', text: turnResult.sceneDescription }]);
    
    if (turnResult.isGameOver || newCharacterState.health <= 0) {
        setGameState(GameState.GAME_OVER);
        setChoices([]);
        setAttackOptions([]);
        setPreviousTurnState(null); // Can't undo from a game over state
    } else {
        setChoices(turnResult.choices);
        setAttackOptions(turnResult.attackOptions);
        setGameState(turnResult.isCombat ? GameState.COMBAT : GameState.GAMEPLAY);
    }
  }

  const handlePlayerChoice = useCallback(async (choice: string) => {
      if (!character) return;

      // Save state BEFORE this turn's modifications
      setPreviousTurnState({
        gameState,
        character: JSON.parse(JSON.stringify(character)), // Deep copy is crucial
        messages,
        choices,
        attackOptions,
      });

      setIsLoading(true);
      setError(null);

      const newMessages: Message[] = [...messages, { speaker: 'player', text: choice }];
      setMessages(newMessages);

      try {
        const turnResult = await generateGameTurn(character, newMessages, choice);
        let newCharacterState = { ...character, health: turnResult.updatedHealth };
        processTurnResult(turnResult, newCharacterState);
      } catch (e) {
        setError((e as Error).message);
        setMessages(prev => [...prev, { speaker: 'system', text: `Error: ${(e as Error).message}` }]);
      } finally {
        setIsLoading(false);
      }
  }, [character, messages, gameState, choices, attackOptions]);

  const handleCharacterUpdate = useCallback((updatedCharacter: Character) => {
    setCharacter(updatedCharacter);
  }, []);

  const handleSaveGame = useCallback(() => {
    if (!character) return;

    try {
      // Re-read from storage to prevent race conditions with other tabs.
      const savedDataString = localStorage.getItem(SAVES_KEY);
      const allSaves: SaveData[] = savedDataString ? JSON.parse(savedDataString) : [];
  
      const saveIndex = allSaves.findIndex(s => s.id === character.id);
  
      const newSaveData: SaveData = {
        id: character.id,
        lastSaved: new Date().toISOString(),
        gameState,
        character,
        messages,
        choices,
        attackOptions,
      };
  
      if (saveIndex > -1) {
        allSaves[saveIndex] = newSaveData;
      } else {
        allSaves.push(newSaveData);
      }
  
      localStorage.setItem(SAVES_KEY, JSON.stringify(allSaves));
      setSavedGames(allSaves);
      setSaveMessage({ text: "Game Saved!", isError: false });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      console.error("Failed to save game:", e);
      setSaveMessage({ text: "Save Failed! Storage may be full or data is corrupt.", isError: true });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [character, gameState, messages, choices, attackOptions]);

  const handleLoadGame = useCallback((saveId: string, contextMessages?: Message[]) => {
    // We get savedGames from state which was loaded on mount.
    // This is safe because loading happens from the main screen where no other actions are occurring.
    const saveData = savedGames.find(s => s.id === saveId);
    if (saveData) {
      setGameState(saveData.gameState);
      setCharacter(saveData.character);
      // Append context messages if switching perspective
      setMessages(contextMessages ? [...saveData.messages, ...contextMessages] : saveData.messages);
      setChoices(saveData.choices);
      setAttackOptions(saveData.attackOptions);
      // Clear creator-specific state
      setCreatorOptions(null);
      setError(null);
      setWorldThemeForContinuation(null);
      setPreviousTurnState(null);
      setHasInitiatedOptionsFetch(false);
      setIsSwitchingPerspective(false); // Close modal
    } else {
      setError("Could not find the selected save file.");
    }
  }, [savedGames]);
  
  const handleDeleteGame = useCallback((saveId: string) => {
    try {
      // Re-read from storage to ensure we have the latest data and avoid race conditions.
      const savedDataString = localStorage.getItem(SAVES_KEY);
      const currentSaves: SaveData[] = savedDataString ? JSON.parse(savedDataString) : [];
      
      const updatedSaves = currentSaves.filter(s => s.id !== saveId);
      localStorage.setItem(SAVES_KEY, JSON.stringify(updatedSaves));
      setSavedGames(updatedSaves);
    } catch (e) {
      console.error("Failed to delete save:", e);
      setError("Failed to delete game. Your browser's storage might be full or data is corrupt.");
    }
  }, []);

  const handleStartAnew = () => {
    // Reset state to the beginning without a page reload or clearing saves
    setGameState(GameState.CHARACTER_CREATION_START);
    setCharacter(null);
    setMessages([]);
    setChoices([]);
    setAttackOptions([]);
    setError(null);
    setCreatorOptions(null);
    setIsLoading(false);
    setWorldThemeForContinuation(null);
    setPreviousProtagonist(null);
    setWorldHistoryForContinuation(null);
    setHasInitiatedOptionsFetch(false); // Reset for the next character
    setPreviousTurnState(null);
    setIsSwitchingPerspective(false);
  };

  const handleContinueAsNewCharacter = useCallback(() => {
    if (!character || !messages) return;

    // Preserve world context
    setWorldThemeForContinuation(character.theme);
    setPreviousProtagonist({ name: character.name, status: 'dead' });
    setWorldHistoryForContinuation(messages);

    // Reset game state for character creation
    setGameState(GameState.CHARACTER_CREATION_START);
    setCharacter(null);
    setMessages([]);
    setChoices([]);
    setAttackOptions([]);
    setError(null);
    setCreatorOptions(null);
    setIsLoading(false);
    setHasInitiatedOptionsFetch(false); // Reset for the new hero
    setPreviousTurnState(null);
    setIsSwitchingPerspective(false);
  }, [character, messages]);

  // Updated to just open the modal and save
  const handleOpenSwitchPerspectiveModal = useCallback(() => {
      if (!character) return;
      handleSaveGame(); // Auto-save current progress so they appear in the list
      setIsSwitchingPerspective(true);
  }, [character, handleSaveGame]);

  const handleConfirmSwitchPerspective = useCallback((target: string | 'NEW') => {
      if (!character) return;
      
      // Generate context from recent history
      const recentEvents = messages.slice(-5).map(m => `[${m.speaker}]: ${m.text}`).join('\n');
      const contextMessage: Message = { 
          speaker: 'system', 
          text: `*** MEANWHILE ***\nThe threads of fate have shifted. You return to the perspective of ${target === 'NEW' ? 'a new hero' : 'another'}.\n\nRecent events elsewhere involving ${character.name}:\n${recentEvents}\n\n` 
      };

      if (target === 'NEW') {
          // Logic similar to handleContinueAsNewCharacter but for alive status
          setWorldThemeForContinuation(character.theme);
          setPreviousProtagonist({ name: character.name, status: 'alive' });
          setWorldHistoryForContinuation(messages); // Pass full history for AI context

          // Reset
          setGameState(GameState.CHARACTER_CREATION_START);
          setCharacter(null);
          setMessages([]);
          setChoices([]);
          setAttackOptions([]);
          setError(null);
          setCreatorOptions(null);
          setIsLoading(false);
          setHasInitiatedOptionsFetch(false);
          setPreviousTurnState(null);
          setIsSwitchingPerspective(false);
      } else {
          // Load existing character with injected context
          handleLoadGame(target, [contextMessage]);
      }
  }, [character, messages, handleLoadGame]);

  const handleLetFateDecide = useCallback(async () => {
    if (!character) return;

    setIsLoading(true);
    setError(null);
    setPreviousTurnState(null); // Fate is final, no undos

    const fatePrompt = `The hero, ${character.name}, has just been defeated, their health at or below zero. However, their story is not over. Describe a dramatic turn of events that prevents their permanent death. This could be a rescue, a divine intervention, or waking up captured. The character should be brought back from the brink, but still be in a precarious situation. Restore their health to a low but non-zero value (e.g., 10-25% of max health). IMPORTANTLY, do NOT set isGameOver to true. Set the scene for what happens next and provide new choices.`;
    
    const newMessages: Message[] = [...messages, { speaker: 'system', text: "A thread of fate refuses to be severed..." }];
    setMessages(newMessages);

    try {
      const turnResult = await generateGameTurn(character, newMessages, fatePrompt);
      let newCharacterState = { ...character, health: turnResult.updatedHealth };
      processTurnResult(turnResult, newCharacterState);
    } catch (e) {
      setError((e as Error).message);
      setMessages(prev => [...prev, { speaker: 'system', text: `Error: Fate itself recoils in error. ${(e as Error).message}` }]);
      setGameState(GameState.GAME_OVER); // If fate fails, it's really game over
    } finally {
      setIsLoading(false);
    }
  }, [character, messages]);
  
  const handleUndo = useCallback(() => {
    if (previousTurnState) {
        setGameState(previousTurnState.gameState);
        setCharacter(previousTurnState.character);
        setMessages(previousTurnState.messages);
        setChoices(previousTurnState.choices);
        setAttackOptions(previousTurnState.attackOptions);
        setPreviousTurnState(null); // Can only undo once
        setError(null);
    }
  }, [previousTurnState]);


  const renderContent = () => {
    switch(true) {
        case gameState === GameState.CHARACTER_CREATION_START:
        case gameState === GameState.CHARACTER_CREATION_FINALIZE:
            return (
                <CharacterCreator 
                    gameState={gameState}
                    creatorOptions={creatorOptions}
                    onNameSubmit={handleNameSubmit}
                    onCharacterFinalize={handleCharacterFinalize}
                    onFetchTabOptions={handleFetchTabOptions}
                    isLoading={isLoading}
                    error={error}
                    savedGames={savedGames}
                    onLoadGame={(id) => handleLoadGame(id)}
                    onDeleteGame={handleDeleteGame}
                    continuedWorldTheme={worldThemeForContinuation}
                />
            );
        case gameState === GameState.GAMEPLAY:
        case gameState === GameState.COMBAT:
        case gameState === GameState.GAME_OVER:
            return (
                <GameScreen 
                    character={character}
                    messages={messages}
                    choices={choices}
                    attackOptions={attackOptions}
                    gameState={gameState}
                    isLoading={isLoading}
                    onPlayerChoice={handlePlayerChoice}
                    onSaveGame={handleSaveGame}
                    saveMessage={saveMessage}
                    onStartAnew={handleStartAnew}
                    onContinueAsNewCharacter={handleContinueAsNewCharacter}
                    onSwitchPerspective={handleOpenSwitchPerspectiveModal}
                    onLetFateDecide={handleLetFateDecide}
                    onCharacterUpdate={handleCharacterUpdate}
                    onUndo={handleUndo}
                    canUndo={!!previousTurnState && !isLoading}
                />
            );
        default:
            return <div>Error: Unknown game state.</div>;
    }
  }

  return (
    <div className="App">
      {renderContent()}
      <SwitchPerspectiveModal
        isOpen={isSwitchingPerspective}
        onClose={() => setIsSwitchingPerspective(false)}
        savedGames={savedGames}
        currentCharacterId={character?.id}
        currentTheme={character?.theme}
        onSelectCharacter={(id) => handleConfirmSwitchPerspective(id)}
        onCreateNew={() => handleConfirmSwitchPerspective('NEW')}
      />
    </div>
  );
};

export default App;
