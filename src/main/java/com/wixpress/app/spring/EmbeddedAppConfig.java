package com.wixpress.app.spring;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.joda.JodaModule;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.wixpress.app.controller.AppController;
import com.wixpress.app.controller.HelpController;
import com.wixpress.app.dao.AppDao;
import com.wixpress.app.dao.AppGaeDao;
import com.wixpress.app.domain.AuthenticationResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * Created by : doron
 * Since: 7/1/12
 */

@Configuration
@Import({EmbeddedAppVelocityBeansConfig.class})
public class EmbeddedAppConfig {
    //ObjectMapper objectMapper;
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        // FAIL_ON_UNKNOWN_PROPERTIES feature disabled by default!
        //configure(DeserializationConfig.Feature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);
        objectMapper.registerModule(new JodaModule());
        //return new ObjectMapper();
        return objectMapper;
    }

    @Bean
    public AppController appController() {
        return new AppController();
    }

    @Bean
    public HelpController helloWorldController() {
        return new HelpController();
    }

    @Bean
    public AppDao sampleAppDap() {
        return new AppGaeDao();
    }

    @Bean
    public DatastoreService dataStore() {
        return DatastoreServiceFactory.getDatastoreService();
    }

    @Bean
    public AuthenticationResolver authenticationResolver() {
        return new AuthenticationResolver(objectMapper());
    }

    //Can add path resolver controller helper here, as a bean
}
