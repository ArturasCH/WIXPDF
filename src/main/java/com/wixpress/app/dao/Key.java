package com.wixpress.app.dao;

/**
 * Created by Elia on 17/02/2015.
 */
public class Key {
    private String key;
    private KeyType type;
    public static enum KeyType {
        USER_BASED,
        INSTANCE_BASED
    }

    public Key(String userId) {
        key = key(userId);
        type = KeyType.USER_BASED;
    }
    public Key(String instanceId, String compId) {
        key = key(instanceId, compId);
        type = KeyType.INSTANCE_BASED;
    }
    public String getKey() {
        return key;
    }
    public KeyType getKeyType() {
        return type;
    }

    /**
     * Create a unique key to each entry in the DB that is composed from the instanceId and compID
     * @param userId - the Wix userId (UUID)
     * @return a key for saving and loading from GAE datastore
     */
    private String key(String userId) {
        return userId;
        //return String.format("%s.%s", instanceId, compId);
    }

    /**
     * Create a unique key to each entry in the DB that is composed from the instanceId and compID
     * @param instanceId - Instance id of the app, It is shared by multiple Widgets of the same app within the same site
     * @param compId - The ID of the Wix component which is the host of the iFrame, it is used to distinguish between multiple instances of the same Widget in a site
     * @return
     */
    private String key(String instanceId, String compId) {
        return String.format("%s.%s", instanceId, compId);
    }

}
