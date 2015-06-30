package com.wixpress.app.dao;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.annotation.Nullable;

/**
 * Created by : doron
 * Since: 7/1/12
 * Edited by: Elia
 * Since: 20/3/14
 */

@JsonTypeName("appSettings")
public class AppSettings {
    private @Nullable
    JsonNode appSettings;

    public AppSettings() {}

    public AppSettings(ObjectMapper objectMapper) {
        appSettings = objectMapper.createObjectNode();
    }

    public <T> T nvl(T value, T fallback) {
        return (value != null)?value:fallback;
    }

    @Nullable
    public JsonNode getAppSettings() {
        return appSettings;
    }

    public void setAppSettings(@Nullable JsonNode appSettings) {
        this.appSettings = appSettings;
    }
}
