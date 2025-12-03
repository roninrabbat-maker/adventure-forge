
import React, { useState, useEffect } from 'react';
import { Character, Companion, InventoryItem } from '../types';

interface CharacterSheetProps {
  character: Character;
  onCharacterUpdate: (character: Character) => void;
}

const HealthBar: React.FC<{ health: number; maxHealth: number }> = ({ health, maxHealth }) => {
  const percentage = Math.max(0, (health / maxHealth) * 100);
  const bgColor = percentage > 60 ? 'bg-green-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="text-lg font-bold text-slate-200">Health</h3>
        <span className="font-mono text-sm text-slate-300">{health} / {maxHealth}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-4 shadow-inner">
        <div
          className={`h-4 rounded-full transition-all duration-500 ease-out ${bgColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- Modals ---

interface SheetModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const SheetModal: React.FC<SheetModalProps> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-cyan-300">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
                {children}
            </div>
        </div>
    </div>
);

// --- Subcomponents ---

const StickFigure: React.FC<{ equippedItems: InventoryItem[] }> = ({ equippedItems }) => {
    const weapons = equippedItems.filter(i => i.type === 'weapon');
    const armor = equippedItems.filter(i => i.type === 'armor');

    return (
        <div className="relative w-full h-64 border border-slate-700 bg-slate-900/50 rounded-lg p-2 flex items-center justify-center overflow-hidden">
             <div className="absolute top-2 left-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Equipped</div>
            <svg viewBox="0 0 100 150" className="h-full stroke-slate-400 stroke-[2] fill-none drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">
                {/* Head */}
                <circle cx="50" cy="25" r="15" />
                {/* Body */}
                <line x1="50" y1="40" x2="50" y2="90" />
                {/* Arms */}
                <line x1="50" y1="55" x2="20" y2="80" />
                <line x1="50" y1="55" x2="80" y2="80" />
                {/* Legs */}
                <line x1="50" y1="90" x2="25" y2="140" />
                <line x1="50" y1="90" x2="75" y2="140" />
            </svg>

            {/* Armor Overlay - Centered on body */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 text-center pointer-events-none">
                {armor.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/80 text-[10px] text-cyan-300 px-1 rounded border border-cyan-900/50 mb-1 whitespace-nowrap">
                        {item.name}
                    </div>
                ))}
            </div>

            {/* Left Hand Weapon */}
            <div className="absolute top-[55%] left-[10%] max-w-[35%] text-right pointer-events-none">
                {weapons[0] && (
                     <div className="bg-slate-900/80 text-[10px] text-red-300 px-1 rounded border border-red-900/50 break-words">
                        {weapons[0].name}
                    </div>
                )}
            </div>

             {/* Right Hand Weapon */}
             <div className="absolute top-[55%] right-[10%] max-w-[35%] text-left pointer-events-none">
                {weapons[1] && (
                     <div className="bg-slate-900/80 text-[10px] text-red-300 px-1 rounded border border-red-900/50 break-words">
                        {weapons[1].name}
                    </div>
                )}
            </div>
        </div>
    );
};


const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onCharacterUpdate }) => {
  const [isEditingBackstory, setIsEditingBackstory] = useState(false);
  const [backstory, setBackstory] = useState(character.backstory);
  
  // Modal States
  const [showInventory, setShowInventory] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);

  // Companion Edit States
  const [editingCompanionId, setEditingCompanionId] = useState<string | null>(null);
  const [companions, setCompanions] = useState<Companion[]>(character.companions || []);

  useEffect(() => {
    setBackstory(character.backstory);
    setCompanions(character.companions || []);
  }, [character]);

  const handleBackstorySave = () => {
    onCharacterUpdate({ ...character, backstory });
    setIsEditingBackstory(false);
  };
  
  const handleCompanionSave = (id: string) => {
    onCharacterUpdate({ ...character, companions: companions });
    setEditingCompanionId(null);
  };

  const handleCompanionChange = (id: string, field: keyof Omit<Companion, 'id'>, value: string) => {
      setCompanions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  if (!character) return null;

  const equippedItems = character.inventory.filter(i => i.type === 'weapon' || i.type === 'armor');
  const inventoryItems = character.inventory.filter(i => i.type === 'item');

  return (
    <aside className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 lg:p-6 space-y-6 shadow-2xl h-full flex flex-col">
      <div className="text-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-serif font-bold text-cyan-300">{character.name}</h2>
        <p className="text-sm text-slate-400 italic">{character.theme}</p>
        <p className="text-cyan-100 mt-1">{character.alignment}</p>
      </div>
      
      <HealthBar health={character.health} maxHealth={character.maxHealth} />
      
      {/* Visual Equipment */}
      <StickFigure equippedItems={equippedItems} />

      {/* Buttons for Inventory and Companions */}
      <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowInventory(true)}
            className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition group"
          >
              {/* Backpack Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-amber-600 group-hover:text-amber-500 mb-1">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold text-slate-300">Inventory</span>
          </button>

          <button 
            onClick={() => setShowCompanions(true)}
            className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition group"
          >
               {/* Two Stick Figures Icon */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-cyan-500 group-hover:text-cyan-400 mb-1">
                  <circle cx="7" cy="7" r="3" />
                  <path d="M4 14h6" />
                  <path d="M7 14v7" />
                  <path d="M4 21h6" />
                  <circle cx="17" cy="7" r="3" />
                  <path d="M14 14h6" />
                  <path d="M17 14v7" />
                  <path d="M14 21h6" />
              </svg>
              <span className="text-sm font-bold text-slate-300">Companions</span>
          </button>
      </div>
      
      {/* Inventory Modal */}
      {showInventory && (
          <SheetModal title="Inventory" onClose={() => setShowInventory(false)}>
               <ul className="space-y-2">
                {character.inventory.length > 0 ? character.inventory.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="bg-slate-900 p-3 rounded-md border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-200">{item.name}</span>
                        <div className="flex items-center gap-2">
                             <span className={`text-[10px] uppercase font-bold px-1.5 rounded ${item.type === 'weapon' ? 'bg-red-900 text-red-200' : item.type === 'armor' ? 'bg-blue-900 text-blue-200' : 'bg-slate-700 text-slate-300'}`}>
                                {item.type}
                            </span>
                            {item.quantity > 1 && <span className="text-xs bg-cyan-900 text-cyan-200 rounded-full px-2 py-0.5">x{item.quantity}</span>}
                        </div>
                    </div>
                    <p className="text-sm text-slate-400 italic">{item.description}</p>
                    </li>
                )) : <p className="text-center text-slate-500 italic">Your pockets are empty.</p>}
                </ul>
          </SheetModal>
      )}

      {/* Companions Modal */}
      {showCompanions && (
          <SheetModal title="Companions" onClose={() => setShowCompanions(false)}>
            <ul className="space-y-4">
                {companions.length > 0 ? companions.map((comp) => (
                    <li key={comp.id} className="bg-slate-900 p-4 rounded-md border border-slate-700">
                        {editingCompanionId === comp.id ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">Name</label>
                                    <input type="text" value={comp.name} onChange={e => handleCompanionChange(comp.id, 'name', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">Kind/Species</label>
                                    <input type="text" value={comp.kind} onChange={e => handleCompanionChange(comp.id, 'kind', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">How you met</label>
                                    <textarea value={comp.backstory} onChange={e => handleCompanionChange(comp.id, 'backstory', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white" rows={3}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">Your Relationship</label>
                                    <textarea value={comp.relationship} onChange={e => handleCompanionChange(comp.id, 'relationship', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white" rows={2}/>
                                </div>
                                <button onClick={() => handleCompanionSave(comp.id)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 text-sm rounded transition w-full">Save Changes</button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-cyan-400 text-lg">{comp.name}</h4>
                                        <p className="text-sm text-slate-300 italic">{comp.kind}</p>
                                    </div>
                                    <button onClick={() => setEditingCompanionId(comp.id)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition">Edit</button>
                                </div>
                                    <div className="mt-3">
                                    <p className="text-xs text-slate-500 uppercase font-semibold">How you met</p>
                                    <p className="text-sm text-slate-300 font-serif italic">{comp.backstory || "A tale yet to be told."}</p>
                                </div>
                                    <div className="mt-3">
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Your Relationship</p>
                                        <p className="text-sm text-slate-300 font-serif italic">{comp.relationship || "A bond waiting to be defined."}</p>
                                </div>
                            </div>
                        )}
                    </li>
                )) : <p className="text-center text-slate-500 italic">You travel alone.</p>}
            </ul>
          </SheetModal>
      )}


      <div className="flex-grow">
        <h3 className="text-lg font-bold text-slate-200 mb-2">Character Details</h3>
        <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {character.customizations.map(({ area, selection }) => (
            <li key={area} className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-1 last:border-0">
              <span className="text-slate-400 capitalize truncate">{area.replace(/_/g, ' ')}:</span>
              <span className="font-semibold text-slate-200 text-right">{selection.join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>

      {character.backstory && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-slate-200">Backstory</h3>
            {!isEditingBackstory && <button onClick={() => setIsEditingBackstory(true)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition">Edit</button>}
          </div>
          {isEditingBackstory ? (
            <div>
              <textarea 
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-300"
              />
              <button onClick={handleBackstorySave} className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 text-sm rounded transition">Save Backstory</button>
            </div>
          ) : (
            <p className="text-sm text-slate-300 font-serif italic max-h-32 overflow-y-auto pr-2">
              {character.backstory}
            </p>
          )}
        </div>
      )}

       {character.canonEvents && (
        <div>
          <h3 className="text-lg font-bold text-slate-200 mb-2">Whispers of Fate (Canon Plot)</h3>
          <p className="text-sm text-slate-400 font-serif italic max-h-32 overflow-y-auto pr-2">
            {character.canonEvents}
          </p>
        </div>
      )}
    </aside>
  );
};

export default CharacterSheet;
