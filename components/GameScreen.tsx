import React, { useRef, useEffect, useState } from 'react';
import { Character, GameState, Message, PotentialCompanion } from '../types';
import CharacterSheet from './CharacterSheet';
import LoadingSpinner from './LoadingSpinner';

interface GameScreenProps {
  character: Character | null;
  messages: Message[];
  choices: string[];
  attackOptions: string[];
  gameState: GameState;
  isLoading: boolean;
  onPlayerChoice: (choice: string) => void;
  onSaveGame: () => void;
  saveMessage: { text: string; isError: boolean } | null;
  onStartAnew: () => void;
  onContinueAsNewCharacter: () => void;
  onSwitchPerspective: () => void;
  onLetFateDecide: () => void;
  onCharacterUpdate: (character: Character) => void;
  onUndo: () => void;
  canUndo: boolean;
  potentialCompanions?: PotentialCompanion[];
  onAddCompanion?: (companion: PotentialCompanion) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  character,
  messages,
  choices,
  attackOptions,
  gameState,
  isLoading,
  onPlayerChoice,
  onSaveGame,
  saveMessage,
  onStartAnew,
  onContinueAsNewCharacter,
  onSwitchPerspective,
  onLetFateDecide,
  onCharacterUpdate,
  onUndo,
  canUndo,
  potentialCompanions = [],
  onAddCompanion,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [customAction, setCustomAction] = useState('');
  const [customSpeech, setCustomSpeech] = useState('');
  const [customStory, setCustomStory] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = customAction.trim();
    const speech = customSpeech.trim();
    const story = customStory.trim();
    
    if (!action && !speech && !story) return;

    const parts = [];
    if (speech) parts.push(`Dialogue: "${speech}"`);
    if (action) parts.push(`Action: ${action}`);
    if (story) parts.push(`Story Event: ${story}`);

    const combinedChoice = parts.join('\n');

    if (combinedChoice) {
      onPlayerChoice(combinedChoice);
      setCustomAction('');
      setCustomSpeech('');
      setCustomStory('');
    }
  };

  const getFontClass = (fontType?: string) => {
      if (fontType === 'serif') return 'font-serif';
      if (fontType === 'mono') return 'font-mono';
      return ''; 
  };

  const themeStyle = character?.visualTheme ? {
      '--bg-main': character.visualTheme.mainBackgroundColor,
      '--text-main': character.visualTheme.textColor,
      '--accent': character.visualTheme.accentColor,
      '--button': character.visualTheme.buttonColor,
      '--border': character.visualTheme.borderColor,
  } as React.CSSProperties : {};

  const renderMessage = (msg: Message, index: number) => {
    let style = "";
    if (msg.speaker === 'game') style = "text-[var(--text-main)] opacity-90 font-serif italic";
    if (msg.speaker === 'player') style = "text-[var(--accent)] font-semibold";
    if (msg.speaker === 'system') style = "text-yellow-400 text-sm";
    
    return (
      <div key={index} className={`mb-4 animate-fade-in ${style}`}>
        {msg.speaker === 'player' && '> '}
        <p className="whitespace-pre-wrap">{msg.text}</p>
      </div>
    );
  };
  
  const renderChoices = () => {
    const options = gameState === GameState.COMBAT ? attackOptions : choices;
    const title = gameState === GameState.COMBAT ? "Choose your attack!" : "What do you do?";
    const buttonClass = gameState === GameState.COMBAT 
        ? "bg-red-800/80 hover:bg-red-700/80 border-red-600" 
        : "bg-[var(--button)] hover:opacity-90 border-[var(--border)]";
        
    if (options.length === 0) return null;
    
    return (
      <div className="animate-fade-in">
        <h3 className="text-xl font-serif text-center mb-4 text-[var(--accent)]">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onPlayerChoice(option)}
              disabled={isLoading}
              className={`p-4 rounded-lg text-left text-[var(--text-main)] font-semibold border-b-4 transition duration-200 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${buttonClass}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCompanions = () => {
      if (potentialCompanions.length === 0 || !onAddCompanion) return null;

      return (
          <div className="mb-6 bg-black/40 border border-[var(--accent)] p-4 rounded-lg shadow-lg animate-fade-in">
              <h4 className="text-sm uppercase font-bold text-[var(--accent)] mb-2 tracking-wider">New Encounter</h4>
              <div className="grid grid-cols-1 gap-3">
                  {potentialCompanions.map((npc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] border border-[var(--border)] p-3 rounded">
                          <div>
                              <p className="font-bold text-[var(--text-main)]">{npc.name}</p>
                              <p className="text-xs text-[var(--text-main)] opacity-70 italic">{npc.kind} - {npc.description}</p>
                          </div>
                          <button 
                            onClick={() => onAddCompanion(npc)}
                            className="ml-4 bg-[var(--accent)] text-slate-900 text-xs font-bold py-2 px-3 rounded hover:opacity-80 transition flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                            </svg>
                            Add Companion
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderPlayerInput = () => {
    const hasChoices = (gameState === GameState.COMBAT ? attackOptions : choices).length > 0;
    const inputClass = "w-full bg-black/40 border border-[var(--border)] rounded-lg py-3 px-4 text-[var(--text-main)] placeholder-[var(--text-main)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition disabled:opacity-50";

    return (
      <div className="mt-4">
        {hasChoices && (
            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-[var(--border)]"></div>
              <span className="flex-shrink mx-4 text-[var(--text-main)] opacity-50 text-sm">OR</span>
              <div className="flex-grow border-t border-[var(--border)]"></div>
            </div>
        )}
        <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={customSpeech}
            onChange={(e) => setCustomSpeech(e.target.value)}
            placeholder="Type what you say (Dialogue)..."
            disabled={isLoading}
            className={inputClass}
          />
          <input
            type="text"
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            placeholder="Type what you do (Action)..."
            disabled={isLoading}
            className={inputClass}
          />
          <input
            type="text"
            value={customStory}
            onChange={(e) => setCustomStory(e.target.value)}
            placeholder="Type what you make happen (Story Event)..."
            disabled={isLoading}
            className={inputClass}
          />
          <button 
            type="submit"
            disabled={isLoading || (customAction.trim().length === 0 && customSpeech.trim().length === 0 && customStory.trim().length === 0)}
            className="bg-[var(--button)] hover:opacity-90 text-[var(--text-main)] font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Submit
          </button>
        </form>
      </div>
    )
  }

  if (!character) {
      return <div className="min-h-screen flex items-center justify-center bg-[#121212]"><LoadingSpinner text="Loading Character..." /></div>
  }

  const containerStyle = character.visualTheme ? themeStyle : {
      '--bg-main': '#121212',
      '--text-main': '#e2e8f0',
      '--accent': '#fbbf24',
      '--button': '#14532d',
      '--border': '#ca8a04',
  } as React.CSSProperties;

  return (
    <div 
        className={`h-screen flex flex-col bg-[#121212] overflow-hidden ${getFontClass(character.visualTheme?.font)}`} 
        style={containerStyle}
    >
        <div className="relative z-10 flex-grow overflow-hidden flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-4">
            
            <div className="lg:w-1/3 w-full lg:h-full overflow-y-auto custom-scrollbar flex-shrink-0">
                <CharacterSheet character={character} onCharacterUpdate={onCharacterUpdate} />
            </div>

            <main className="flex-grow flex flex-col lg:h-full w-full bg-black/20 backdrop-blur-sm border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden">
                
                <div className="flex-shrink-0 p-4 border-b border-[var(--border)] flex justify-end items-center relative flex-wrap gap-2">
                  {saveMessage && <span className={`${saveMessage.isError ? 'text-red-400' : 'text-green-400'} mr-4 transition-opacity duration-500 absolute left-4 font-semibold`}>{saveMessage.text}</span>}
                  {gameState !== GameState.GAME_OVER && (
                    <div className="flex items-center gap-2">
                       <button
                        onClick={onSwitchPerspective}
                        disabled={isLoading}
                        className="bg-[var(--accent)] hover:opacity-90 text-slate-900 font-bold py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                        title="Play as another character in this world"
                      >
                        Switch Perspective
                      </button>
                      <button
                        onClick={onUndo}
                        disabled={!canUndo || isLoading}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                        Undo
                      </button>
                      <button onClick={onSaveGame} disabled={isLoading} className="bg-[var(--button)] hover:opacity-90 text-[var(--text-main)] font-bold py-2 px-4 rounded transition disabled:opacity-50 text-xs sm:text-sm">
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar scroll-smooth">
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-black/40">
                  {isLoading && (
                      <div className="text-center p-6">
                          <LoadingSpinner text="The world shifts and changes..." />
                      </div>
                  )}

                  {!isLoading && gameState !== GameState.GAME_OVER && (
                      <>
                        {renderCompanions()}
                        {renderChoices()}
                        {renderPlayerInput()}
                      </>
                  )}

                  {!isLoading && gameState === GameState.GAME_OVER && (
                      <div className="text-center p-6 animate-fade-in">
                          <h2 className="text-4xl font-serif text-yellow-400">Your Story Has Ended</h2>
                          <p className="mt-4 text-[var(--text-main)] opacity-80">But the world lives on. What will you do?</p>
                          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={onStartAnew} className="bg-[var(--accent)] hover:opacity-90 text-slate-900 font-bold py-3 px-6 rounded-md transition transform hover:scale-105">
                                Start Anew
                            </button>
                            <button onClick={onContinueAsNewCharacter} className="bg-[var(--button)] hover:opacity-90 text-[var(--text-main)] font-bold py-3 px-6 rounded-md transition transform hover:scale-105">
                                Continue as Another Hero
                            </button>
                             <button onClick={onLetFateDecide} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-md transition transform hover:scale-105">
                                Let Fate Decide
                            </button>
                          </div>
                      </div>
                  )}
                </div>
            </main>
        </div>
    </div>
  );
};

export default GameScreen;