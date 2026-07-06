#!/bin/bash

# ==============================================================================
# Torrenta GitHub Auto-Updater Script (for Alternative WebUI Mode)
# ==============================================================================
# This script monitors the Torrenta GitHub repository. If a new release is 
# published, it automatically downloads, extracts, and installs the update 
# to your qBittorrent alternative WebUI directory.
#
# Usage:
# 1. Edit the configurations below.
# 2. Make the script executable: chmod +x update-torrenta.sh
# 3. Schedule it using Cron (e.g. crontab -e) to run periodically.
# ==============================================================================

# --- CONFIGURATION ---
REPO="fulcoo/Torrenta"
# The path to your qBittorrent Alternative WebUI folder (MUST contain/be the parent of the 'public' directory)
WEBUI_DIR="/path/to/your/qbittorrent/alternative_webui/torrenta"
# ---------------------

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[Torrenta Updater] Checking for updates...${NC}"

# Ensure curl and unzip are installed
if ! command -v curl &> /dev/null || ! command -v unzip &> /dev/null; then
    echo -e "${RED}Error: curl and unzip are required. Please install them first.${NC}"
    exit 1
fi

# Ensure WEBUI_DIR is specified and exists
if [ -z "$WEBUI_DIR" ] || [ "$WEBUI_DIR" = "/path/to/your/qbittorrent/alternative_webui/torrenta" ]; then
    echo -e "${RED}Error: Please configure the WEBUI_DIR path in this script before running.${NC}"
    exit 1
fi

mkdir -p "$WEBUI_DIR"

# 1. Fetch latest release version from GitHub API
LATEST_RELEASE_JSON=$(curl -s "https://api.github.com/repos/$REPO/releases/latest")
LATEST_TAG=$(echo "$LATEST_RELEASE_JSON" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    echo -e "${RED}Error: Failed to fetch the latest release tag from GitHub.${NC}"
    exit 1
fi

# 2. Get local current version
LOCAL_VERSION_FILE="$WEBUI_DIR/version.txt"
if [ -f "$LOCAL_VERSION_FILE" ]; then
    LOCAL_TAG=$(cat "$LOCAL_VERSION_FILE")
else
    LOCAL_TAG=""
fi

# 3. Compare versions
if [ "$LATEST_TAG" = "$LOCAL_TAG" ]; then
    echo -e "${GREEN}Torrenta is up-to-date! Current version: $LOCAL_TAG${NC}"
    exit 0
fi

echo -e "${YELLOW}New version found: $LATEST_TAG (Local version: ${LOCAL_TAG:-none})${NC}"
echo -e "${YELLOW}Starting update...${NC}"

# 4. Fetch the download URL for the pre-built zip asset (looks for 'torrenta.zip' or similar)
DOWNLOAD_URL=$(echo "$LATEST_RELEASE_JSON" | grep '"browser_download_url":' | grep '\.zip' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')

# Fallback to source code zipball if no compiled asset was uploaded
if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "${YELLOW}No pre-compiled zip asset found. Falling back to downloading source zipball...${NC}"
    DOWNLOAD_URL="https://github.com/$REPO/archive/refs/tags/$LATEST_TAG.zip"
    IS_SOURCE_ZIP=true
else
    IS_SOURCE_ZIP=false
fi

# Create a temporary directory for extraction
TEMP_DIR=$(mktemp -d)
TEMP_ZIP="$TEMP_DIR/torrenta.zip"

# Download the file
echo -e "Downloading $DOWNLOAD_URL..."
curl -L -o "$TEMP_ZIP" "$DOWNLOAD_URL"
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to download update file.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Extract the package
echo -e "Extracting update..."
unzip -o "$TEMP_ZIP" -d "$TEMP_DIR/extracted" > /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to extract update zip.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Install the update
# If it's a source zip, we need to locate the compiled public directory (requires npm run build on host).
# Typically, if the user downloads precompiled 'torrenta.zip', it contains 'public/' directly.
if [ "$IS_SOURCE_ZIP" = true ]; then
    echo -e "${YELLOW}Source zip detected. Node.js is required to build the frontend...${NC}"
    SRC_FOLDER=$(find "$TEMP_DIR/extracted" -maxdepth 1 -mindepth 1 -type d | head -n 1)
    if [ -d "$SRC_FOLDER" ]; then
        cd "$SRC_FOLDER" || exit
        if command -v npm &> /dev/null; then
            echo -e "Running npm install & build..."
            npm install && npm run build
            if [ -d "dist/public" ]; then
                cp -r dist/* "$WEBUI_DIR/"
            else
                echo -e "${RED}Error: Build failed or dist/public not found.${NC}"
                rm -rf "$TEMP_DIR"
                exit 1
            fi
        else
            echo -e "${RED}Error: npm is not installed on this host. Cannot build source files. Please compile locally and copy manually.${NC}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    fi
else
    # Pre-compiled zip: copy files directly to target directory
    echo -e "Copying pre-compiled files..."
    # Copy all files from the zip root to the target webui directory
    cp -r "$TEMP_DIR/extracted"/* "$WEBUI_DIR/"
fi

# Cleanup
rm -rf "$TEMP_DIR"

# 5. Save the updated version tag
echo "$LATEST_TAG" > "$LOCAL_VERSION_FILE"

echo -e "${GREEN}Successfully updated Torrenta to $LATEST_TAG!${NC}"
echo -e "${GREEN}Please refresh your qBittorrent WebUI browser window.${NC}"
