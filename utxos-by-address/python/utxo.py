"""
Yaci Store UTXO Plugin Script (Python)
This script provides functionality for filtering UTXOs by address before storing in address_utxo table.
It also removes extra tx_inputs records through handling commit events
"""

def filterByAddress(items):
    """
    Filters a list of UTXO items by a specific address
    
    Args:
        items: List of UTXO items to filter
        
    Returns:
        List of filtered UTXOs that match the address filter
    """
    # Get the address filter from environment configuration
    address = env.getProperty("address.filter")
    
    # Filter UTXOs by owner address using list comprehension
    filtered_utxos = [item for item in items if item.getOwnerAddr() == address]
    
    # If any UTXOs were found, update global state and log the count
    if len(filtered_utxos) > 0:
        global_state.put("utxo.found", True)
    
    return filtered_utxos


def handleCommitEvent(event):
    """
    Handles commit events by cleaning up additional transaction inputs
    
    Since tx_input records don't have address filtering and Yaci Store processes 
    blocks in parallel batches (100 blocks during initial sync, 1 block at tip), tx_input 
    records may be inserted before their corresponding UTXO entries in address_utxo table. 
    The CommitEvent is published at the end of each batch and handlers are processed 
    sequentially, making it the perfect place to delete orphaned tx_input records.
    
    Args:
        event: The commit event containing metadata like slot number
    """
    # Get the last processed slot from global_state, default to 0 if not set
    last_tx_inputs_slot = global_state.get("last_tx_inputs_slot")
    if last_tx_inputs_slot is None:
        last_tx_inputs_slot = 0

    print(f"Deleting additional tx inputs after slot: {last_tx_inputs_slot}")

    # SQL query to delete orphaned tx_input records
    # Only deletes records that are not referenced by address_utxo table
    sql = """DELETE FROM tx_input ti 
             WHERE ti.spent_at_slot > :given_slot 
             AND NOT EXISTS ( 
               SELECT 1 FROM address_utxo au 
               WHERE au.tx_hash = ti.tx_hash 
                 AND au.output_index = ti.output_index 
             )"""

    # Set parameters for the SQL query
    params = {"given_slot": last_tx_inputs_slot}
    
    # Execute the delete operation and get count of deleted records
    count = named_jdbc.update(sql, params)

    # Log the number of deleted records if any were found
    if count > 0:
        print(f"Deleted {count} additional tx inputs.")

    # Update the last processed slot to current event slot
    global_state.put("last_tx_inputs_slot", event.getMetadata().getSlot())

def handleRollbackEvent(event):
    # Reset last_tx_input_slot used in CommitEvent to delete additional tx inputs
    global_state.put("last_tx_inputs_slot", event.getRollbackTo().getSlot())


def sendDiscordNotificationOnBalanceChange(event):
    """
    Sends Discord notification when balance changes for the monitored address
    
    Args:
        event: The commit event containing metadata like block number
    """
    utxo_found = global_state.get("utxo.found")
    
    if utxo_found is not None and utxo_found:
        global_state.remove("utxo.found")

        # Skip sending notification if not at tip yet
        if not event.getMetadata().isSyncMode():
            return

        address = env.getProperty("address.filter")    

        sql = """SELECT SUM(au.lovelace_amount) AS balance 
                 FROM address_utxo au 
                 WHERE au.owner_addr = :address 
                 AND NOT EXISTS (SELECT 1 FROM tx_input ti WHERE ti.tx_hash = au.tx_hash AND ti.output_index = au.output_index)"""

        params = {"address": address}
        
        result = named_jdbc.queryForMap(sql, params)
        balance = result["balance"]

        discord_url = env.getProperty("discord.webhook.url")

        json_data = {
            "content": f"💰 Unspent UTXO Balance: {balance} Lovelace at Block: {event.getMetadata().getBlock()}\n Address: {address}"
        }
        
        response = http.postJson(discord_url, json_data, {"Content-Type": "application/json"})
        print(f"Discord response: {response}")
