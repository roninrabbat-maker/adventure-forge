
import React, { useState, useEffect } from 'react';
import { GameState, CharacterCreatorOptions, Character, CustomizationArea, SaveData, Companion, CompanionSuggestion, Customization } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface MultiSelectModalProps {
  area: CustomizationArea;
  selections: string[];
  onClose: () => void;
  onSelectionChange: (areaName: string, option: string) => void;
}

const MultiSelectModal: React.FC<MultiSelectModalProps> = ({ area, selections, onClose, onSelectionChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customOption, setCustomOption] = useState('');

  const filteredOptions = area.options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customOption.trim() && !selections.includes(customOption.trim())) {
      onSelectionChange(area.areaName, customOption.trim());
    }
    setCustomOption('');
  };

  const allVisibleOptions = [...new Set([...filteredOptions, ...selections])];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-xl font-bold text-amber-400 capitalize font-serif">{area.areaName.replace(/_/g, ' ')}</h3>
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#121212] border border-slate-800 rounded-md p-2 mt-2 text-white focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div className="overflow-y-auto p-4 flex-grow custom-scrollbar">
          <ul className="space-y-2">
            {allVisibleOptions.sort().map(option => (
              <li key={option}>
                <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selections.includes(option)}
                    onChange={() => onSelectionChange(area.areaName, option)}
                    className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-600"
                  />
                  <span className="text-slate-300">{option}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
         <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleAddCustom} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a custom option..."
              value={customOption}
              onChange={e => setCustomOption(e.target.value)}
              className="flex-grow bg-[#121212] border border-slate-800 rounded-md p-2 text-white focus:ring-amber-500 focus:border-amber-500"
            />
            <button type="submit" className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition">
              Add
            </button>
          </form>
        </div>
        <div className="p-4 border-t border-slate-700 text-right">
          <button onClick={onClose} className="bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold py-2 px-6 rounded-md transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};


interface CharacterCreatorProps {
  gameState: GameState;
  creatorOptions: CharacterCreatorOptions | null;
  onNameSubmit: (name: string, creationMode: 'detailed' | 'simple', world?: string, backstory?: string, worldDetails?: string) => void;
  onCharacterFinalize: (character: Omit<Character, 'id'>, isFromKnownWorld: boolean) => void;
  onFetchTabOptions: (tabIndex: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  savedGames: SaveData[];
  onLoadGame: (saveId: string) => void;
  onDeleteGame: (saveId: string) => void;
  continuedWorldTheme: string | null;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  gameState,
  creatorOptions,
  onNameSubmit,
  onCharacterFinalize,
  onFetchTabOptions,
  isLoading,
  error,
  savedGames,
  onLoadGame,
  onDeleteGame,
  continuedWorldTheme,
}) => {
  const [name, setName] = useState('');
  const [world, setWorld] = useState(continuedWorldTheme || '');
  const [customBackstory, setCustomBackstory] = useState('');
  const [worldDetails, setWorldDetails] = useState('');
  const [selections, setSelections] = useState<{ [key: string]: string[] }>({});
  const [backstory, setBackstory] = useState('');
  const [alignment, setAlignment] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [modalArea, setModalArea] = useState<CustomizationArea | null>(null);
  const [loadingTabs, setLoadingTabs] = useState<Set<number>>(new Set());
  const [companions, setCompanions] = useState<Companion[]>([]);

  useEffect(() => {
    if (creatorOptions) {
      const newSelections = { ...selections };
      let updated = false;
      creatorOptions.customizationTabs.forEach(tab => {
        tab.areas.forEach(area => {
          if (area.options.length > 0 && !newSelections[area.areaName]) {
            newSelections[area.areaName] = [area.options[0]];
            updated = true;
          }
        });
      });

      if (updated) setSelections(newSelections);
      if (!backstory) setBackstory(creatorOptions.backstory);
      if (!alignment && creatorOptions.alignments.length > 0) {
        setAlignment(creatorOptions.alignments[0]);
      }
      if (creatorOptions.startingCompanions && companions.length === 0) {
          const initialCompanions = creatorOptions.startingCompanions.map((sugg: CompanionSuggestion) => ({
              id: `${Date.now()}-${sugg.name.replace(/\s/g, '')}`,
              name: sugg.name,
              kind: sugg.kind,
              backstory: 'A trusted ally found in the starting chapter of your journey.', 
              relationship: 'A budding alliance.' 
          }));
          setCompanions(initialCompanions);
      }
    }
  }, [creatorOptions]);

  const handleSelectionChange = (areaName: string, option: string) => {
    setSelections(prev => {
      const currentSelections = prev[areaName] || [];
      if (currentSelections.includes(option)) {
        return { ...prev, [areaName]: currentSelections.filter(o => o !== option) };
      } else {
        return { ...prev, [areaName]: [...currentSelections, option] };
      }
    });
  };

  const handleFinalize = () => {
    if (!creatorOptions) return;

    // Explicitly mapping selections to the Customization[] type to resolve TS error
    const flattenedCustoms: Customization[] = Object.entries(selections).map(([area, selection]) => ({
      area,
      selection: selection as string[]
    }));

    const finalCharacter: Omit<Character, 'id'> = {
      name,
      theme: creatorOptions.theme,
      description: creatorOptions.description,
      alignment,
      backstory,
      health: creatorOptions.startingHealth,
      maxHealth: creatorOptions.startingHealth,
      customizations: flattenedCustoms,
      inventory: creatorOptions.startingInventory,
      companions: companions,
    };

    onCharacterFinalize(finalCharacter, false);
  };

  if (gameState === GameState.CHARACTER_CREATION_START) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center">
            <h1 className="text-6xl font-serif font-bold text-amber-500 mb-4 drop-shadow-md">Adventure Forge</h1>
            <p className="text-xl text-slate-400 font-light tracking-wide italic">"Your name is the first seed of reality."</p>
          </div>

          <div className="bg-[#1a1a1a] border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a legendary name..."
                  className="w-full bg-[#121212] border border-slate-700 rounded-lg py-4 px-6 text-2xl text-white placeholder-slate-600 focus:ring-2 focus:ring-amber-500 transition shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">World Theme (Optional)</label>
                   <input
                    type="text"
                    value={world}
                    onChange={(e) => setWorld(e.target.value)}
                    placeholder="Witcher, Star Wars, Cyberpunk..."
                    className="w-full bg-[#121212] border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">World Details (Optional)</label>
                  <input
                    type="text"
                    value={worldDetails}
                    onChange={(e) => setWorldDetails(e.target.value)}
                    placeholder="Grim dark, high magic, 19th century..."
                    className="w-full bg-[#121212] border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

               <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Custom Backstory (Optional)</label>
                <textarea
                  value={customBackstory}
                  onChange={(e) => setCustomBackstory(e.target.value)}
                  placeholder="Tell Gemini who you are..."
                  rows={4}
                  className="w-full bg-[#121212] border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 transition resize-none"
                />
              </div>

              {error && <p className="text-red-400 font-semibold text-center bg-red-900/20 p-3 rounded border border-red-900/50">{error}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => onNameSubmit(name, 'detailed', world, customBackstory, worldDetails)}
                  disabled={isLoading || !name.trim()}
                  className="bg-green-800 hover:bg-green-700 text-white font-bold py-5 px-8 rounded-xl transition duration-300 transform hover:-translate-y-1 disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? 'Forging World...' : 'Detailed Creator'}
                </button>
                <button
                  onClick={() => onNameSubmit(name, 'simple', world, customBackstory, worldDetails)}
                  disabled={isLoading || !name.trim()}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold py-5 px-8 rounded-xl transition duration-300 transform hover:-translate-y-1 disabled:opacity-50 shadow-lg"
                >
                   {isLoading ? 'Summoning Hero...' : 'Quick Start'}
                </button>
              </div>
            </div>
          </div>

          {savedGames.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-center text-sm font-bold uppercase tracking-widest text-slate-500">Continue a Tale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedGames.map(save => (
                  <div key={save.id} className="bg-[#1a1a1a] border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-amber-500 transition">
                    <div className="cursor-pointer flex-grow" onClick={() => onLoadGame(save.id)}>
                      <p className="text-lg font-bold text-slate-200 group-hover:text-amber-500">{save.character.name}</p>
                      <p className="text-xs text-slate-500 italic uppercase">{save.character.theme}</p>
                    </div>
                    <button onClick={() => onDeleteGame(save.id)} className="text-slate-600 hover:text-red-400 p-2">
                       &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === GameState.CHARACTER_CREATION_FINALIZE) {
    if (!creatorOptions) return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><LoadingSpinner text="Consulting the Fates..." /></div>;

    const currentTab = creatorOptions.customizationTabs[activeTab];

    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center p-6 text-slate-200 font-serif">
        <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8 mt-8">
          
          <div className="lg:w-1/3 bg-[#1a1a1a] border border-slate-800 rounded-2xl p-6 shadow-2xl h-fit sticky top-8">
            <h2 className="text-3xl font-bold text-amber-500 mb-2">{name}</h2>
            <p className="text-sm text-slate-400 italic mb-4">{creatorOptions.description}</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Backstory</label>
                <textarea 
                   value={backstory}
                   onChange={(e) => setBackstory(e.target.value)}
                   rows={8}
                   className="w-full bg-[#121212] border border-slate-700 rounded p-3 text-sm italic font-sans leading-relaxed text-slate-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Alignment</label>
                <div className="grid grid-cols-2 gap-2">
                  {creatorOptions.alignments.map(align => (
                    <button 
                      key={align}
                      onClick={() => setAlignment(align)}
                      className={`text-xs py-2 px-1 rounded border transition ${alignment === align ? 'bg-amber-600 border-amber-400 text-slate-900 font-bold' : 'bg-black/20 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleFinalize}
                disabled={isLoading}
                className="w-full bg-green-800 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:scale-105"
              >
                {isLoading ? 'Forging Fate...' : 'Forge Character'}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex flex-col gap-6">
             <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {creatorOptions.customizationTabs.map((tab, idx) => (
                    <button
                        key={tab.tabName}
                        onClick={() => setActiveTab(idx)}
                        className={`px-4 py-2 rounded-t-lg font-bold text-sm uppercase tracking-widest transition-all ${activeTab === idx ? 'bg-amber-600 text-slate-900 scale-105 z-10' : 'bg-[#1a1a1a] text-slate-500 border border-slate-800 hover:text-slate-300'}`}
                    >
                        {tab.tabName}
                    </button>
                ))}
             </div>

             <div className="bg-[#1a1a1a] border border-slate-800 rounded-b-2xl rounded-tr-2xl p-8 shadow-2xl flex-grow font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {currentTab.areas.map((area, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-amber-500/80">{area.areaName.replace(/_/g, ' ')}</h4>
                                <button 
                                  onClick={() => setModalArea(area)}
                                  className="text-[10px] uppercase font-bold text-slate-500 hover:text-amber-400 transition"
                                >
                                  Modify List
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {(selections[area.areaName] || []).map(sel => (
                                    <span key={sel} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">
                                        {sel}
                                    </span>
                                ))}
                                {(selections[area.areaName] || []).length === 0 && (
                                    <p className="text-xs text-slate-600 italic">No selections yet.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {currentTab.areas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <LoadingSpinner text="Loading traits..." />
                  </div>
                )}
             </div>
          </div>
        </div>
        
        {modalArea && (
            <MultiSelectModal 
                area={modalArea} 
                selections={selections[modalArea.areaName] || []} 
                onClose={() => setModalArea(null)}
                onSelectionChange={handleSelectionChange}
            />
        )}
      </div>
    );
  }

  return null;
};

export default CharacterCreator;
