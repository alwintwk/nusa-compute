'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Cpu, Globe, Zap, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured, type GpuNode } from '@/lib/supabaseClient';
import { GpuCard } from '@/components/GpuCard';

// Demo data for when Supabase isn't configured
const DEMO_NODES: GpuNode[] = [
  {
    node_id: 'demo-node-001-rtx4090',
    gpu_name: 'NVIDIA GeForce RTX 4090',
    vram_total: 24576,
    current_load: 23.5,
    status: 'online',
    last_seen: new Date().toISOString(),
  },
  {
    node_id: 'demo-node-002-rtx3080',
    gpu_name: 'NVIDIA GeForce RTX 3080',
    vram_total: 10240,
    current_load: 67.2,
    status: 'online',
    last_seen: new Date().toISOString(),
  },
  {
    node_id: 'demo-node-003-a100',
    gpu_name: 'NVIDIA A100',
    vram_total: 81920,
    current_load: 12.8,
    status: 'online',
    last_seen: new Date().toISOString(),
  },
  {
    node_id: 'demo-node-004-rtx3070',
    gpu_name: 'NVIDIA GeForce RTX 3070',
    vram_total: 8192,
    current_load: 0,
    status: 'offline',
    last_seen: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function Home() {
  const [nodes, setNodes] = useState<GpuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Fetch nodes from Supabase or use demo data
  const fetchNodes = useCallback(async () => {
    // If Supabase isn't configured, use demo data
    if (!isSupabaseConfigured || !supabase) {
      setNodes(DEMO_NODES);
      setLastRefresh(new Date());
      setLoading(false);
      setIsRefreshing(false);
      setIsDemoMode(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw error;

      setNodes(data || []);
      setLastRefresh(new Date());
      setIsDemoMode(false);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      // Fallback to demo data on error
      setNodes(DEMO_NODES);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNodes();
  };

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchNodes();

    // Only subscribe to realtime if Supabase is configured
    if (!isSupabaseConfigured || !supabase) return;

    // Subscribe to realtime changes on the nodes table
    const channel = supabase
      .channel('nodes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Refetch all nodes on any change
          fetchNodes();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNodes]);

  // Stats calculations
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalVRAM = nodes.reduce((sum, n) => sum + (n.status === 'online' ? n.vram_total : 0), 0);
  const avgLoad = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.current_load, 0) / nodes.length
    : 0;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>
                <strong>Demo Mode:</strong> Configure Supabase credentials in <code className="rounded bg-amber-500/20 px-1">.env.local</code> to connect to your database.
              </span>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <header className="border-b border-cyan-500/10 bg-gray-950/50 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div>
                {/* Logo */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                    <Cpu className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">
                    NUSA<span className="text-cyan-400">Compute</span>
                  </span>
                </div>

                {/* Tagline */}
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Decentralized Compute for{' '}
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Malaysia
                  </span>
                </h1>
                <p className="mt-3 max-w-xl text-lg text-gray-400">
                  Access high-performance GPU resources from our distributed network.
                  Rent computing power instantly, pay only for what you use.
                </p>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-6 py-3 font-medium text-cyan-400 ring-1 ring-cyan-500/30 transition-all hover:bg-cyan-500/20 hover:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Stats Bar */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-xl bg-gray-900/50 p-4 ring-1 ring-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Globe className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Online Nodes</p>
                  <p className="text-2xl font-bold text-white">{onlineNodes}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl bg-gray-900/50 p-4 ring-1 ring-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total VRAM</p>
                  <p className="text-2xl font-bold text-white">{(totalVRAM / 1024).toFixed(1)} <span className="text-sm text-gray-400">GB</span></p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl bg-gray-900/50 p-4 ring-1 ring-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Avg. Load</p>
                  <p className="text-2xl font-bold text-white">{avgLoad.toFixed(1)}<span className="text-sm text-gray-400">%</span></p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* GPU Node Grid */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Available GPUs</h2>
              {lastRefresh && (
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                  {isDemoMode && ' (Demo Data)'}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            /* Loading skeleton */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-900/50 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gray-800" />
                    <div className="h-6 w-32 rounded bg-gray-800" />
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="h-16 rounded-xl bg-gray-800" />
                    <div className="h-16 rounded-xl bg-gray-800" />
                  </div>
                  <div className="h-2 rounded-full bg-gray-800" />
                  <div className="mt-6 h-12 rounded-xl bg-gray-800" />
                </div>
              ))}
            </div>
          ) : nodes.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/30 py-16">
              <Cpu className="mb-4 h-16 w-16 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-400">No GPUs Available</h3>
              <p className="mt-2 text-gray-500">
                Start a provider client to add your GPU to the network.
              </p>
            </div>
          ) : (
            /* GPU Grid */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nodes.map((node) => (
                <GpuCard key={node.node_id} node={node} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 bg-gray-950/50 py-8">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500">
              © 2026 NUSA Compute. Decentralized GPU Sharing for Malaysia.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
