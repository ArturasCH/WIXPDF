package com.wixpress.app.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.annotation.Nullable;

/**
 * General result object for Ajax operations
 */

public class AjaxResult
{
    private boolean isOk;
    private @Nullable String error;
    private @Nullable String stackTrace;
    private @Nullable String retData;

    /**
     * Constructs a Default AjaxResult
     * @param isOk true iff the HTTP response is 200 OK
     */
    public AjaxResult(boolean isOk) {
        this.isOk = isOk;
        this.error = getError();
        this.stackTrace = getStackTrace();
        this.retData = getRetData();
    }

    /**
     * Construct an AjaxResult with parameters
     * @param ok true iff the HTTP response is 200 OK
     * @param error a string representing the error that have occurred
     * @param stackTrace the stackTrace of the error
     */
    public AjaxResult(boolean ok, String error, String stackTrace) {
        this.isOk = ok;
        this.error = error;
        this.stackTrace = stackTrace;
        this.retData = getRetData();
    }
    /**
     * Construct an AjaxResult with a data payload (as a string)
     * @param ok true iff the HTTP response is 200 OK
     * @param data a string representing the data payload to deliver
     */
    public AjaxResult(boolean ok, String data) {
        this.isOk = ok;
        this.retData = data;
    }

    /**
     * Check whether the status of this AjaxRequest is 200 OK
     * @return true iff the HTTP response is 200 OK
     */
    public boolean isOk() {
        return isOk;
    }

    /**
     * Sets the status of this AjaxResult
     * @param ok true iff the HTTP response is 200 OK
     */
    public void setOk(boolean ok) {
        isOk = ok;
    }

    /**
     * Get the error message that have occurred
     * @return a string representing the error that has occurred
     */
    public @Nullable String getError() {
        return error;
    }

    /**
     * Sets the error message that have occurred
     * @param error a string representing the error that have occurred
     */
    public void setError(@Nullable String error) {
        this.error = error;
    }

    /**
     * Get the stack trace of this error
     * @return a string representing the stack trace of the error that have occurred
     */
    public @Nullable String getStackTrace() {
        return stackTrace;
    }

    /**
     * Sets the stack trace of this AjaxRequest
     * @param stackTrace the stackTrace of the error
     */
    public void setStackTrace(@Nullable String stackTrace) {
        this.stackTrace = stackTrace;
    }

    /**
     * Returns a string representation of this AjaxResult
     * @return a string representation of this AjaxResult
     */
    @Override
    public String toString() {
        final StringBuilder sb = new StringBuilder();
        sb.append("AjaxResult");
        sb.append("{isOk=").append(isOk);
        sb.append('}');
        return sb.toString();
    }

    /**
     * A static constructor for a default AjaxResult with 200 OK status code
     * @return an instance of an AjaxResult Response entity representing a 200 OK status code
     */
    public static ResponseEntity<AjaxResult> ok() {
        return new ResponseEntity<AjaxResult>(new AjaxResult(true), HttpStatus.OK);
    }

    /**
     * A static constructor for an AjaxResult with a data payload and a 200 OK status code
     * @return an instance of an AjaxResult Response entity with data payload and a 200 OK status code
     */
    public static ResponseEntity<AjaxResult> res(String data) {
        return new ResponseEntity<AjaxResult>(new AjaxResult(true,data),HttpStatus.OK);
    }

    /**
     * A static constructor for an AjaxResult representing an internal server error
     * @param e the exception that has occurred on the server
     * @return an instance of an AjaxResult Response entity representing an internal server error
     */
    public static ResponseEntity<AjaxResult> internalServerError(Exception e) {
        StringBuilder stackTrace = new StringBuilder();
        renderStackTrace(e, stackTrace);
        return new ResponseEntity<AjaxResult>(new AjaxResult(false, e.getMessage(), stackTrace.toString()), HttpStatus.INTERNAL_SERVER_ERROR); //TODO check HTTP status on client to retry
    }

    /**
     * A static constructor for an AjaxResult representing an entity lookup error (DB server error)
     * @param e the exception that has occurred on the DB server
     * @return an instance of an AjaxResult Response entity representing an entity lookup error
     */
    public static ResponseEntity<AjaxResult> entityLookupError(Exception e) {
        StringBuilder stackTrace = new StringBuilder();
        renderStackTrace(e, stackTrace);
        return new ResponseEntity<AjaxResult>(new AjaxResult(false, e.getMessage(), stackTrace.toString()), HttpStatus.NOT_FOUND); //TODO check HTTP status on client to retry
    }

    /**
     * A static stack trace renderer for an AjaxResult
     * @param e the exception that has occurred on the server
     * @param stackTrace the stackTrace of the error
     */
    public static void renderStackTrace(Throwable e, StringBuilder stackTrace) {
        for (StackTraceElement stackTraceElement: e.getStackTrace()) {
            stackTrace.append(stackTraceElement.toString()).append("\n");
        }
        if (e.getCause() != null && e.getCause() != e) {
            stackTrace.append("caused by ").append(e.getCause().getClass()).append(" - ").append(e.getCause().getMessage()).append("\n");
            renderStackTrace(e.getCause(), stackTrace);
        }
    }

    /**
     * Get the string representing that data payload
     * @return a string representing that data payload
     */
    @Nullable
    public String getRetData() {
        return retData;
    }

    /**
     * A static constructor for a 'notOK' AjaxResult with 200 OK status code
     * It's representing a good connection, but a bad response
     * It will become deprecated in future versions
     * @return an instance of an AjaxResult Response entity representing a 200 OK status code
     */
    public static ResponseEntity<AjaxResult> notOk() {
//        StringBuilder stackTrace = new StringBuilder();
//        renderStackTrace(e, stackTrace);
        return new ResponseEntity<AjaxResult>(new AjaxResult(false), HttpStatus.OK);
    }
}