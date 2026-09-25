package com.sonoxo.zyra.uav;

public record Telemetry(
        UavState state,
        GeoPoint position,
        double batteryPercent,
        double headingDegrees,
        double groundSpeedMps
) {}
