import React, { useState, useEffect } from 'react';
import { Character, Companion, InventoryItem } from '../types';

interface CharacterSheetProps {
  character: Character;
  onCharacterUpdate: (character: Character) => void;
}

const HealthBar: React.FC<{ health: number; maxHealth: number }> = ({ health, maxHealth }) => {
  const percentage = Math.max(0, (health / maxHealth) * 100);
  const bgColor = percentage > 60 ? 'bg-green-600' : percentage > 30 ? 'bg-yellow-600' : 'bg-red-600';

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="text-lg font-bold text-[var(--accent)] font-serif">Health</h3>
        <span className="font-mono text-sm text-[var(--text-main)] opacity-80">{health} / {maxHealth}</span>
      </div>
      <div className="w-full bg-black/40 rounded-full h-4 shadow-inner border border-[var(--border)]/30">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${bgColor}`}
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
        <div className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-black/20">
                <h3 className="text-xl font-bold text-[var(--accent)] font-serif">{title}</h3>
                <button onClick={onClose} className="text-[var(--text-main)] opacity-60 hover:opacity-100 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow text-[var(--text-main)]">
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
        <div className="relative w-full h-64 border border-[var(--border)] bg-black/20 rounded-lg p-2 flex items-center justify-center overflow-hidden mb-6">
             <div className="absolute top-2 left-2 text-xs font-bold text-[var(--text-main)] opacity-40 uppercase tracking-widest">Equipped</div>
            <svg viewBox="0 0 100 150" className="h-full stroke-[var(--text-main)] opacity-80 stroke-[2] fill-none drop-shadow-[0_0_2px_rgba(251,191,36,0.3)]">
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

            {/* Armor Overlay */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 text-center pointer-events-none">
                {armor.map((item, idx) => (
                    <div key={idx} className="bg-[#121212] text-[10px] text-[var(--accent)] px-2 py-0.5 rounded border border-[var(--border)] mb-1 whitespace-nowrap shadow-md">
                        {item.name}
                    </div>
                ))}
            </div>

            {/* Left Hand Weapon */}
            <div className="absolute top-[55%] left-[5%] max-w-[40%] text-right pointer-events-none">
                {weapons[0] && (
                     <div className="bg-[#121212] text-[10px] text-red-300 px-2 py-0.5 rounded border border-red-900/50 break-words shadow-md">
                        {weapons[0].name}
                    </div>
                )}
            </div>

             {/* Right Hand Weapon */}
             <div className="absolute top-[55%] right-[5%] max-w-[40%] text-left pointer-events-none">
                {weapons[1] && (
                     <div className="bg-[#121212] text-[10px] text-red-300 px-2 py-0.5 rounded border border-red-900/50 break-words shadow-md">
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
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    setBackstory(character.backstory);
  }, [character.backstory]);

  const handleSaveBackstory = () => {
      onCharacterUpdate({ ...character, backstory });
      setIsEditingBackstory(false);
  };

  const handleRemoveItem = (itemToRemove: InventoryItem) => {
      if(window.confirm(`Drop ${itemToRemove.name}?`)) {
        const newInventory = [...character.inventory];
        const index = newInventory.findIndex(i => i.name === itemToRemove.name);
        if (index > -1) {
            newInventory.splice(index, 1);
            onCharacterUpdate({ ...character, inventory: newInventory });
            setViewItem(null);
        }
      }
  };

  const handleDeleteCompanion = (companionId: string) => {
    if (window.confirm("Are you sure you want to part ways with this companion?")) {
        const updatedCompanions = character.companions?.filter(c => c.id !== companionId) || [];
        onCharacterUpdate({ ...character, companions: updatedCompanions });
    }
  };

  return (
    <div className="bg-[#1a1a1a] h-full p-6 border-r border-[var(--border)] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="text-center mb-6">
            <h2 className="text-3xl font-bold font-serif text-[var(--accent)] drop-shadow-sm">{character.name}</h2>
            <p className="text-sm text-[var(--text-main)] opacity-70 italic">{character.alignment} | {character.theme}</p>
        </div>

        {/* Visualizer */}
        <StickFigure equippedItems={character.inventory} />

        {/* Health */}
        <div className="mb-8">
            <HealthBar health={character.health} maxHealth={character.maxHealth} />
        </div>

        {/* Stats / Details */}
        <div className="mb-8 bg-black/20 p-4 rounded-lg border border-[var(--border)]">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold font-serif text-[var(--text-main)]">Backstory</h3>
                <button 
                    onClick={() => isEditingBackstory ? handleSaveBackstory() : setIsEditingBackstory(true)}
                    className="text-xs text-[var(--accent)] hover:underline uppercase font-bold tracking-wider"
                >
                    {isEditingBackstory ? 'Save' : 'Edit'}
                </button>
             </div>
             
             {isEditingBackstory ? (
                 <textarea 
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    rows={6}
                    className="w-full bg-black/30 border border-[var(--border)] rounded p-2 text-sm text-[var(--text-main)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                 />
             ) : (
                 <p className="text-sm text-[var(--text-main)] opacity-80 leading-relaxed whitespace-pre-wrap">{character.backstory}</p>
             )}
        </div>

        {/* Inventory */}
        <div className="mb-8">
            <h3 className="text-xl font-bold text-[var(--accent)] mb-4 border-b border-[var(--border)] pb-2 flex justify-between items-center">
                Inventory
                <span className="text-xs font-normal text-[var(--text-main)] opacity-50">{character.inventory.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {character.inventory.map((item, idx) => (
                    <div 
                        key={`${item.name}-${idx}`} 
                        onClick={() => setViewItem(item)}
                        className="flex justify-between items-center p-3 rounded bg-black/20 hover:bg-[var(--accent)]/10 border border-transparent hover:border-[var(--accent)] cursor-pointer transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${item.type === 'weapon' ? 'bg-red-400' : item.type === 'armor' ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                            <span className="font-medium text-[var(--text-main)]">{item.name}</span>
                        </div>
                        <span className="text-xs font-mono text-[var(--text-main)] opacity-60 bg-black/30 px-2 py-0.5 rounded">x{item.quantity}</span>
                    </div>
                ))}
                {character.inventory.length === 0 && <p className="text-[var(--text-main)] opacity-50 italic text-sm text-center py-4">Your bag is empty.</p>}
            </div>
        </div>

        {/* Companions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-4 border-b border-[var(--border)] pb-2 flex justify-between items-center">
              Companions
              <span className="text-xs font-normal text-[var(--text-main)] opacity-50">{character.companions?.length || 0}</span>
          </h3>
          
          {(!character.companions || character.companions.length === 0) && (
              <p className="text-[var(--text-main)] opacity-60 italic text-sm text-center py-4">You travel alone.</p>
          )}

          <div className="space-y-4">
              {character.companions?.map(comp => (
                  <div key={comp.id} className="bg-black/20 p-4 rounded border border-[var(--border)] relative group transition hover:border-[var(--accent)]/50">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <p className="font-bold text-[var(--text-main)] text-lg">{comp.name}</p>
                              <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-bold">{comp.kind}</p>
                          </div>
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCompanion(comp.id);
                            }}
                            className="text-[var(--text-main)] opacity-40 hover:opacity-100 hover:text-red-400 transition-all p-1"
                            title="Dismiss Companion"
                          >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                          </button>
                      </div>
                      <p className="text-sm text-[var(--text-main)] opacity-80 italic mb-2 leading-snug">{comp.backstory}</p>
                      <div className="text-xs border-t border-[var(--border)]/30 pt-2 mt-2">
                          <span className="font-bold text-[var(--text-main)] opacity-60">Bond: </span>
                          <span className="text-[var(--text-main)]">{comp.relationship}</span>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        {/* Item Details Modal */}
        {viewItem && (
            <SheetModal title={viewItem.name} onClose={() => setViewItem(null)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            viewItem.type === 'weapon' ? 'bg-red-900/50 text-red-200 border border-red-700' : 
                            viewItem.type === 'armor' ? 'bg-blue-900/50 text-blue-200 border border-blue-700' : 
                            'bg-green-900/50 text-green-200 border border-green-700'
                        }`}>
                            {viewItem.type}
                        </span>
                        <span className="text-xs text-[var(--text-main)] opacity-50">Quantity: {viewItem.quantity}</span>
                    </div>
                    <p className="text-base leading-relaxed">{viewItem.description}</p>
                    <div className="pt-4 border-t border-[var(--border)]/30 flex justify-end">
                        <button 
                            onClick={() => handleRemoveItem(viewItem)}
                            className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Drop Item
                        </button>
                    </div>
                </div>
            </SheetModal>
        )}
    </div>
  );
};

export default CharacterSheet;