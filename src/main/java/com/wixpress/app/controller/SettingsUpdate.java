package com.wixpress.app.controller;

import com.wixpress.app.dao.AppSettings;

/**
 * A container class for the request body of a settings request
 */
public class SettingsUpdate {
    private String userId;
    private String instanceId;
    private String compId;
    private AppSettings settings;
    private String mode;

    public String getInstanceId() { return instanceId; }

    public void setInstanceId(String instanceId) {  this.instanceId = instanceId;   }

    public String getUserId() { return this.userId; }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCompId() { return compId; }

    public void setCompId(String compId) { this.compId = compId; }

    public AppSettings getSettings() {
        return this.settings;
    }

    public void setSettings(AppSettings settings) {
        this.settings = settings;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

}
