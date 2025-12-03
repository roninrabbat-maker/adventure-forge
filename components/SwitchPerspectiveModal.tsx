
import React from 'react';
import { SaveData, Character } from '../types';

interface SwitchPerspectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames: SaveData[];
  currentCharacterId: string | undefined;
  currentTheme: string | undefined;
  onSelectCharacter: (saveId: string) => void;
  onCreateNew: () => void;
}

const SwitchPerspectiveModal: React.FC<SwitchPerspectiveModalProps> = ({
  isOpen,
  onClose,
  savedGames,
  currentCharacterId,
  currentTheme,
  onSelectCharacter,
  onCreateNew,
}) => {
  if (!isOpen) return null;

  // Filter saves to only show characters in the same world (theme) and exclude the current one
  const availableCharacters = savedGames.filter(
    save => save.character.theme === currentTheme && save.character.id !== currentCharacterId
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 border-b border-slate-700 text-center">
          <h2 className="text-2xl font-serif font-bold text-cyan-400">Switch Perspective</h2>
          <p className="text-slate-400 mt-2">Choose another character in the world of <span className="text-white font-semibold">{currentTheme}</span></p>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          <div 
            onClick={onCreateNew}
            className="bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-700 hover:border-indigo-500 rounded-lg p-4 cursor-pointer transition group flex items-center justify-between"
          >
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">Create New Character</h3>
              <p className="text-sm text-indigo-200">Enter this world as a new hero (or villain).</p>
            </div>
            <span className="text-2xl text-indigo-400 group-hover:text-cyan-300 transition">+</span>
          </div>

          {availableCharacters.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Existing Characters</h3>
              <div className="space-y-3">
                {availableCharacters.map(save => (
                  <div 
                    key={save.id}
                    onClick={() => onSelectCharacter(save.id)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-500 rounded-lg p-4 cursor-pointer transition group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-slate-200 group-hover:text-cyan-400 transition">{save.character.name}</h4>
                        <p className="text-sm text-slate-400 italic">{save.character.alignment}</p>
                      </div>
                      <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-500">
                        Level {Math.floor((save.messages.length / 10) + 1)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                       {save.messages.slice(-1)[0]?.text || "Waiting to continue..."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableCharacters.length === 0 && (
            <p className="text-center text-slate-500 italic mt-4">No other characters found in this world yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwitchPerspectiveModal;
