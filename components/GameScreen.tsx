
import React, { useRef, useEffect, useState } from 'react';
import { Character, GameState, Message } from '../types';
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

  // Helper to get font class
  const getFontClass = (fontType?: string) => {
      if (fontType === 'serif') return 'font-serif';
      if (fontType === 'mono') return 'font-mono';
      return ''; // Default sans
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

  const renderPlayerInput = () => {
    const hasChoices = (gameState === GameState.COMBAT ? attackOptions : choices).length > 0;
    const inputClass = "w-full bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-lg py-3 px-4 text-[var(--text-main)] placeholder-[var(--text-main)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition disabled:opacity-50";

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
      return <div className="min-h-screen flex items-center justify-center bg-slate-900"><LoadingSpinner text="Loading Character..." /></div>
  }

  // Fallback defaults if theme is missing (should not happen with new characters)
  const containerStyle = character.visualTheme ? themeStyle : {
      '--bg-main': '#0f172a',
      '--text-main': '#e2e8f0',
      '--accent': '#22d3ee',
      '--button': '#4f46e5',
      '--border': '#334155',
  } as React.CSSProperties;

  return (
    <div 
        className={`min-h-screen bg-[var(--bg-main)] bg-cover bg-fixed p-4 sm:p-6 lg:p-8 ${getFontClass(character.visualTheme?.font)}`} 
        style={{...containerStyle, backgroundImage: "url('https://picsum.photos/1920/1080?blur=10&grayscale')"}}
    >
        <div className="absolute inset-0 bg-[var(--bg-main)]/80"></div>
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 text-[var(--text-main)]">
            <div className="lg:col-span-1 lg:sticky top-8 self-start">
                <CharacterSheet character={character} onCharacterUpdate={onCharacterUpdate} />
            </div>

            <main className="lg:col-span-2 bg-[var(--bg-main)]/60 backdrop-blur-sm border border-[var(--border)] rounded-lg shadow-2xl p-6 min-h-[80vh] flex flex-col">
                <div className="flex justify-end items-center mb-4 relative flex-wrap gap-2">
                  {saveMessage && <span className={`${saveMessage.isError ? 'text-red-400' : 'text-green-400'} mr-4 transition-opacity duration-500 absolute left-0 font-semibold`}>{saveMessage.text}</span>}
                  {gameState !== GameState.GAME_OVER && (
                    <div className="flex items-center gap-2">
                       <button
                        onClick={onSwitchPerspective}
                        disabled={isLoading}
                        className="bg-[var(--accent)] hover:opacity-90 text-slate-900 font-bold py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        title="Play as another character in this world"
                      >
                        Switch Perspective
                      </button>
                      <button
                        onClick={onUndo}
                        disabled={!canUndo || isLoading}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Undo
                      </button>
                      <button onClick={onSaveGame} disabled={isLoading} className="bg-[var(--button)] hover:opacity-90 text-[var(--text-main)] font-bold py-2 px-4 rounded transition disabled:opacity-50">
                        Save Game
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-grow overflow-y-auto pr-4 mb-4">
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="mt-auto pt-4 border-t border-[var(--border)]">
                  {isLoading && (
                      <div className="text-center p-6">
                          <LoadingSpinner text="The world shifts and changes..." />
                      </div>
                  )}

                  {!isLoading && gameState !== GameState.GAME_OVER && (
                      <>
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
