#!/usr/bin/env python3
"""
NUSA Compute - Provider Client
A GPU node heartbeat service for the NUSA Compute decentralized GPU sharing platform.

This script monitors local GPU resources and sends periodic heartbeats to a Supabase database.
"""

import os
import sys
import uuid
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

# Third-party imports
try:
    import GPUtil
    from dotenv import load_dotenv
    from supabase import create_client, Client
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("Please run: pip install -r requirements.txt")
    sys.exit(1)


# =============================================================================
# Configuration
# =============================================================================

HEARTBEAT_INTERVAL = 60  # seconds
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # Exponential backoff delays in seconds
NODE_ID_FILE = ".nusa_id"
TABLE_NAME = "nodes"


# =============================================================================
# Logging Setup
# =============================================================================

def setup_logging() -> logging.Logger:
    """Configure and return the application logger."""
    logger = logging.getLogger("NUSA")
    logger.setLevel(logging.INFO)
    
    # Console handler with custom format
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("[%(name)s] %(message)s")
    handler.setFormatter(formatter)
    
    # Avoid duplicate handlers on reload
    if not logger.handlers:
        logger.addHandler(handler)
    
    return logger


logger = setup_logging()


# =============================================================================
# Unique Machine Identification
# =============================================================================

def get_mac_address() -> str:
    """Get the MAC address of the machine as a hex string."""
    mac = uuid.getnode()
    return ':'.join(('%012x' % mac)[i:i+2] for i in range(0, 12, 2))


def get_or_create_node_id() -> str:
    """
    Get or create a unique node ID for this machine.
    
    The ID is persisted to .nusa_id file to remain consistent across restarts.
    It's generated using the MAC address combined with a random UUID for uniqueness.
    """
    script_dir = Path(__file__).parent
    id_file = script_dir / NODE_ID_FILE
    
    # Try to read existing ID
    if id_file.exists():
        try:
            node_id = id_file.read_text().strip()
            if node_id:
                logger.info(f"Loaded existing node ID: {node_id[:8]}...")
                return node_id
        except Exception as e:
            logger.warning(f"Could not read {NODE_ID_FILE}: {e}")
    
    # Generate new ID using MAC address as namespace
    mac = get_mac_address()
    namespace = uuid.UUID(int=uuid.getnode())
    node_id = str(uuid.uuid5(namespace, f"{mac}-{uuid.uuid4()}"))
    
    # Persist the ID
    try:
        id_file.write_text(node_id)
        logger.info(f"Generated new node ID: {node_id[:8]}...")
    except Exception as e:
        logger.warning(f"Could not persist node ID: {e}")
    
    return node_id


# =============================================================================
# GPU Detection
# =============================================================================

class GPUInfo:
    """Container for GPU metadata."""
    def __init__(self, name: str, vram_total: int, driver_version: str, load: float):
        self.name = name
        self.vram_total = vram_total  # in MB
        self.driver_version = driver_version
        self.load = load  # percentage (0-100)
    
    def __repr__(self) -> str:
        return f"GPU({self.name}, {self.vram_total}MB, Load: {self.load:.1f}%)"


def detect_gpu() -> GPUInfo | None:
    """
    Detect NVIDIA GPU and return its metadata.
    
    Returns:
        GPUInfo object if GPU found, None otherwise.
    """
    try:
        gpus = GPUtil.getGPUs()
        
        if not gpus:
            return None
        
        # Use the first GPU (primary)
        gpu = gpus[0]
        
        return GPUInfo(
            name=gpu.name,
            vram_total=int(gpu.memoryTotal),  # MB
            driver_version=gpu.driver,
            load=gpu.load * 100  # Convert to percentage
        )
    
    except Exception as e:
        logger.error(f"GPU detection failed: {e}")
        return None


def get_current_gpu_load() -> float:
    """
    Get the current GPU load percentage.
    
    Returns:
        GPU load as percentage (0-100), or 0.0 if detection fails.
    """
    try:
        gpus = GPUtil.getGPUs()
        if gpus:
            return gpus[0].load * 100
    except Exception:
        pass
    return 0.0


# =============================================================================
# Supabase Client
# =============================================================================

def init_supabase() -> Client | None:
    """
    Initialize the Supabase client using environment variables.
    
    Returns:
        Supabase client instance, or None if initialization fails.
    """
    # Load environment variables from .env file
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.")
        logger.error("Please create a .env file based on .env.template")
        return None
    
    if url == "your_supabase_url_here" or key == "your_supabase_anon_key_here":
        logger.error("Please update .env with your actual Supabase credentials.")
        return None
    
    try:
        client = create_client(url, key)
        logger.info("Supabase client initialized successfully.")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


# =============================================================================
# Heartbeat Logic
# =============================================================================

def send_heartbeat(
    client: Client,
    node_id: str,
    gpu_info: GPUInfo,
    status: str = "online"
) -> bool:
    """
    Send a heartbeat to the Supabase database with retry logic.
    
    Args:
        client: Supabase client instance
        node_id: Unique identifier for this node
        gpu_info: GPU metadata object
        status: Node status ('online' or 'offline')
    
    Returns:
        True if heartbeat was sent successfully, False otherwise.
    """
    # Get fresh GPU load for each heartbeat
    current_load = get_current_gpu_load()
    
    # Prepare the data payload
    data = {
        "node_id": node_id,
        "gpu_name": gpu_info.name,
        "vram_total": gpu_info.vram_total,
        "current_load": round(current_load, 2),
        "status": status,
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Retry logic with exponential backoff
    for attempt in range(MAX_RETRIES):
        try:
            # Upsert: Update if exists, insert if not
            response = client.table(TABLE_NAME).upsert(
                data,
                on_conflict="node_id"
            ).execute()
            
            return True
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt]
                logger.warning(f"Heartbeat failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                logger.warning(f"Retrying in {delay}s...")
                time.sleep(delay)
            else:
                logger.error(f"Heartbeat failed after {MAX_RETRIES} attempts: {e}")
                return False
    
    return False


def update_status_offline(client: Client, node_id: str) -> None:
    """
    Update the node status to 'offline' in the database.
    
    Called during graceful shutdown.
    """
    try:
        client.table(TABLE_NAME).update({
            "status": "offline",
            "last_seen": datetime.now(timezone.utc).isoformat()
        }).eq("node_id", node_id).execute()
        
        logger.info("Status updated to 'offline' in database.")
    except Exception as e:
        logger.error(f"Failed to update offline status: {e}")


def run_heartbeat_loop(client: Client, node_id: str, gpu_info: GPUInfo) -> None:
    """
    Run the infinite heartbeat loop.
    
    Sends a heartbeat every HEARTBEAT_INTERVAL seconds.
    Handles KeyboardInterrupt for graceful shutdown.
    """
    logger.info("=" * 50)
    logger.info("NUSA Compute Provider Client Started")
    logger.info("=" * 50)
    logger.info(f"Node ID: {node_id[:8]}...")
    logger.info(f"GPU: {gpu_info.name}")
    logger.info(f"VRAM: {gpu_info.vram_total} MB")
    logger.info(f"Driver: {gpu_info.driver_version}")
    logger.info(f"Heartbeat Interval: {HEARTBEAT_INTERVAL}s")
    logger.info("=" * 50)
    logger.info("Press Ctrl+C to stop the client.\n")
    
    try:
        while True:
            # Send heartbeat
            success = send_heartbeat(client, node_id, gpu_info, status="online")
            
            if success:
                current_time = datetime.now().strftime("%H:%M")
                logger.info(f"Heartbeat sent at {current_time} - Status: Online")
            else:
                logger.warning("Heartbeat failed - will retry next interval")
            
            # Wait for next heartbeat
            time.sleep(HEARTBEAT_INTERVAL)
            
    except KeyboardInterrupt:
        logger.info("\n")
        logger.info("Shutdown requested (Ctrl+C)...")
        update_status_offline(client, node_id)
        logger.info("NUSA Compute Provider Client stopped.")
        sys.exit(0)


# =============================================================================
# Main Entry Point
# =============================================================================

def main() -> None:
    """Main entry point for the NUSA Compute Provider Client."""
    
    logger.info("Initializing NUSA Compute Provider Client...")
    
    # Step 1: Detect GPU
    logger.info("Detecting GPU...")
    gpu_info = detect_gpu()
    
    if not gpu_info:
        logger.error("No NVIDIA GPU detected on this machine.")
        logger.error("NUSA Compute requires an NVIDIA GPU with proper drivers.")
        logger.error("Please ensure:")
        logger.error("  1. An NVIDIA GPU is installed")
        logger.error("  2. NVIDIA drivers are properly installed")
        logger.error("  3. nvidia-smi command works correctly")
        sys.exit(1)
    
    logger.info(f"GPU detected: {gpu_info}")
    
    # Step 2: Get or create node ID
    logger.info("Setting up node identity...")
    node_id = get_or_create_node_id()
    
    # Step 3: Initialize Supabase client
    logger.info("Connecting to Supabase...")
    client = init_supabase()
    
    if not client:
        logger.error("Failed to initialize Supabase client. Exiting.")
        sys.exit(1)
    
    # Step 4: Start heartbeat loop
    run_heartbeat_loop(client, node_id, gpu_info)


if __name__ == "__main__":
    main()
