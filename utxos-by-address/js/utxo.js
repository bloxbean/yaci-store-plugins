/**
 * Yaci Store UTXO Plugin Script (JavaScript)
 * This script provides functionality for filtering UTXOs by address before storing in address_utxo table.
 * It also removes extra tx_inputs records through handling commit events
 */

/**
 * Filters a list of UTXO items by a specific address
 * @param {Array} items - List of UTXO items to filter
 * @return {Array} List of filtered UTXOs that match the address filter
 */
function filterByAddress(items) {
    // Get the address filter from environment configuration
    const address = env.getProperty("address.filter");
    
    // Filter UTXOs by owner address using functional approach
    const filteredUtxos = items.filter(item => item.getOwnerAddr() === address);
    
    // If any UTXOs were found, update global state and log the count
    if (filteredUtxos.length > 0) {
        global_state.put("utxo.found", true);
        //console.log("Utxo found : " + filteredUtxos.length);
    }
    
    return filteredUtxos;
}

/**
 * Handles commit events by cleaning up additional transaction inputs
 * 
 * APPROACH: Since tx_input records don't have address filtering and Yaci Store processes 
 * blocks in parallel batches (100 blocks during initial sync, 1 block at tip), tx_input 
 * records may be inserted before their corresponding UTXO entries in address_utxo table. 
 * The CommitEvent is published at the end of each batch and handlers are processed 
 * sequentially, making it the perfect place to delete orphaned tx_input records.
 * 
 * @param {Object} event - The commit event containing metadata like slot number
 */
function handleCommitEvent(event) {
    // Get the last processed slot from state, default to 0 if not set
    let last_tx_inputs_slot = state.get("last_tx_inputs_slot");
    if (last_tx_inputs_slot === null || last_tx_inputs_slot === undefined) {
        last_tx_inputs_slot = 0;
    }

    console.log("Deleting additional tx inputs after slot: " + last_tx_inputs_slot);

    // SQL query to delete orphaned tx_input records
    // Only deletes records that are not referenced by address_utxo table
    const sql = "DELETE FROM tx_input ti " +
            "WHERE ti.spent_at_slot > :given_slot " +
            "AND NOT EXISTS ( " +
            "  SELECT 1 FROM address_utxo au " +
            "  WHERE au.tx_hash = ti.tx_hash " +
            "    AND au.output_index = ti.output_index " +
            ")";

    // Set parameters for the SQL query
    const params = { "given_slot": last_tx_inputs_slot };
    
    // Execute the delete operation and get count of deleted records
    const count = named_jdbc.update(sql, params);

    // Log the number of deleted records if any were found
    if (count > 0) {
        console.log("Deleted " + count + " additional tx inputs.");
    }

    // Update the last processed slot to current event slot
    state.put("last_tx_inputs_slot", event.getMetadata().getSlot());
}

/**
 * Sends Discord notification when balance changes for the monitored address
 * @param {Object} event - The commit event containing metadata like block number
 */
function sendDiscordNotificationOnBalanceChange(event) {
    const utxoFound = global_state.get("utxo.found");
    
    if (utxoFound !== null && utxoFound) {
        global_state.remove("utxo.found");

        // Skip sending notification if not at tip yet
        if (!event.getMetadata().isSyncMode()) {
            return;
        }

        const address = env.getProperty("address.filter");    

        const sql = "SELECT SUM(au.lovelace_amount) AS balance " +
            "FROM address_utxo au " +
            "WHERE au.owner_addr = :address " +
            "AND NOT EXISTS (SELECT 1 FROM tx_input ti WHERE ti.tx_hash = au.tx_hash AND ti.output_index = au.output_index)";

        const params = { "address": address };
        
        const result = named_jdbc.queryForMap(sql, params);
        const balance = result["balance"];

        const discordUrl = env.getProperty("discord.webhook.url");

        const jsonData = {
            "content": `💰 Unspent UTXO Balance: ${balance} Lovelace at Block: ${event.getMetadata().getBlock()}\n Address: ${address}`
        };
        
        const response = http.postJson(discordUrl, jsonData, { "Content-Type": "application/json" });
        console.log("Discord response: " + response);
    }
}
