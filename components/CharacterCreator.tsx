
import React, { useState, useEffect } from 'react';
import { GameState, CharacterCreatorOptions, Character, CustomizationArea, SaveData, Companion, CompanionSuggestion } from '../types';
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-xl font-bold text-cyan-300 capitalize">{area.areaName.replace(/_/g, ' ')}</h3>
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 mt-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div className="overflow-y-auto p-4 flex-grow">
          <ul className="space-y-2">
            {allVisibleOptions.sort().map(option => (
              <li key={option}>
                <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selections.includes(option)}
                    onChange={() => onSelectionChange(area.areaName, option)}
                    className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-cyan-500 focus:ring-cyan-600"
                  />
                  <span className="text-slate-300">{option}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
         <div className="p-4 border-t border-slate-600">
          <form onSubmit={handleAddCustom} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a custom option..."
              value={customOption}
              onChange={e => setCustomOption(e.target.value)}
              className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md transition">
              Add
            </button>
          </form>
        </div>
        <div className="p-4 border-t border-slate-600 text-right">
          <button onClick={onClose} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2 px-6 rounded-md transition">
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
    // This effect now correctly handles progressively loaded options.
    if (creatorOptions) {
      const newSelections = { ...selections };
      let updated = false;
      creatorOptions.customizationTabs.forEach(tab => {
        tab.areas.forEach(area => {
          // If options are now available but we haven't set a default, set one.
          if (area.options.length > 0 && !newSelections[area.areaName]) {
            newSelections[area.areaName] = [area.options[0]];
            updated = true;
          }
        });
      });

      if (updated) {
        setSelections(newSelections);
      }
      
      if (!backstory) setBackstory(creatorOptions.backstory);
      if (!alignment && creatorOptions.alignments.length > 0) {
        setAlignment(creatorOptions.alignments[0]);
      }
      // Populate companions from suggestions, but only on first load of creatorOptions
      if (creatorOptions.startingCompanions && companions.length === 0) {
          const initialCompanions = creatorOptions.startingCompanions.map((sugg: CompanionSuggestion) => ({
              id: `${Date.now()}-${sugg.name.replace(/\s/g, '')}`,
              name: sugg.name,
              kind: sugg.kind,
              backstory: '', // User will fill this
              relationship: '' // and this
          }));
          setCompanions(initialCompanions);
      }
    }
  }, [creatorOptions, selections, backstory, alignment, companions.length]);

  const handleTabClick = async (index: number) => {
    setActiveTab(index);
    if (!creatorOptions) return;

    const tabData = creatorOptions.customizationTabs[index];
    // If the first area has no options, we need to load this tab's data.
    if (tabData && tabData.areas.length > 0 && tabData.areas[0].options.length === 0) {
      setLoadingTabs(prev => new Set(prev).add(index));
      try {
        await onFetchTabOptions(index);
      } catch(e) {
        // Optionally handle tab-specific errors
        console.error(e);
      } finally {
        setLoadingTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }
    }
  };

  const handleSubmit = (creationMode: 'detailed' | 'simple') => {
    if (name.trim()) {
      onNameSubmit(name.trim(), creationMode, world.trim() || undefined, customBackstory.trim() || undefined, worldDetails.trim() || undefined);
    }
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit('detailed');
  };

  const handleSelectionChange = (areaName: string, option: string) => {
    setSelections(prev => {
        const currentSelections = prev[areaName] || [];
        const newSelections = currentSelections.includes(option)
            ? currentSelections.filter(item => item !== option)
            : [...currentSelections, option];
        return { ...prev, [areaName]: newSelections };
    });
  };

  const handleFinalize = () => {
    if (!creatorOptions) return;
    
    const isFromKnownWorld = !!world.trim();

    // Fix: Using Object.keys().map() to avoid type inference issues with Object.entries().
    const customizationsArray = Object.keys(selections).map((area) => ({
      area,
      selection: selections[area],
    }));

    const finalCharacter: Omit<Character, 'id'> = {
      name,
      theme: creatorOptions.theme,
      description: creatorOptions.description,
      backstory: backstory,
      alignment: alignment,
      health: creatorOptions.startingHealth,
      maxHealth: creatorOptions.startingHealth,
      customizations: customizationsArray,
      inventory: creatorOptions.startingInventory,
      companions: companions.filter(c => c.name.trim() !== '' && c.kind.trim() !== ''), // Filter out empty companions
      isFromKnownWorld: isFromKnownWorld,
    };
    onCharacterFinalize(finalCharacter, isFromKnownWorld);
  };
  
  const handleAddCompanion = () => {
    const newCompanion: Companion = {
      id: `${Date.now()}-new`,
      name: '',
      kind: '',
      backstory: '',
      relationship: ''
    };
    setCompanions([...companions, newCompanion]);
  };

  const handleCompanionChange = (id: string, field: keyof Omit<Companion, 'id'>, value: string) => {
      setCompanions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveCompanion = (id: string) => {
      setCompanions(prev => prev.filter(c => c.id !== id));
  };


  const renderNameInput = () => (
    <div className="w-full max-w-3xl mx-auto text-center">
      <h1 className="text-5xl font-serif font-bold text-white mb-2">Gemini Adventure Forge</h1>
        {continuedWorldTheme ? (
            <p className="text-slate-300 mb-8">The previous hero has fallen. A new adventurer is needed in the world of <span className="font-bold text-cyan-400">{continuedWorldTheme}</span>.</p>
        ) : (
             <p className="text-slate-300 mb-8">Forge a new destiny or continue an existing tale.</p>
        )}

      {savedGames.length > 0 && !continuedWorldTheme && (
          <div className="mb-10 animate-fade-in">
              <h2 className="text-2xl font-serif text-slate-300 mb-4">Continue an Adventure</h2>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3 text-left">
                  {savedGames.sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()).map(save => (
                      <div key={save.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-md">
                          <div>
                              <p className="font-bold text-lg text-cyan-400">{save.character.name}</p>
                              <p className="text-sm text-slate-400 italic">{save.character.theme}</p>
                              <p className="text-xs text-slate-500 mt-1">Last saved: {new Date(save.lastSaved).toLocaleString()}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                              <button onClick={() => onLoadGame(save.id)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition">Load</button>
                              <button onClick={() => onDeleteGame(save.id)} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition">Delete</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="mt-8">
            <div className="flex items-center mb-4">
              <div className="flex-grow border-t border-slate-600"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-lg font-serif">Or Start a New Adventure</span>
              <div className="flex-grow border-t border-slate-600"></div>
            </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a character name... e.g., Davy Jones"
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-md py-3 px-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                  required
                />
                <textarea
                  value={customBackstory}
                  onChange={(e) => setCustomBackstory(e.target.value)}
                  placeholder="Provide a backstory for your character... (Optional)"
                  rows={3}
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-md py-3 px-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                />
                
                <input
                  type="text"
                  value={world}
                  onChange={(e) => setWorld(e.target.value)}
                  placeholder="Enter a world... e.g., Star Wars (Optional)"
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-md py-3 px-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition read-only:bg-slate-700 read-only:cursor-not-allowed"
                  readOnly={!!continuedWorldTheme}
                />
                 <textarea
                  value={worldDetails}
                  onChange={(e) => setWorldDetails(e.target.value)}
                  placeholder="World History & Culture (Optional) - Add flavor to your world..."
                  rows={3}
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-md py-3 px-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                  readOnly={!!continuedWorldTheme}
                />

                <div className="flex flex-col sm:flex-row shrink-0 gap-4 justify-center mt-2">
                  <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-8 rounded-md text-lg transition duration-300 transform hover:scale-105">
                    Detailed Creation
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubmit('simple')} 
                    disabled={!name.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-md text-lg transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Quick Start (AI)
                  </button>
                </div>
            </form>
       </div>
       {error && <p className="text-red-400 mt-4">{error}</p>}
    </div>
  );
  
  const renderFinalizeScreen = () => {
    if (!creatorOptions) return null;
    
    const currentTabData = creatorOptions.customizationTabs[activeTab];

    return (
      <>
        {modalArea && (
          <MultiSelectModal
            area={modalArea}
            selections={selections[modalArea.areaName] || []}
            onClose={() => setModalArea(null)}
            onSelectionChange={handleSelectionChange}
          />
        )}
        <div className="w-full max-w-6xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 shadow-2xl animate-fade-in">
          <div className="text-center mb-8">
              <h2 className="text-4xl font-serif text-cyan-300">Create Your Character: {name}</h2>
              <p className="text-slate-400 mt-2">The world of <span className="font-bold text-cyan-400">{creatorOptions.theme}</span> awaits.</p>
              <p className="text-sm italic mt-1">{creatorOptions.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-8">
              <div>
                  <h3 className="text-xl font-serif text-slate-100 mb-2">Your Backstory</h3>
                  <textarea
                      value={backstory}
                      onChange={(e) => setBackstory(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-3 text-slate-300 focus:ring-cyan-500 focus:border-cyan-500 transition"
                      placeholder="Craft your story..."
                  />
              </div>
              <div>
                  <h3 className="text-xl font-serif text-slate-100 mb-2">Alignment</h3>
                  <select
                      value={alignment}
                      onChange={(e) => setAlignment(e.target.value)}
                      className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-3 text-slate-300 focus:ring-cyan-500 focus:border-cyan-500 transition"
                  >
                      {creatorOptions.alignments.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-serif text-slate-100 mb-4 border-b-2 border-slate-600 pb-2">Companions & Familiars</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {companions.map(comp => (
                    <div key={comp.id} className="bg-slate-900/70 border border-slate-600 rounded-lg p-4 relative animate-fade-in">
                        <button onClick={() => handleRemoveCompanion(comp.id)} className="absolute top-2 right-2 bg-red-700 hover:bg-red-600 text-white font-bold p-1 rounded-full w-7 h-7 flex items-center justify-center transition">&times;</button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Name</label>
                                <input type="text" value={comp.name} onChange={(e) => handleCompanionChange(comp.id, 'name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Kind/Species</label>
                                <input type="text" value={comp.kind} onChange={(e) => handleCompanionChange(comp.id, 'kind', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-300 mb-1">How you met (Backstory)</label>
                                <textarea value={comp.backstory} onChange={(e) => handleCompanionChange(comp.id, 'backstory', e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"></textarea>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-300 mb-1">Your Relationship</label>
                                <textarea value={comp.relationship} onChange={(e) => handleCompanionChange(comp.id, 'relationship', e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"></textarea>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={handleAddCompanion} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition">
                + Add Companion
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
              {/* Tabs Sidebar */}
              <div className="flex flex-row md:flex-col md:w-1/4 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                  {creatorOptions.customizationTabs.map((tab, index) => (
                      <button 
                          key={tab.tabName}
                          onClick={() => handleTabClick(index)}
                          className={`text-left w-full shrink-0 p-3 rounded-md mb-2 transition-colors duration-200 ${activeTab === index ? 'bg-cyan-500 text-slate-900 font-bold' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                      >
                          {tab.tabName}
                      </button>
                  ))}
              </div>

              {/* Customization Area */}
              <div className="flex-1">
                  <h3 className="text-2xl font-serif text-slate-100 mb-4 border-b-2 border-slate-600 pb-2">{currentTabData.tabName}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 max-h-[40vh] overflow-y-auto pr-3">
                      {loadingTabs.has(activeTab) ? (
                        <div className="lg:col-span-2 flex justify-center items-center h-32">
                          <LoadingSpinner text={`Loading ${currentTabData.tabName}...`} />
                        </div>
                      ) : (
                        currentTabData.areas.map(area => (
                            <div key={area.areaName}>
                                <label className="block text-sm font-bold text-slate-300 capitalize mb-1">{area.areaName.replace(/_/g, ' ')}</label>
                                <button
                                  onClick={() => setModalArea(area)}
                                  disabled={area.options.length === 0}
                                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-left truncate focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  { (selections[area.areaName] || []).length > 0
                                    ? `${(selections[area.areaName] || []).length} selected`
                                    : 'Select...'
                                  }
                                </button>
                            </div>
                        ))
                      )}
                  </div>
              </div>
          </div>


          <div className="text-center mt-10">
              <button onClick={handleFinalize} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-lg text-xl transition duration-300 transform hover:scale-105 shadow-lg">
                  Begin Adventure
              </button>
          </div>
        </div>
      </>
    );
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/1920/1000?blur=5&grayscale')"}}>
        <div className="absolute inset-0 bg-slate-900/70"></div>
        <div className="relative z-10 w-full">
            {isLoading && <LoadingSpinner text={gameState === GameState.CHARACTER_CREATION_START ? 'Forging your universe...' : 'Preparing your journey...'} />}
            {!isLoading && gameState === GameState.CHARACTER_CREATION_START && renderNameInput()}
            {!isLoading && gameState === GameState.CHARACTER_CREATION_FINALIZE && renderFinalizeScreen()}
        </div>
    </div>
  );
};

export default CharacterCreator;
