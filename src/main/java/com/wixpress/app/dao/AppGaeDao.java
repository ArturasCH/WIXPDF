package com.wixpress.app.dao;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.appengine.api.datastore.*;

import javax.annotation.Nullable;
import javax.annotation.Resource;
import java.io.IOException;

/**
 * The DB wrapper of the app, for Google App Engine Datastore - noSQL schema
 * It implements methods for getting and setting appProject in the DB as specified in the AppDao interface
 */

//TODO Add support for fetching from cache, utilizing the GAE memcache option: https://developers.google.com/appengine/docs/java/memcache/

public class AppGaeDao implements AppDao {

    protected final static String APP_INSTANCE = "WixPdfAppInstance";
    protected final static String SETTINGS = "settings";
    protected final static String COMPID = "compId";
    protected static final String USER = "key";

    @Resource
    private ObjectMapper objectMapper;
    @Resource
    private DatastoreService dataStore;

    //Javascript
    //@Resource
    //private static ScriptEngine scriptEngine = (new ScriptEngineManager()).getEngineByName("JavaScript");

    /**
     * Save app settings in the DB
     * @param userId - the Wix key (UUID)
     * @param appSettings - The settings of the app that configure the widget
     */
    public Boolean saveAppSettings(Key key, AppSettings appSettings) {
        return saveAppSettingsToDataStore(key.getKey(), SETTINGS, appSettings);
    }

    /**
     * Get app settings from the DB
     * @param userId - the Wix key (UUID)
     * @return
     */
    public
    @Nullable
    AppSettings getAppSettings(Key key) {
        if (key == null)
            return null;
        else {
            final com.google.appengine.api.datastore.Key gaeKey = KeyFactory.createKey(APP_INSTANCE, key.getKey());
            try {
//                final String prop = dataStore.get(key).getProperty(SETTINGS).toString();
//                return objectMapper.readValue(prop, AppSettings.class);
                final Text object = (Text) dataStore.get(gaeKey).getProperty(SETTINGS);
                final String asText = object.getValue();
                //final AppSettings appSettings = objectMapper.readValue(asText, AppSettings.class);
                //final AppSettings appSettingsTree = objectMapper.reader(AppSettings.class).readValue(asText);
                //final String prop = dataStore.get(key).getProperty(SETTINGS).toString();
                return objectMapper.readValue(asText, AppSettings.class);

            } catch (EntityNotFoundException e) {
                return null; //Settings not found
            } catch (IOException e) {
                return null;
            }
        }
    }



    /**
     * Save appProject to the datastore
     * @param key - the Wix key (UUID)
     * @param propertyName - property name of the appProject ('column' in SQL)
     * @param data - the appProject to save, saved as as string.
     * @return true if the save action has been successfully performed
     */
    private Boolean saveAppSettingsToDataStore(String key, String propertyName, AppSettings data) {
        Boolean isSuccessful = false;
        Entity entity;
        try {
            entity = dataStore.get(KeyFactory.createKey(APP_INSTANCE, key));
        }
        catch (EntityNotFoundException e){
            entity = new Entity(APP_INSTANCE, key);
        }
        try {
            Text textObj = new Text(objectMapper.writeValueAsString(data));
            //Should fix 500 char limit on properties
            entity.setProperty(propertyName,textObj);
        } catch (IOException e) {
            throw new AppDaoException("failed to serialize settings", e);
        }

        Transaction transaction = dataStore.beginTransaction();
        try {
            dataStore.put(entity);
            transaction.commit();
            isSuccessful = true;
        } finally {
            if (transaction.isActive()) {
                transaction.rollback();
            }
        }
        return isSuccessful;
    }
}

