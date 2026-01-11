import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, BarChart3, Info, AlertCircle } from 'lucide-react';

interface EntityIntelligence {
    id: string;
    name: string;
    type: string;
    data: {
        financial_health?: string;
        esg_score?: number;
        industry?: string;
        risk_level?: string;
        source?: string;
    };
}

export const CSIPanel: React.FC<{ marketId: string }> = ({ marketId }) => {
    const [entities, setEntities] = useState<EntityIntelligence[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCSI() {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('market_entities')
                    .select(`
            entities (
              id,
              name,
              type,
              entity_data (
                data,
                source
              )
            )
          `)
                    .eq('market_id', marketId);

                if (fetchError) throw fetchError;

                const formatted = (data || []).map((item: any) => {
                    const entity = item.entities;
                    const latestData = entity.entity_data?.[0] || { data: {}, source: 'none' };
                    return {
                        id: entity.id,
                        name: entity.name,
                        type: entity.type,
                        data: {
                            ...latestData.data,
                            source: latestData.source
                        }
                    };
                });

                setEntities(formatted);
            } catch (err: any) {
                console.error('Error fetching CSI data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchCSI();
    }, [marketId]);

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-gray-50 rounded-xl" />
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Shield size={20} className="text-indigo-600" />
                Entity Intelligence
            </h3>

            <div className="space-y-6">
                {entities.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Info className="mx-auto text-gray-300 mb-2" size={24} />
                        <p className="text-gray-500 text-sm">No linked entities detected</p>
                    </div>
                ) : (
                    entities.map((entity) => (
                        <div key={entity.id} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-900">{entity.name}</span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold uppercase text-gray-500">
                                    {entity.type}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Health</p>
                                    <p className="text-sm font-bold text-gray-700">{entity.data.financial_health || 'Stable'}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">ESG Rank</p>
                                    <p className="text-sm font-bold text-green-600">{entity.data.esg_score || 'A+'}</p>
                                </div>
                            </div>

                            {entity.data.source === 'mock' && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-100">
                                    <AlertCircle size={12} />
                                    <span className="text-[10px] font-medium italic">Simulated data for POC</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
