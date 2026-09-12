package com.sonoxo.zyra.uav;

public class GeoFence {

    private final GeoPoint center;
    private final double radiusMeters;
    private final double maxAltitudeMeters;

    public GeoFence(
            GeoPoint center,
            double radiusMeters,
            double maxAltitudeMeters
    ) {
        this.center = center;
        this.radiusMeters = radiusMeters;
        this.maxAltitudeMeters = maxAltitudeMeters;
    }

    public boolean allows(GeoPoint point) {

        if (point.altitudeMeters() < 0 ||
            point.altitudeMeters() > maxAltitudeMeters) {
            return false;
        }

        double earthRadius = 6371000.0;

        double lat1 = Math.toRadians(center.latitude());
        double lat2 = Math.toRadians(point.latitude());

        double dLat =
                Math.toRadians(
                        point.latitude() - center.latitude()
                );

        double dLon =
                Math.toRadians(
                        point.longitude() - center.longitude()
                );

        double a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                +
                Math.cos(lat1)
                * Math.cos(lat2)
                * Math.sin(dLon / 2)
                * Math.sin(dLon / 2);

        double distance =
                earthRadius
                * 2
                * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return distance <= radiusMeters;
    }
}
