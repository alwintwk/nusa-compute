# NUSA Compute - Provider Client

A Python-based GPU node heartbeat service for the NUSA Compute decentralized GPU sharing platform.

## Features

- 🔑 **Unique Machine Identification** - Persistent node ID across restarts
- 🎮 **GPU Monitoring** - Real-time NVIDIA GPU metadata detection
- 🔄 **Heartbeat Service** - Periodic status updates to Supabase
- 🛡️ **Retry Logic** - Exponential backoff for network failures
- ✨ **Graceful Shutdown** - Updates status to 'offline' on exit

## Prerequisites

- Python 3.10 or higher
- NVIDIA GPU with drivers installed
- Supabase account and project

## Supabase Setup

Create the `nodes` table in your Supabase project using the SQL Editor:

```sql
CREATE TABLE nodes (
    node_id TEXT PRIMARY KEY,
    gpu_name TEXT NOT NULL,
    vram_total INTEGER NOT NULL,
    current_load FLOAT DEFAULT 0,
    status TEXT DEFAULT 'online',
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts and updates (adjust as needed)
CREATE POLICY "Allow all operations on nodes" ON nodes
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

## Installation

1. **Clone or download** this project to your machine.

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:

   ```bash
   # Copy the template
   cp .env.template .env
   
   # Edit .env with your Supabase credentials
   # SUPABASE_URL=https://your-project.supabase.co
   # SUPABASE_KEY=your-anon-key
   ```

## Usage

Run the provider client:

```bash
python provider_client.py
```

Expected output:

```
[NUSA] Initializing NUSA Compute Provider Client...
[NUSA] Detecting GPU...
[NUSA] GPU detected: GPU(NVIDIA GeForce RTX 3080, 10240MB, Load: 5.0%)
[NUSA] Setting up node identity...
[NUSA] Generated new node ID: a1b2c3d4...
[NUSA] Connecting to Supabase...
[NUSA] Supabase client initialized successfully.
[NUSA] ==================================================
[NUSA] NUSA Compute Provider Client Started
[NUSA] ==================================================
[NUSA] Node ID: a1b2c3d4...
[NUSA] GPU: NVIDIA GeForce RTX 3080
[NUSA] VRAM: 10240 MB
[NUSA] Driver: 535.154.05
[NUSA] Heartbeat Interval: 60s
[NUSA] ==================================================
[NUSA] Press Ctrl+C to stop the client.

[NUSA] Heartbeat sent at 20:45 - Status: Online
```

### Stopping the Client

Press `Ctrl+C` to gracefully stop the client. The script will:

1. Update the node status to 'offline' in the database
2. Log the shutdown message
3. Exit cleanly

## Troubleshooting

### "No NVIDIA GPU detected"

- Ensure you have an NVIDIA GPU installed
- Verify drivers are installed: run `nvidia-smi` in terminal
- Check that CUDA is properly configured

### "Missing SUPABASE_URL or SUPABASE_KEY"

- Create a `.env` file based on `.env.template`
- Get your credentials from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API

### "Heartbeat failed"

- Check your internet connection
- Verify Supabase credentials are correct
- Ensure the `nodes` table exists in your Supabase database

## Project Structure

```
NUSACompute/
├── provider_client.py   # Main provider client script
├── requirements.txt     # Python dependencies
├── .env.template        # Environment variables template
├── .env                 # Your local config (create from template)
├── .nusa_id             # Auto-generated node ID (created on first run)
└── README.md            # This file
```

## License

MIT License - NUSA Compute 2026
