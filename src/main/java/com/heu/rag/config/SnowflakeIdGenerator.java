package com.heu.rag.config;

import org.springframework.stereotype.Component;

/**
 * Snowflake ID Generator
 * Generates unique 64-bit IDs based on Twitter's Snowflake algorithm.
 */
@Component
public class SnowflakeIdGenerator {
    
    // Start timestamp: 2024-01-01 00:00:00
    private static final long EPOCH = 1704067200000L;
    
    // Machine ID bits (5 bits, max 31)
    private static final long MACHINE_ID_BITS = 5L;
    
    // Data center ID bits (5 bits, max 31)
    private static final long DATACENTER_ID_BITS = 5L;
    
    // Sequence bits (12 bits, max 4095)
    private static final long SEQUENCE_BITS = 12L;
    
    // Maximum values
    private static final long MAX_MACHINE_ID = ~(-1L << MACHINE_ID_BITS);
    private static final long MAX_DATACENTER_ID = ~(-1L << DATACENTER_ID_BITS);
    private static final long MAX_SEQUENCE = ~(-1L << SEQUENCE_BITS);
    
    // Bit shifts
    private static final long MACHINE_ID_SHIFT = SEQUENCE_BITS;
    private static final long DATACENTER_ID_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS;
    private static final long TIMESTAMP_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS + DATACENTER_ID_BITS;
    
    private final long machineId;
    private final long datacenterId;
    private long sequence = 0L;
    private long lastTimestamp = -1L;
    
    public SnowflakeIdGenerator() {
        // Default: use machine ID from system property or default to 1
        this.machineId = Long.parseLong(
            System.getProperty("snowflake.machine.id", "1")
        );
        this.datacenterId = Long.parseLong(
            System.getProperty("snowflake.datacenter.id", "1")
        );
        
        if (machineId > MAX_MACHINE_ID || machineId < 0) {
            throw new IllegalArgumentException("Machine ID must be between 0 and " + MAX_MACHINE_ID);
        }
        if (datacenterId > MAX_DATACENTER_ID || datacenterId < 0) {
            throw new IllegalArgumentException("Datacenter ID must be between 0 and " + MAX_DATACENTER_ID);
        }
    }
    
    public SnowflakeIdGenerator(long machineId, long datacenterId) {
        if (machineId > MAX_MACHINE_ID || machineId < 0) {
            throw new IllegalArgumentException("Machine ID must be between 0 and " + MAX_MACHINE_ID);
        }
        if (datacenterId > MAX_DATACENTER_ID || datacenterId < 0) {
            throw new IllegalArgumentException("Datacenter ID must be between 0 and " + MAX_DATACENTER_ID);
        }
        this.machineId = machineId;
        this.datacenterId = datacenterId;
    }
    
    /**
     * Generate next unique ID
     */
    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis();
        
        if (timestamp < lastTimestamp) {
            throw new RuntimeException("Clock moved backwards. Refusing to generate id");
        }
        
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }
        
        lastTimestamp = timestamp;
        
        return ((timestamp - EPOCH) << TIMESTAMP_SHIFT)
                | (datacenterId << DATACENTER_ID_SHIFT)
                | (machineId << MACHINE_ID_SHIFT)
                | sequence;
    }
    
    private long tilNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}

