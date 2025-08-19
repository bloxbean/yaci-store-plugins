# UTXO By Address Plugin for Yaci Store

This plugin indexes UTXOs for a specific Cardano address, filtering out all other blockchain data. It's useful for applications that only need to track activity for particular addresses.

## What This Plugin Does

- Filters and stores UTXOs only for the configured address
- Tracks spent outputs (tx_inputs) related to the address
- Optionally sends Discord notifications on balance changes
- Significantly reduces storage requirements by ignoring irrelevant data

## Plugin Files Available

This repository provides the plugin in three languages:
- **MVEL** (`mvel/` folder) - Recommended for production
- **JavaScript** (`js/` folder) - Preview support
- **Python** (`python/` folder) - Preview support

Each folder contains:
- `application-plugins.yml` - Plugin configuration
- `utxo.{mvel|js|py}` - Plugin implementation with three functions:
  - `filterByAddress` - Filters UTXOs by the configured address
  - `handleCommitEvent` - Cleans up orphaned tx_input records
  - `sendDiscordNotificationOnBalanceChange` - Sends balance update notifications

## Installation Steps

### 1. Enable Plugin Support

Edit `config/application-plugins.yml` and ensure plugins are enabled:
```yaml
store:
  plugins:
    enabled: true
```

### 2. Copy Plugin Files

Copy the plugin files to your Yaci Store Docker distribution:

```bash
# Copy the plugin configuration (choose your language: mvel, js, or python)
cp {mvel|js|python}/application-plugins.yml yaci-store-docker/config/

# Create scripts directory and copy the plugin script
mkdir -p yaci-store-docker/plugins/scripts
cp {mvel|js|python}/utxo.{mvel|js|py} yaci-store-docker/plugins/scripts/
```

### 3. Update application.properties

Add the following configuration to `config/application.properties`:

```properties
# Disable all stores except UTXO
store.assets.enabled=false
store.blocks.enabled=false
store.epoch.enabled=false
store.metadata.enabled=false
store.mir.enabled=false
store.script.enabled=false
store.staking.enabled=false
store.transaction.enabled=false
store.utxo.enabled=true
store.governance.enabled=false

# Configure the address to filter
address.filter=addr_test1wzc86g4ym366hkaphryqqvaptwznqkmk2gdqz9930u534pcx58ahw

# Set sync start point (optional - for faster testing)
store.cardano.sync-start-slot=66258805
store.cardano.sync-start-blockhash=2fd08baed1b092e4dda22306082f317e692d280f1e30d23bf8c88b566cd72cfe

# Discord webhook (optional - for balance notifications)
discord.webhook.url=https://discord.com/api/webhooks/your-webhook-url
```

### 4. Enable JS/Python Support (if using JS or Python plugins)

Edit `config/env` and uncomment:
```bash
JDK_JAVA_OPTIONS=${JDK_JAVA_OPTIONS} -Dloader.path=plugins,plugins/lib,plugins/ext-jars
```

### 5. Start Yaci Store

```bash
./yaci-store.sh start
```

## Verification

Check that the plugin is working:

```bash
# View logs
tail -f logs/yaci-store.log

# Query the database
./psql.sh
psql> SET search_path TO yaci_store;
psql> SELECT owner_addr FROM address_utxo;
```

## Customization

- Change the `address.filter` value to track a different address
- Modify the sync start point to begin from a different slot
- Update the Discord webhook URL for notifications
- Adjust the plugin functions for custom behavior

## Notes

- MVEL plugins are recommended for production use
- JS and Python plugins are in preview and may have performance implications
- The plugin significantly reduces storage by only indexing data for the specified address
- Discord notifications are sent only when synced to the blockchain tip (can be modified for testing)