package com.sonoxo.zyra.uav.sitl;

public record SitlConfig(
        String host,
        int mavsdkPort,
        double takeoffAltitudeMeters
) {

    public static SitlConfig load() {

        return new SitlConfig(
                System.getenv()
                        .getOrDefault(
                                "ZYRA_MAVSDK_HOST",
                                "127.0.0.1"
                        ),

                Integer.parseInt(
                        System.getenv()
                                .getOrDefault(
                                        "ZYRA_MAVSDK_PORT",
                                        "50051"
                                )
                ),

                Double.parseDouble(
                        System.getenv()
                                .getOrDefault(
                                        "ZYRA_TAKEOFF_ALT",
                                        "10"
                                )
                )
        );
    }
}
