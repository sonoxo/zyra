package com.sonoxo.zyra.compute;

import java.time.Instant;
import java.util.UUID;

public class ZyraTask {

    public enum Status {
        CREATED,
        RUNNING,
        COMPLETED,
        FAILED
    }

    private final String id;
    private final String instruction;
    private final Instant createdAt;
    private Status status;
    private String result;

    public ZyraTask(String instruction) {
        this.id = UUID.randomUUID().toString();
        this.instruction = instruction;
        this.createdAt = Instant.now();
        this.status = Status.CREATED;
    }

    public String getId() {
        return id;
    }

    public String getInstruction() {
        return instruction;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Status getStatus() {
        return status;
    }

    public String getResult() {
        return result;
    }

    public void start() {
        status = Status.RUNNING;
    }

    public void complete(String result) {
        this.result = result;
        status = Status.COMPLETED;
    }

    public void fail(String result) {
        this.result = result;
        status = Status.FAILED;
    }
}
