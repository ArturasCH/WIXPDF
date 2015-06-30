package com.wixpress.app.controller;

/**
 * An exception representing a runtime error at a Controller
 */
public class ControllerInputException extends RuntimeException {
    public ControllerInputException(String message, Exception cause, Object... args) {
        super(String.format(message, args), cause);
    }
}
