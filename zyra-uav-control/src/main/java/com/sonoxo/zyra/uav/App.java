package com.sonoxo.zyra.uav;

public class App {

    public static void main(
            String[] args
    ) {

        System.out.println(
                "======================================"
        );

        System.out.println(
                " ZYRA UAV CONTROL PLANE"
        );

        System.out.println(
                "======================================"
        );

        GeoPoint home =
                new GeoPoint(
                        37.5407,
                        -77.4360,
                        0
                );

        GeoFence fence =
                new GeoFence(
                        home,
                        1000,
                        120
                );

        SimulatedUav uav =
                new SimulatedUav(
                        home,
                        fence
                );

        UavFleetManager fleet =
                new UavFleetManager();

        fleet.register(
                "ZYRA-UAV-001",
                uav
        );

        uav.connect();

        uav.arm();

        uav.takeoff(
                30
        );

        uav.gotoPoint(
                new GeoPoint(
                        37.5410,
                        -77.4355,
                        30
                )
        );

        System.out.println(
                "TELEMETRY: "
                + uav.telemetry()
        );

        uav.returnHome();

        System.out.println(
                "FINAL: "
                + uav.telemetry()
        );

        System.out.println(
                "FLEET SIZE: "
                + fleet.size()
        );

        System.out.println(
                "======================================"
        );
    }
}
