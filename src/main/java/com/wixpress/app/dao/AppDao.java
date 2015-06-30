package com.wixpress.app.dao;

/**
 * Data store wrapper
 * It implements methods for getting and setting data in the data store
 */
public interface AppDao {


    /**
     * Get app settings from the data store
     * @param key  - The key used to lookup the app settings
     * @return the app settings of this user
     */
    public AppSettings getAppSettings(Key key);

    /**
     * Save app settings in the data store
     * @param key  - The key used to lookup the app settings
     * @param appSettings - The settings of the app that configure the widget
     * @return true if the settings were successfully saved to the DB
     */
    public Boolean saveAppSettings(Key key, AppSettings appSettings);
}
