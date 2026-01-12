import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Market {
    id: number | string;
    title: string;
    category: string;
    [key: string]: any;
}

interface MarketListProps {
    markets: Market[];
    selectedId: number | string | null;
    onSelectMarket: (id: any) => void;
}

const MarketList: React.FC<MarketListProps> = ({
    markets,
    selectedId,
    onSelectMarket
}: MarketListProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {markets.map((market: Market) => {
                const isSelected = selectedId === market.id || selectedId?.toString() === market.id.toString();

                return (
                    <div
                        key={market.id}
                        onClick={() => onSelectMarket(market.id)}
                        className={cn(
                            "bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm transition-all duration-300 cursor-pointer group hover:shadow-md hover:border-indigo-300",
                            isSelected && "border-indigo-500 bg-indigo-50 shadow-indigo-100 ring-1 ring-indigo-500/10"
                        )}
                    >
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"
                                )}>
                                    {market.category || 'General'}
                                </span>
                                {isSelected && (
                                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse ml-auto" />
                                )}
                            </div>

                            <h4 className={cn(
                                "text-sm font-bold leading-tight transition-colors",
                                isSelected ? "text-indigo-900" : "text-slate-700 group-hover:text-indigo-800"
                            )}>
                                {market.title}
                            </h4>

                            <div className="mt-auto pt-4 flex items-center justify-between">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    isSelected ? "text-indigo-400" : "text-slate-400"
                                )}>
                                    ID: {market.id}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity",
                                    isSelected ? "text-indigo-600 opacity-100" : "text-indigo-400"
                                )}>
                                    {isSelected ? 'Active Analysis' : 'Analyze Intelligence'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MarketList;
