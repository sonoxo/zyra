package com.sonoxo.zyra.uav;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class UavFleetManager {

    private final Map<String, UavController> fleet =
            new ConcurrentHashMap<>();

    public void register(
            String id,
            UavController controller
    ) {

        fleet.put(
                id,
                controller
        );
    }

    public UavController get(
            String id
    ) {

        UavController controller =
                fleet.get(id);

        if (controller == null) {

            throw new IllegalArgumentException(
                    "Unknown UAV: "
                    + id
            );
        }

        return controller;
    }

    public int size() {
        return fleet.size();
    }
}
