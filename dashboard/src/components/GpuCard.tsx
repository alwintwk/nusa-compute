'use client';

import { Cpu, Zap, HardDrive } from 'lucide-react';
import type { GpuNode } from '@/lib/supabaseClient';

interface GpuCardProps {
    node: GpuNode;
}

export function GpuCard({ node }: GpuCardProps) {
    const isOnline = node.status === 'online';
    const loadPercentage = Math.min(100, Math.max(0, node.current_load));

    // Format VRAM to GB
    const vramGB = (node.vram_total / 1024).toFixed(1);

    // Extract GPU model (e.g., "RTX 4090" from "NVIDIA GeForce RTX 4090")
    const gpuModel = node.gpu_name.replace(/NVIDIA\s*(GeForce)?\s*/i, '').trim();

    return (
        <div className="gpu-card group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            {/* Glow effect background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Status indicator */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'} animate-pulse`} />
                <span className={`text-xs font-medium uppercase tracking-wider ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                    {node.status}
                </span>
            </div>

            {/* GPU Icon & Name */}
            <div className="relative mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 ring-1 ring-cyan-500/30">
                    <Cpu className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{gpuModel}</h3>
                    <p className="text-xs text-gray-500">Node: {node.node_id.slice(0, 8)}...</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="relative mb-6 grid grid-cols-2 gap-4">
                {/* VRAM */}
                <div className="rounded-xl bg-gray-800/50 p-3 ring-1 ring-gray-700/50">
                    <div className="mb-1 flex items-center gap-2 text-gray-400">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">VRAM</span>
                    </div>
                    <p className="text-lg font-bold text-white">{vramGB} <span className="text-sm text-gray-400">GB</span></p>
                </div>

                {/* Load */}
                <div className="rounded-xl bg-gray-800/50 p-3 ring-1 ring-gray-700/50">
                    <div className="mb-1 flex items-center gap-2 text-gray-400">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">Load</span>
                    </div>
                    <p className="text-lg font-bold text-white">{loadPercentage.toFixed(1)}<span className="text-sm text-gray-400">%</span></p>
                </div>
            </div>

            {/* Load Progress Bar */}
            <div className="relative mb-6">
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 transition-all duration-500 ease-out"
                        style={{
                            width: `${loadPercentage}%`,
                            boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
                        }}
                    />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Rent Button */}
            <button
                disabled={!isOnline}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-cyan-400 hover:to-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none"
            >
                <span className="relative z-10">{isOnline ? 'Rent Now' : 'Unavailable'}</span>
            </button>
        </div>
    );
}
