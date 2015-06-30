package com.wixpress.app.dao;

/**
 * @author Yoav
 * @since 2/16/13
 */
public class AppDaoException extends RuntimeException {
    public AppDaoException(String message, Exception cause, Object... args) {
        super(String.format(message, args), cause);
    }
}
